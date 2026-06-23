import type { Metadata } from "next";
import { AgentContent } from "@/components/settlement/agent-content";

export const metadata: Metadata = {
  title: "AI 정산 에이전트 | 우리메디텍",
  description: "AI 기반 정산 조건 관리 및 EDI·정산자료 자동 대조",
};

export default function SettlementAgentPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            AI 정산 에