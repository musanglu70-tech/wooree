import { DashboardSidebar } from "@/components/common/dashboard-sidebar";
import { MobileNav } from "@/components/common/mobile-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
