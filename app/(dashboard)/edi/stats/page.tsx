import { EdiStatsContent } from "@/components/edi/edi-stats-content";

export default function EdiStatsPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            처방 통계
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            제약사·거래처·품목별 처방 현황을 분석합니다.
          </p>
        </header>

        <EdiStatsContent />
      </div>
    </div>
  );
}
