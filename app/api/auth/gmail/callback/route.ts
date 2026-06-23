import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`<html><body><h2>❌ 오류: ${error}</h2></body></html>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!code) {
    return new NextResponse(`<html><body><h2>❌ code 파라미터 없음</h2></body></html>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: "https://wooree.vercel.app/api/auth/gmail/callback",
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return new NextResponse(
        `<html><body><h2>❌ 토큰 오류: ${tokens.error}</h2><pre>${tokens.error_description}</pre></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Gmail 인증 완료</title></head>
<body style="font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto">
  <h2>✅ Gmail 인증 완료!</h2>
  <p>아래 <strong>GMAIL_REFRESH_TOKEN</strong> 값을 복사해서 Vercel 환경변수에 추가하세요.</p>

  <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:20px;margin:20px 0">
    <p><strong>GMAIL_REFRESH_TOKEN:</strong></p>
    <textarea style="width:100%;height:80px;font-size:12px;font-family:monospace" readonly onclick="this.select()">${tokens.refresh_token}</textarea>
  </div>

  <h3>📋 Vercel 설정 방법</h3>
  <ol>
    <li>vercel.com → wooree 프로젝트 → Settings → Environment Variables</li>
    <li>Add: <code>GMAIL_REFRESH_TOKEN</code> = 위 값</li>
    <li>Redeploy</li>
  </ol>

  <p style="color:#64748b;font-size:13px">Access Token (참고용): ${tokens.access_token?.substring(0, 20)}...</p>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new NextResponse(
      `<html><body><h2>❌ 서버 오류</h2><pre>${err}</pre></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
