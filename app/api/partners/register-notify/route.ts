import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { makeApprovalToken } from "@/lib/partner/approval-token";

export const runtime = "nodejs";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const ADMIN_EMAIL =
  process.env.ADMIN_APPROVAL_EMAIL ?? "musanglu70@gmail.com";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://wooree.vercel.app";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** POST /api/partners/register-notify — 가입 직후 관리자에게 승인 메일 발송 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { companyId } = (await request.json()) as { companyId?: string };
    if (!companyId) {
      return NextResponse.json(
        { error: "companyId 필요" },
        { status: 400 },
      );
    }

    // 파트너 본인 행 조회 (RLS: companies_partner_select)
    const { data: company } = await supabase
      .from("companies")
      .select(
        "id, name, business_number, representative, contact_phone, contact_email, bank_name, account_number, address",
      )
      .eq("id", companyId)
      .maybeSingle();

    if (!company) {
      return NextResponse.json(
        { error: "업체 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const c = company as Record<string, unknown>;

    if (!process.env.RESEND_API_KEY) {
      // 메일 미설정이어도 가입 자체는 성공 처리
      return NextResponse.json({ success: true, emailSent: false });
    }

    const approveUrl = `${SITE_URL}/api/partners/email-action?id=${companyId}&action=approve&token=${makeApprovalToken(companyId, "approve")}`;
    const rejectUrl = `${SITE_URL}/api/partners/email-action?id=${companyId}&action=reject&token=${makeApprovalToken(companyId, "reject")}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `우리메디텍 <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: `[파트너 가입 승인 요청] ${esc(c.name)}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2>새 파트너 가입 신청</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#64748b;width:120px">업체명</td><td><b>${esc(c.name)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">사업자번호</td><td>${esc(c.business_number)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">대표자</td><td>${esc(c.representative)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">담당자 연락처</td><td>${esc(c.contact_phone)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">이메일</td><td>${esc(c.contact_email)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">정산 계좌</td><td>${esc(c.bank_name)} ${esc(c.account_number)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">주소</td><td>${esc(c.address)}</td></tr>
          </table>
          <div style="margin-top:24px">
            <a href="${approveUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">✓ 승인</a>
            <a href="${rejectUrl}" style="display:inline-block;margin-left:10px;background:#fff;color:#dc2626;border:1px solid #fecaca;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">✕ 반려</a>
          </div>
          <p style="margin-top:16px;color:#94a3b8;font-size:12px">버튼을 누르면 별도 로그인 없이 처리됩니다.</p>
        </div>`,
    });

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error) {
    console.error("[register-notify] error:", error);
    // 알림 실패가 가입을 막지 않도록 200 유지
    return NextResponse.json({ success: true, emailSent: false });
  }
}
