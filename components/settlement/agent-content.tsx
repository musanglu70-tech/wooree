"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AgentCondition {
  id: string;
  company: string;
  pharma: string;
  rate: string;
  condition: string;
  isActive: boolean;
}

const MOCK_CONDITIONS: AgentCondition[] = [
  {
    id: "1",
    company: "우리메디텍",
    pharma: "위더스제약",
    rate: "12%",
    condition: "원내+원외 합산",
    isActive: true,
  },
  {
    id: "2",
    company: "우리메디텍",
    pharma: "(주)테라벤이븐스",
    rate: "10%",
    condition: "원외만",
    isActive: true,
  },
  {
    id: "3",
    company: "우리메디텍",
    pharma: "대웅바이오(주)",
    rate: "8.5%",
    condition: "원내+원외 합산",
    isActive: false,
  },
  {
    id: "4",
    company: "우리메디텍",
    pharma: "경동제약(주)",
    rate: "11%",
    condition: "처방금액 기준",
    isActive: true,
  },
  {
    id: "5",
    company: "우리메디텍",
    pharma: "한화제약(주)",
    rate: "9%",
    condition: "원내+원외 합산",
    isActive: true,
  },
];

export function AgentContent() {
  const [conditions] = useState(MOCK_CONDITIONS);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            에이전트 조건 관리
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            업체×제약사 수수료 조건으로 파일을 등록하세요
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info("조건 추가 기능은 준비 중입니다.")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
        >
          <Plus className="size-4" />
          조건 추가
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">업체명</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  수수료율
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">조건</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  활성상태
                </th>
              </tr>
            </thead>
            <tbody>
              {conditions.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-slate-100 last:border-b-0",
                    index % 2 === 1 && "bg-slate-50/40",
                  )}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {row.company}
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{row.pharma}</td>
                  <td className="px-5 py-3.5 font-medium text-[#4f6ef7]">
                    {row.rate}
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{row.condition}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        row.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {row.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
