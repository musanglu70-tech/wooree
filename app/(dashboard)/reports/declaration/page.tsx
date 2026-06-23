import { DeclarationContent } from "@/components/reports/declaration-content";

export default function ReportsDeclarationPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            재위탁 신고서
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            재위탁 신고서를 생성하고 관리합니다.
          </p>
        </header>

        <DeclarationContent />
      </div>
    </div>
  );
}
