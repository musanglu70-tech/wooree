import { MonthlyPrescriptionsTable } from "@/components/dashboard/monthly-prescriptions-table";
import { PharmaStatsTable } from "@/components/dashboard/pharma-stats-table";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { UnfiledHospitalsCard } from "@/components/dashboard/unfiled-hospitals-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { GmailImportButton } from "@/components/dashboard/gmail-import-button";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f5f0eb] px-4 py-6 md:bg-[#f8fafc] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              대시보드
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              CSO(주)우리메디텍 EDI 관리 현황을 한눈에 확인하세요.
            </p>
          </div>
          <GmailImportButton />
        </header>

        <StatsCards />

        <DashboardCharts />

        <UnfiledHospitalsCard />

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              제약사별 현황
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              이번 달 EDI 건수·금액 및 미정산 건수
            </p>
          </div>

          <PharmaStatsTable />
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              월별 처방 현황
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              최근 처방 데이터 10건 기준
            </p>
          </div>

          <MonthlyPrescriptionsTable />
        </section>
      </div>
    </div>
  );
}
