import { NextResponse } from "next/server";
import { GET as runEmailImport } from "@/app/api/email-import/route";

export const maxDuration = 60;

/**
 * GET /api/cron/email-import
 * Vercel Cron 전용. Authorization: Bearer ${CRON_SECRET} 검증 후
 * 기존 Gmail 수집 로직을 실행한다.
 *
 * ⚠️ 현재 email-import는 파싱·미리보기까지만 수행(자동 저장 미포함).
 *    완전 자동화(자동 prescriptions 저장)는 별도 확장 필요.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runEmailImport();
  return result;
}
