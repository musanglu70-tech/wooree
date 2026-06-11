import { AgentContent } from "@/components/settlement/agent-content";

export default function SettlementAgentPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            AI 정산 에이전트
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            AI 기반 정산 조건을 관리하고 자동 대조합니다.
          </p>
        </header>

        <AgentContent />
      </div>
    </div>
  );
}
