import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "user" | "viewer" | "staff";

export interface AuthProfile {
  role: AppRole;
  tenant_id: string | null;
}

/** 서버에서 신뢰 가능한 권한 조회 (profiles 기준, user_metadata 사용 안 함) */
export async function getAuthorization() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null as AuthProfile | null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: (profile as AuthProfile | null) ?? null,
    supabase,
  };
}

/** 관리자 여부를 서버에서 확정 */
export async function isAdminServer(): Promise<boolean> {
  const { user, profile } = await getAuthorization();
  return !!user && profile?.role === "admin";
}
