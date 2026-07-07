import { PartnersContent } from "@/components/partners/partners-content";

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            파트너 승인
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            CSO 정산서 포털 회원가입 신청을 검토하고 승인/반려합니다.
          </p>
        </header>
        <PartnersContent />
      </div>
    </div>
  );
}
