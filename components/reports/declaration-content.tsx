"use client";

import { Eye, FileOutput, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DeclarationStatus = "작성중" | "완료" | "제출됨";

interface Declaration {
  id: string;
  title: string;
  company: string;
  pharma: string;
  period: string;
  status: DeclarationStatus;
  createdAt: string;
}

const MOCK_DECLARATIONS: Declaration[] = [
  {
    id: "1",
    title: "2026년 5월 재위탁 신고서",
    company: "우리메디텍",
    pharma: "위더스제약",
    period: "2026-05",
    status: "제출됨",
    createdAt: "2026-06-05",
  },
  {
    id: "2",
    title: "2026년 5월 재위탁 신고서",
    company: "우리메디텍",
    pharma: "(주)테라벤이븐스",
    period: "2026-05",
    status: "완료",
    createdAt: "2026-06-04",
  },
  {
    id: "3",
    title: "2026년 4월 재위탁 신고서",
    company: "우리메디텍",
    pharma: "대웅바이오(주)",
    period: "2026-04",
    status: "작성중",
    createdAt: "2026-05-28",
  },
  {
    id: "4",
    title: "2026년 4월 재위탁 신고서",
    company: "우리메디텍",
    pharma: "경동제약(주)",
    period: "2026-04",
    status: "제출됨",
    createdAt: "2026-05-25",
  },
  {
    id: "5",
    title: "2026년 3월 재위탁 신고서",
    company: "우리메디텍",
    pharma: "한화제약(주)",
    period: "2026-03",
    status: "완료",
    createdAt: "2026-04-20",
  },
];

function formatPeriod(period: string) {
  const [year, mon] = period.split("-");
  return `${year}년 ${mon}월`;
}

function StatusBadge({ status }: { status: DeclarationStatus }) {
  const styles: Record<DeclarationStatus, string> = {
    작성중: "bg-amber-50 text-amber-700",
    완료: "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]",
    제출됨: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

export function DeclarationContent() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => toast.info("신고서 생성 기능은 준비 중입니다.")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
        >
          <Plus className="size-4" />
          신고서 생성
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">
                  신고서명
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">업체</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  신고 기간
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  생성일
                </th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DECLARATIONS.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-slate-100 last:border-b-0",
                    index % 2 === 1 && "bg-slate-50/40",
                  )}
                >
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                      <FileOutput className="size-4 text-slate-400" />
                      {item.title}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{item.company}</td>
                  <td className="px-5 py-3.5 text-slate-700">{item.pharma}</td>
                  <td className="px-5 py-3.5 text-slate-700">
                    {formatPeriod(item.period)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {item.createdAt}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toast.info(`보기: ${item.title}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                    >
                      <Eye className="size-3.5" />
                      보기
                    </button>
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
