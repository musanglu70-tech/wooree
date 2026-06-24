import { ProgressContent } from "@/components/automation/progress-content";

export default function AutomationProgressPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            진행 현황
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            AI 재위탁 자동화 진행 상태를 확인합니다.
          </p>
        </header>

        <ProgressContent />
      </div>
    </div>
  );
}
