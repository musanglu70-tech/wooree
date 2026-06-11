"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { PHARMAS, formatWon } from "@/lib/edi/constants";
import { cn } from "@/lib/utils";

interface CompareRow {
  id: string;
  month: string;
  pharma: string;
  company: string;
  client: string;
  prescriptionAmount: number;
  settlementAmount: number;
}

const MOCK_ROWS: CompareRow[] = [
  {
    id: "1",
    month: "2026-05",
    pharma: "위더스제약",
    company: "우리메디텍",
    client: "현마음의원",
    prescriptionAmount: 1_285_024,
    settlementAmount: 1_280_000,
  },
  {
    id: "2",
    month: "2026-05",
    pharma: "위더스제약",
    company: "우리메디텍",
    client: "포커스앤여성의원",
    prescriptionAmount: 1_067_145,
    settlementAmount: 1_067_145,
  },
  {
    id: "3",
    month: "2026-05",
    pharma: "(주)테라벤이븐스",
    company: "우리메디텍",
    client: "상진형내과의원",
    prescriptionAmount: 2_928_380,
    settlementAmount: 2_900_000,
  },
  {
    id: "4",
    month: "2026-04",
    pharma: "대웅바이오(주)",
    company: "우리메디텍",
    client: "제이산부인과의원(대전)",
    prescriptionAmount: 824_938,
    settlementAmount: 824_938,
  },
  {
    id: "5",
    month: "2026-04",
    pharma: "경동제약(주)",
    company: "우리메디텍",
    client: "강승모내과의원(충주)",
    prescriptionAmount: 1_134_336,
    settlementAmount: 1_100_000,
  },
  {
    id: "6",
    month: "2026-04",
    pharma: "한화제약(주)",
    company: "우리메디텍",
    client: "365베스트치과의원",
    prescriptionAmount: 1_955_028,
    settlementAmount: 1_955_028,
  },
];

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}년 ${mon}월`;
}

function DiffCell({
  prescription,
  settlement,
}: {
  prescription: number;
  settlement: number;
}) {
  const diff = prescription - settlement;
  if (diff === 0) {
    return <span className="text-emerald-600">일치</span>;
  }
  return (
    <span className={diff > 0 ? "text-red-600" : "text-blue-600"}>
      {diff > 0 ? "+" : ""}
      {formatWon(diff)}
    </span>
  );
}

export function CompareContent() {
  const [filterMonth, setFilterMonth] = useState("2026-05");
  const [filterPharma, setFilterPharma] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [subtotalByClient, setSubtotalByClient] = useState(false);
  const [applied, setApplied] = useState({
    month: "2026-05",
    pharma: "",
    company: "",
  });

  const filteredRows = useMemo(() => {
    return MOCK_ROWS.filter((row) => {
      if (applied.month && row.month !== applied.month) return false;
      if (applied.pharma && row.pharma !== applied.pharma) return false;
      if (applied.company && !row.company.includes(applied.company)) {
        return false;
      }
      return true;
    });
  }, [applied]);

  const displayRows = useMemo(() => {
    if (!subtotalByClient) return filteredRows;

    const grouped = new Map<string, CompareRow>();
    for (const row of filteredRows) {
      const key = `${row.client}-${row.pharma}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.prescriptionAmount += row.prescriptionAmount;
        existing.settlementAmount += row.settlementAmount;
      } else {
        grouped.set(key, { ...row });
      }
    }
    return Array.from(grouped.values());
  }, [filteredRows, subtotalByClient]);

  const handleSearch = () => {
    setApplied({
      month: filterMonth,
      pharma: filterPharma,
      company: filterCompany.trim(),
    });
  };

  const handleReset = () => {
    setFilterMonth("2026-05");
    setFilterPharma("");
    setFilterCompany("");
    setSubtotalByClient(false);
    setApplied({ month: "2026-05", pharma: "", company: "" });
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
              업체
            </label>
            <input
              type="text"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              placeholder="업체명 검색"
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
              >
                <Search className="size-4" />
                검색
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
              >
                <RotateCcw className="size-4" />
                초기화
              </button>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={subtotalByClient}
                onChange={(e) => setSubtotalByClient(e.target.checked)}
                className="size-4 rounded border-slate-300 accent-[#4f6ef7]"
              />
              거래처별 소계
            </label>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">처방월</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">업체</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  거래처
                </th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  처방금액
                </th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  정산금액
                </th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  차이
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    조회 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3.5 text-slate-700">
                      {formatMonthLabel(row.month)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {row.pharma}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {row.company}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {row.client}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      {formatWon(row.prescriptionAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      {formatWon(row.settlementAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">
                      <DiffCell
                        prescription={row.prescriptionAmount}
                        settlement={row.settlementAmount}
                      />
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
