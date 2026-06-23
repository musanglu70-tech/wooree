import { StorageContent } from "@/components/contract/storage-content";

export default function ContractStoragePage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            계약서 보관
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            서명 완료된 계약서를 보관·조회합니다.
          </p>
        </header>

        <StorageContent />
      </div>
    </div>
  );
}
