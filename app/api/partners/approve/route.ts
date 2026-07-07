import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const PORTAL_URL =
  process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://wooree.vercel.app/portal/login";

interface Body {
  companyId?: string;
  action?: "approve" | "reject";
  reason?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 직원(파트너 아님)만 승인 가능
    const role = (user?.user_metadata as { role?: string } | undefined)?.role;
    if (!user || role === "partner") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = (await request.json()) as Body;
    const companyId = body.companyId?.trim();
    const action = body.action;

    if (!companyId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "companyId와 action이 필요합니다." },
        { status: 400 },
      );
    }

    const status = action === "approve" ? "approved" : "rejected";

    const { data: updated, error } = await supabase
      .from("companies")
      .update({
        status,
        approved_at: action === "approve" ? new Date().toISOString() : null,
        rejected_reason: action === "reject" ? body.reason ?? null : null,
      })
      .eq("id", companyId)
      .select("name, contact_email, email")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 승인 메일 (Resend) — 실패해도 승인 자체는 성공 처리
    const row = updated as
      | { name?: string; contact_email?: string; email?: string }
      | null;
    const to = row?.contact_email || row?.email;
    let emailSent = false;

    if (process.env.RESEND_API_KEY && to) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const approved = action === "approve";
        await resend.emails.send({
          from: `우리메디텍 <${FROM_EMAIL}>`,
          to: [to],
          subject: approved
            ? "[CSO 정산서 포털] 회원가입이 승인되었습니다"
            : "[CSO 정산서 포털] 회원가입 심사 결과 안내",
          html: approved
            ? `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                 <h2>회원가입이 승인되었습니다 🎉</h2>
                 <p>${row?.name ?? ""} 님, CSO 정산서 포털 가입이 승인되었습니다.</p>
                 <p>아래 버튼을 눌러 로그인 후 정산 내역을 확인하세요.</p>
                 <p><a href="${PORTAL_URL}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">포털 로그인</a></p>
               </div>`
            : `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                 <h2>회원가입 심사 결과 안내</h2>
                 <p>${row?.name ?? ""} 님의 가입 신청이 반려되었습니다.</p>
                 ${body.reason ? `<p>사유: ${body.reason}</p>` : ""}
                 <p>자세한 사항은 관리자에게 문의해주세요.</p>
               </div>`,
        });
        emailSent = true;
      } catch (e) {
        console.error("[partners/approve] email error:", e);
      }
    }

    return NextResponse.json({ success: true, status, emailSent });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
