import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트 (RLS 우회) — 서버 전용.
 * 절대 클라이언트 번들에 import 하지 말 것.
 * SUPABASE_SERVICE_ROLE_KEY 환경변수 필요.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 미설정");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
