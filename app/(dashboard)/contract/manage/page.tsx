import { ManageContent } from "@/components/contract/manage-content";

export default function ContractManagePage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            계약서 관리
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            진행 중인 계약서를 조회하고 발송·관리합니다.
          </p>
        </header>

        <ManageContent />
      </div>
    </div>
  );
}
