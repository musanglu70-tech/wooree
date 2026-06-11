import { EdiNewForm } from "@/components/edi/edi-new-form";

export default function EdiNewPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            신규 입력
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            EDI 처방 데이터를 수기 입력하거나 엑셀·OCR로 등록합니다.
          </p>
        </header>

        <EdiNewForm />
      </div>
    </div>
  );
}
