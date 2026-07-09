import { DashboardSidebar } from "@/components/common/dashboard-sidebar";
import { MobileNav } from "@/components/common/mobile-nav";
import { PortalStatusScreen } from "@/components/portal/portal-status-screen";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 승인 게이트: 사업자(테넌트)가 아직 승인 전이면 대기 화면
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: company } = await supabase
      .from("companies")
      .select("name, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // 본인 소유 회사(사업자 계정)가 있는데 승인 전/반려면 차단
    const row = company as { name?: string; status?: string } | null;
    if (row && row.status !== "approved") {
      return (
        <PortalStatusScreen
          status={row.status ?? "pending"}
          companyName={row.name ?? ""}
        />
      );
    }
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
