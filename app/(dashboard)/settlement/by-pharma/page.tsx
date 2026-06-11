import { ByPharmaContent } from "@/components/settlement/by-pharma-content";

export default function SettlementByPharmaPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            제약사별 정산자료
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            제약사별 정산 파일을 수신·검토·보관합니다.
          </p>
        </header>

        <ByPharmaContent />
      </div>
    </div>
  );
}
