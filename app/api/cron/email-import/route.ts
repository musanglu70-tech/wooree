import { NextResponse } from "next/server";
import { runGmailAutoImport } from "@/lib/gmail/import-runner";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/email-import — Vercel Cron 전용 (Authorization: Bearer CRON_SECRET).
 * Gmail 미읽음 첨부 → OCR → prescriptions 자동 저장.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (
    !process.env.GMAIL_CLIENT_ID ||
    !process.env.GMAIL_CLIENT_SECRET ||
    !process.env.GMAIL_REFRESH_TOKEN
  ) {
    return NextResponse.json({ error: "Gmail 환경변수 미설정" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY 미설정" },
      { status: 500 },
    );
  }

  try {
    const summary = await runGmailAutoImport();
    return NextResponse.json({
      message: `자동수집 완료 — 저장 ${summary.saved} · 건너뜀 ${summary.skipped} · 오류 ${summary.errors}`,
      ...summary,
    });
  } catch (error) {
    console.error("[cron/email-import] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "자동수집 실패" },
      { status: 500 },
    );
  }
}
