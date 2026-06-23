import { CompareContent } from "@/components/settlement/compare-content";

export default function SettlementComparePage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            처방 vs 정산
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            처방 데이터와 정산 데이터를 대조합니다.
          </p>
        </header>

        <CompareContent />
      </div>
    </div>
  );
}
