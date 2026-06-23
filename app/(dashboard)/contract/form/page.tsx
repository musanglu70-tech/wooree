import { FormContent } from "@/components/contract/form-content";

export default function ContractFormPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            계약서 양식
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            계약서 템플릿을 관리하고 새 양식을 만듭니다.
          </p>
        </header>

        <FormContent />
      </div>
    </div>
  );
}
