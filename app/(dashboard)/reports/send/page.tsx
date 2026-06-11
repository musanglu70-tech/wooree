import { SendContent } from "@/components/reports/send-content";

export default function ReportsSendPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            재위탁 신고 발송
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            재위탁 신고서를 이메일로 발송하고 내역을 관리합니다.
          </p>
        </header>

        <SendContent />
      </div>
    </div>
  );
}
