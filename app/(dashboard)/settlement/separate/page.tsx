import { FileX2 } from "lucide-react";

export default function SettlementSeparatePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            정산자료 분리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            승인된 정산 결과를 제약사별로 분리합니다.
          </p>
        </header>

        <section className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-slate-100">
            <FileX2 className="size-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">
            승인된 정산 결과가 없습니다
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-slate-500">
            제약사별 정산자료에서 검토 및 승인이 완료된 후 이 화면에서 분리
            작업을 진행할 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
