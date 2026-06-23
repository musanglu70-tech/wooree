import type { Metadata } from "next";
import { AgentContent } from "@/components/settlement/agent-content";

export const metadata: Metadata = {
  title: "AI 정산 에이전트 | 우리메디텍",
  description: "AI 기반 정산 조건 관리 및 EDI·정산자료 자동 대조",
};

export default function SettlementAgentPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            AI 정산 에이전트
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            제약사별 수수료 조건을 등록하고, 처방월 EDI 데이터와 정산파일을
            자동 대조합니다.
          </p>
        </header>

        <AgentContent />
      </div>
    </div>
  );
}
