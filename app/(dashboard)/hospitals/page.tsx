import { HospitalsContent } from "@/components/hospitals/hospitals-content";

export default function HospitalsPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            병의원 관리
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            거래 병의원 정보를 등록하고 관리합니다.
          </p>
        </header>

        <HospitalsContent />
      </div>
    </div>
  );
}
