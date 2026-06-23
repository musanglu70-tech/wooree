import { EdiListContent } from "@/components/edi/edi-list-content";

export default function EdiListPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            저장 목록
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            저장된 EDI 처방 데이터를 조회하고 관리합니다.
          </p>
        </header>

        <EdiListContent />
      </div>
    </div>
  );
}
