import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runGmailAutoImport } from "@/lib/gmail/import-runner";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/run-import — 관리자가 Gmail 자동수집을 즉시 실행(테스트용).
 * 로그인한 관리자(profiles.role='admin')만 허용.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "관리자만 실행 가능" }, { status: 403 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "실행 실패" },
      { status: 500 },
    );
  }
}
