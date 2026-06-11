"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { PHARMAS, formatWon } from "@/lib/edi/constants";
import { cn } from "@/lib/utils";

type InspectStatus = "미검수" | "검수완료";
type StatusFilter = "전체" | InspectStatus;

interface InspectItem {
  id: string;
  month: string;
  pharma: string;
  hospital: string;
  amount: number;
  status: InspectStatus;
  inspectedAt: string | null;
}

const MOCK_ITEMS: InspectItem[] = [
  {
    id: "1",
    month: "2026-06",
    pharma: "위더스제약",
    hospital: "현마음의원",
    amount: 1_285_024,
    status: "미검수",
    inspectedAt: null,
  },
  {
    id: "2",
    month: "2026-06",
    pharma: "(주)테라벤이븐스",
    hospital: "상진형내과의원",
    amount: 2_928_380,
    status: "검수완료",
    inspectedAt: "2026-06-08",
  },
  {
    id: "3",
    month: "2026-06",
    pharma: "대웅바이오(주)",
    hospital: "제이산부인과의원(대전)",
    amount: 824_938,
    status: "미검수",
    inspectedAt: null,
  },
  {
    id: "4",
    month: "2026-05",
    pharma: "경동제약(주)",
    hospital: "강승모내과의원(충주)",
    amount: 1_134_336,
    status: "검수완료",
    inspectedAt: "2026-05-30",
  },
  {
    id: "5",
    month: "2026-05",
    pharma: "위더스제약",
    hospital: "둘앗은비뇨기과의원(충주)",
    amount: 5_430_052,
    status: "미검수",
    inspectedAt: null,
  },
  {
    id: "6",
    month: "2026-05",
    pharma: "한화제약(주)",
    hospital: "365베스트치과의원",
    amount: 1_955_028,
    status: "검수완료",
    inspectedAt: "2026-05-27",
  },
  {
    id: "7",
    month: "2026-04",
    pharma: "동광제약(주)",
    hospital: "365시온감동치과의원",
    amount: 1_563_660,
    status: "검수완료",
    inspectedAt: "2026-04-29",
  },
  {
    id: "8",
    month: "2026-04",
    pharma: "대화제약(주)",
    hospital: "서울대학교병원",
    amount: 48_520_000,
    status: "미검수",
    inspectedAt: null,
  },
];

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}년 ${mon}월`;
}

function StatusBadge({ status }: { status: InspectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "미검수"
          ? "bg-amber-50 text-amber-700"
          : "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]",
      )}
    >
      {status}
    </span>
  );
}

export function EdiInspectContent() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPharma, setFilterPharma] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("전체");
  const [applied, setApplied] = useState({
    month: "",
    pharma: "",
    status: "전체" as StatusFilter,
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (applied.month && item.month !== applied.month) return false;
      if (applied.pharma && item.pharma !== applied.pharma) return false;
      if (applied.status !== "전체" && item.status !== applied.status) {
        return false;
      }
      return true;
    });
  }, [items, applied]);

  const handleSearch = () => {
    setApplied({
      month: filterMonth,
      pharma: filterPharma,
      status: filterStatus,
    });
  };

  const handleInspect = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "검수완료" as const,
              inspectedAt: new Date().toISOString().slice(0, 10),
            }
          : item,
      ),
    );
    toast.success("검수가 완료되었습니다.");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              처방월
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              제약사
            </label>
            <select
              value={filterPharma}
              onChange={(e) => setFilterPharma(e.target.value)}
              className={inputClassName}
            >
              <option value="">전체</option>
              {PHARMAS.map((pharma) => (
                <option key={pharma} value={pharma}>
                  {pharma}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              상태
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as StatusFilter)
              }
              className={inputClassName}
            >
              <option value="전체">전체</option>
              <option value="미검수">미검수</option>
              <option value="검수완료">검수완료</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
            >
              <Search className="size-4" />
              조회
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">처방월</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">병의원</th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  처방금액
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  검수상태
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">검수일</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  검수
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                    <td className="px-5 py-3.5 text-slate-700">
                      {formatMonthLabel(item.month)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {item.pharma}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {item.hospital}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      {formatWon(item.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {item.inspectedAt ?? "-"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        disabled={item.status === "검수완료"}
                        onClick={() => handleInspect(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#4f6ef7] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        <ClipboardCheck className="size-3.5" />
                        검수
                      </button>
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
