import { StorageContent } from "@/components/contract/storage-content";

export default function ContractStoragePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            계약서 보관
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            서명 완료된 계약서를 보관·조회합니다.
          </p>
        </header>

        <StorageContent />
      </div>
    </div>
  );
}
