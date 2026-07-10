import { NextResponse } from "next/server";
import { isAdminServer } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  userId?: string;
  role?: "admin" | "user" | "viewer";
  tenantId?: string | null;
}

/** POST /api/admin/set-user — 관리자가 직원/사업자의 역할·소속 테넌트 변경 */
export async function POST(request: Request) {
  if (!(await isAdminServer())) {
    return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 403 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  const b = (await request.json()) as Body;
  if (!b.userId) {
    return NextResponse.json({ error: "userId 필요" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (b.role !== undefined) {
    if (!["admin", "user", "viewer"].includes(b.role)) {
      return NextResponse.json({ error: "잘못된 역할" }, { status: 400 });
    }
    patch.role = b.role;
  }
  if (b.tenantId !== undefined) {
    patch.tenant_id = b.tenantId || null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 값 없음" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", b.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
