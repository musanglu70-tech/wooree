import { MonthlyPrescriptionsTable } from "@/components/dashboard/monthly-prescriptions-table";
import { PharmaStatsTable } from "@/components/dashboard/pharma-stats-table";
import { StatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f5f0eb] px-4 py-6 md:bg-[#f5ece0] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            대시보드
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            CSO(주)우리메디텍 EDI 관리 현황을 한눈에 확인하세요.
          </p>
        </header>

        <StatsCards />

        <section className="mt-8 overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
          <div className="border-b border-[#e8d9bc] px-6 py-4">
            <h2 className="text-base font-semibold text-[#2c1f0e]">
              제약사별 현황
            </h2>
            <p className="mt-0.5 text-sm text-[#9a7c4e]">
              이번 달 EDI 건수·금액 및 미정산 건수
        