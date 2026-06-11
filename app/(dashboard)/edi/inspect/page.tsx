import { EdiInspectContent } from "@/components/edi/edi-inspect-content";

export default function EdiInspectPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            검수 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            EDI 처방 데이터의 검수 상태를 확인하고 처리합니다.
          </p>
        </header>

        <EdiInspectContent />
      </div>
    </div>
  );
}
