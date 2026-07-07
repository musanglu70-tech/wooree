import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PortalHeader } from "@/components/portal/portal-header";
import { PortalStatusScreen } from "@/components/portal/portal-status-screen";

export default async function PortalMainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: company } = await supabase
    .from("companies")
    .select("name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const row = company as { name?: string; status?: string } | null;
  const status = row?.status ?? "pending";
  const companyName = row?.name ?? "";

  if (!row || status !== "approved") {
    return <PortalStatusScreen status={status} companyName={companyName} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PortalHeader companyName={companyName} email={user.email ?? ""} />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
