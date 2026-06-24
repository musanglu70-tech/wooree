import { CompaniesContent } from "@/components/companies/companies-content";

export default function CompaniesPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            업체 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            CSO 업체 정보를 등록하고 관리합니다.
          </p>
        </header>

        <CompaniesContent />
      </div>
    </div>
  );
}
