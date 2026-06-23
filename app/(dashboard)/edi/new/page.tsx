import { EdiNewForm } from "@/components/edi/edi-new-form";

export default function EdiNewPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            신규 입력
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            처방전 OCR 자동입력, 엑셀 업로드 또는 수기 입력으로 등록합니다.
          </p>
        </header>

        <EdiNewForm />
      </div>
    </div>
  );
}
