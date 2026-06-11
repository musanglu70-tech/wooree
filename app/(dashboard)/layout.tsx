import { DashboardSidebar } from "@/components/common/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
