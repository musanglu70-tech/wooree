import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApprovalToken } from "@/lib/partner/approval-token";

export const runtime = "nodejs";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://wooree.vercel.app";

function htmlPage(title: string, message: string, color: string): Response {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width, initial-scale=1">
     <title>${title}</title></head>
     <body style="font-family:sans-serif;background:#f8fafc;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh">
       <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px;max-width:420px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.05)">
         <h1 style="color:${color};font-size:20px;margin:0 0 12px">${title}</h1>
         <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0">${message}</p>
         <a href="${SITE_URL}/partners" style="display:inline-block;margin-top:24px;color:#4f6ef7;font-size:14px;text-decoration:none">파트너 관리로 이동 →</a>
       </div>
     </body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/** GET /api/partners/email-action?id=&action=&token= — 이메일 승인 링크 처리 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const action = searchParams.get("action") ?? "";
  const token = searchParams.get("token") ?? "";

  if (
    !id ||
    (action !== "approve" && action !== "reject") ||
    !verifyApprovalToken(id, action, token)
  ) {
    return htmlPage(
      "유효하지 않은 링크",
      "승인 링크가 올바르지 않거나 만료되었습니다.",
      "#dc2626",
    );
  }

  try {
    const admin = createAdminClient();
    const status = action === "approve" ? "approved" : "rejected";

    const { data: updated, error } = await admin
      .from("companies")
      .update({
        status,
        approved_at: action === "approve" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select("name, contact_email, email, status")
      .maybeSingle();

    if (error || !updated) {
      return htmlPage(
        "처리 실패",
        "업체 정보를 업데이트하지 못했습니다. 관리자 화면에서 확인해주세요.",
        "#dc2626",
      );
    }

    const row = updated as {
      name?: string;
      contact_email?: string;
      email?: string;
    };
    const to = row.contact_email || row.email;

    // 파트너에게 결과 메일
    if (process.env.RESEND_API_KEY && to) {
      const approved = action === "approve";
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: `우리메디텍 <${FROM_EMAIL}>`,
          to: [to],
          subject: approved
            ? "[CSO 정산서 포털] 회원가입이 승인되었습니다"
            : "[CSO 정산서 포털] 회원가입 심사 결과 안내",
          html: approved
            ? `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                 <h2>회원가입이 승인되었습니다 🎉</h2>
                 <p>${row.name ?? ""} 님, CSO 정산서 포털 가입이 승인되었습니다.</p>
                 <p><a href="${SITE_URL}/portal/login" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">포털 로그인</a></p>
               </div>`
            : `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                 <h2>회원가입 심사 결과 안내</h2>
                 <p>${row.name ?? ""} 님의 가입 신청이 반려되었습니다. 자세한 사항은 관리자에게 문의해주세요.</p>
               </div>`,
        })
        .catch((e) => console.error("[email-action] partner mail error:", e));
    }

    return action === "approve"
      ? htmlPage(
          "승인 완료 ✓",
          `${row.name ?? "파트너"} 님의 가입을 승인했습니다. 파트너에게 안내 메일이 발송되었습니다.`,
          "#0f766e",
        )
      : htmlPage(
          "반려 처리됨",
          `${row.name ?? "파트너"} 님의 가입을 반려했습니다.`,
          "#dc2626",
        );
  } catch (error) {
    console.error("[email-action] error:", error);
    return htmlPage(
      "처리 오류",
      "처리 중 오류가 발생했습니다. SUPABASE_SERVICE_ROLE_KEY 설정을 확인해주세요.",
      "#dc2626",
    );
  }
}
