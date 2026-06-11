import { ManageContent } from "@/components/contract/manage-content";

export default function ContractManagePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            계약서 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            진행 중인 계약서를 조회하고 발송·관리합니다.
          </p>
        </header>

        <ManageContent />
      </div>
    </div>
  );
}
