import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 로그인 없이 접근 가능한 공개 경로 (Google Play 심사용 개인정보처리방침 등)
const PUBLIC_PATHS = ["/privacy", "/forgot-password", "/reset-password"];

// 파트너 포털 공개 경로 (비로그인 접근 허용)
const PORTAL_PUBLIC_PATHS = ["/portal/login", "/portal/register"];

function isPortalPath(pathname: string) {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // 정적 이미지 파일은 로그인 없이 접근 허용
  if (/\.(png|jpg|jpeg|svg|gif|ico|webp)$/.test(pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPortal = isPortalPath(pathname);
  const isPortalPublic = PORTAL_PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── 비로그인 처리 ──
  if (!user) {
    if (isPortalPublic) return supabaseResponse; // 파트너 로그인/가입 허용
    if (isPortal) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    if (!pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // ── 로그인됨: 역할 판별 (user_metadata.role) ──
  const role = (user.user_metadata as { role?: string } | undefined)?.role;
  const isPartner = role === "partner";

  if (isPartner) {
    // 파트너: /portal 영역만 허용
    if (isPortalPublic) {
      return NextResponse.redirect(new URL("/portal/home", request.url));
    }
    if (!isPortal) {
      return NextResponse.redirect(new URL("/portal/home", request.url));
    }
    return supabaseResponse;
  }

  // ── 직원(staff): /portal 접근 차단 ──
  if (isPortal) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
