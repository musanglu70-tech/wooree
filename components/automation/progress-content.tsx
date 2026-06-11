"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ProgressTab = "all" | "sent" | "contract" | "pending";

interface ProgressItem {
  id: string;
  company: string;
  pharma: string;
  status: "발송완료" | "계약진행" | "서류미제출";
  updatedAt: string;
  manager: string;
}

const MOCK_ITEMS: ProgressItem[] = [
  {
    id: "1",
    company: "우리메디텍",
    pharma: "위더스제약",
    status: "발송완료",
    updatedAt: "2026-06-08",
    manager: "김영수",
  },
  {
    id: "2",
    company: "우리메디텍",
    pharma: "(주)테라벤이븐스",
    status: "계약진행",
    updatedAt: "2026-06-07",
    manager: "이민정",
  },
  {
    id: "3",
    company: "우리메디텍",
    pharma: "대웅바이오(주)",
    status: "서류미제출",
    updatedAt: "2026-06-06",
    manager: "박지훈",
  },
  {
    id: "4",
    company: "우리메디텍",
    pharma: "경동제약(주)",
    status: "발송완료",
    updatedAt: "2026-06-05",
    manager: "김영수",
  },
  {
    id: "5",
    company: "우리메디텍",
    pharma: "한화제약(주)",
    status: "계약진행",
    updatedAt: "2026-06-04",
    manager: "최수연",
  },
  {
    id: "6",
    company: "우리메디텍",
    pharma: "동광제약(주)",
    status: "서류미제출",
    updatedAt: "2026-06-03",
    manager: "이민정",
  },
];

const TABS: { id: ProgressTab; label: string; status?: ProgressItem["status"] }[] =
  [
    { id: "all", label: "전체" },
    { id: "sent", label: "발송완료", status: "발송완료" },
    { id: "contract", label: "계약진행", status: "계약진행" },
    { id: "pending", label: "서류미제출", status: "서류미제출" },
  ];

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function StatusBadge({ status }: { status: ProgressItem["status"] }) {
  const styles: Record<ProgressItem["status"], string> = {
    발송완료: "bg-emerald-50 text-emerald-700",
    계약진행: "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]",
    서류미제출: "bg-amber-50 text-amber-700",
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

export function ProgressContent() {
  const [activeTab, setActiveTab] = useState<ProgressTab>("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const tabCounts = useMemo(() => {
    const counts = { all: MOCK_ITEMS.length, sent: 0, contract: 0, pending: 0 };
    for (const item of MOCK_ITEMS) {
      if (item.status === "발송완료") counts.sent++;
      if (item.status === "계약진행") counts.contract++;
      if (item.status === "서류미제출") counts.pending++;
    }
    return counts;
  }, []);

  const filteredItems = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    return MOCK_ITEMS.filter((item) => {
      if (tab?.status && item.status !== tab.status) return false;
      if (appliedSearch && !item.company.includes(appliedSearch)) return false;
      return true;
    });
  }, [activeTab, appliedSearch]);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              activeTab === tab.id
                ? "border-[#4f6ef7] bg-[rgba(79,110,247,0.06)] shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <p
              className={cn(
                "text-sm font-medium",
                activeTab === tab.id ? "text-[#4f6ef7]" : "text-slate-500",
              )}
            >
              {tab.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {tabCounts[tab.id]}건
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="업체명 검색"
            className={inputClassName}
            onKeyDown={(e) => {
              if (e.key === "Enter") setAppliedSearch(search.trim());
            }}
          />
          <button
            type="button"
            onClick={() => setAppliedSearch(search.trim())}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#4f6ef7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
          >
            <Search className="size-4" />
            검색
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">업체명</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  담당자
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  최종 업데이트
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    조회 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {item.company}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {item.pharma}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {item.manager}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {item.updatedAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
