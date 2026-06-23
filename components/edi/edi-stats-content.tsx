"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { downloadExcel, formatYyyyMm } from "@/lib/excel/export";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface MonthlySummary {
  totalCount: number;
  totalAmount: number;
  pharmaCount: number;
  hospitalCount: number;
}

interface PharmaStat {
  name: string;
  count: number;
  quantity: number;
  amount: number;
}

const EMPTY_SUMMARY: MonthlySummary = {
  totalCount: 0,
  totalAmount: 0,
  pharmaCount: 0,
  hospitalCount: 0,
};

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function rowAmount(row: Record<string, unknown>): number {
  return toNumber(row.total_amount ?? row.amount);
}

function rowQuantity(row: Record<string, unknown>): number {
  const items = row.prescription_items as Record<string, unknown>[] | null;
  if (!items?.length) return 0;
  return items.reduce(
    (sum, item) =>
      sum +
      toNumber(item.quantity_original) +
      toNumber(item.quantity_external),
    0,
  );
}

function monthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
  return { start, end };
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function EdiStatsContent() {
  const supabase = useMemo(() => createClient(), []);

  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [appliedMonth, setAppliedMonth] = useState(currentMonth);

  const [summary, setSummary] = useState<MonthlySummary>(EMPTY_SUMMARY);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  const [pharmaStats, setPharmaStats] = useState<PharmaStat[]>([]);
  const [isPharmaLoading, setIsPharmaLoading] = useState(true);

  // 기본 통계: 선택한 처방월 기준
  useEffect(() => {
    if (!appliedMonth) return;

    let active = true;
    setIsSummaryLoading(true);

    const { start, end } = monthRange(appliedMonth);

    supabase
      .from("prescriptions")
      .select("*")
      .gte("prescription_date", start)
      .lt("prescription_date", end)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("통계를 불러오지 못했습니다: " + error.message);
          setSummary(EMPTY_SUMMARY);
        } else {
          const rows = (data as Record<string, unknown>[]) ?? [];
          const pharmaSet = new Set<string>();
          const hospitalSet = new Set<string>();
          let totalAmount = 0;

          rows.forEach((row) => {
            totalAmount += rowAmount(row);
            const pharmaId = toStr(row.pharma_company_id);
            if (pharmaId) pharmaSet.add(pharmaId);
            const hospital = toStr(row.hospital_id ?? row.hospital_name);
            if (hospital) hospitalSet.add(hospital);
          });

          setSummary({
            totalCount: rows.length,
            totalAmount,
            pharmaCount: pharmaSet.size,
            hospitalCount: hospitalSet.size,
          });
        }
        setIsSummaryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase, appliedMonth]);

  // 제약사별 통계: 전체 기간 기준
  const loadPharmaStats = useCallback(() => {
    let active = true;
    setIsPharmaLoading(true);

    supabase
      .from("prescriptions")
      .select("*, pharma_companies(name), prescription_items(*)")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error(
            "제약사별 통계를 불러오지 못했습니다: " + error.message,
          );
          setPharmaStats([]);
        } else {
          const rows = (data as Record<string, unknown>[]) ?? [];
          const grouped = new Map<string, PharmaStat>();

          rows.forEach((row) => {
            const pharma = row.pharma_companies as { name?: string } | null;
            const name = toStr(pharma?.name) || "(미지정)";
            const stat = grouped.get(name) ?? {
              name,
              count: 0,
              quantity: 0,
              amount: 0,
            };
            stat.count += 1;
            stat.quantity += rowQuantity(row);
            stat.amount += rowAmount(row);
            grouped.set(name, stat);
          });

          setPharmaStats(
            Array.from(grouped.values()).sort((a, b) => b.amount - a.amount),
          );
        }
        setIsPharmaLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => loadPharmaStats(), [loadPharmaStats]);

  const handleSearch = () => {
    if (!filterMonth) {
      toast.error("처방월을 선택해주세요.");
      return;
    }
    setAppliedMonth(filterMonth);
  };

  const handleExport = () => {
    if (pharmaStats.length === 0 && summary.totalCount === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    downloadExcel(`처방통계_${formatYyyyMm(appliedMonth)}.xlsx`, [
      {
        name: "제약사별",
        rows: pharmaStats.map((row) => ({
          제약사명: row.name,
          처방건수: row.count,
          총수량: row.quantity,
          처방금액: row.amount,
        })),
      },
      {
        name: "전체요약",
        rows: [
          {
            총건수: summary.totalCount,
            총금액: summary.totalAmount,
            제약사수: summary.pharmaCount,
            거래처수: summary.hospitalCount,
          },
        ],
      },
    ]);

    toast.success("엑셀 파일을 다운로드했습니다.");
  };

  const summaryCards = [
    {
      label: "처방 건수",
      value: `${summary.totalCount.toLocaleString("ko-KR")}건`,
    },
    { label: "처방 금액", value: formatWon(summary.totalAmount) },
    {
      label: "제약사 수",
      value: `${summary.pharmaCount.toLocaleString("ko-KR")}개`,
    },
    {
      label: "거래처 수",
      value: `${summary.hospitalCount.toLocaleString("ko-KR")}개`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <section className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              처방월
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
            >
              <Search className="size-4" />
              조회
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-4 text-sm font-medium text-[#5a3e1b] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
            >
              <Download className="size-4" />
              엑셀
            </button>
          </div>
        </div>
      </section>

      {/* 기본 통계 카드 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-4 shadow-sm"
          >
            <p className="text-xs text-[#9a7c4e]">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-[#2c1f0e]">
              {isSummaryLoading ? "-" : card.value}
            </p>
          </div>
        ))}
      </section>

      {/* 제약사별 통계 */}
      <section className="overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
        <div className="border-b border-[#e8d9bc] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#2c1f0e]">제약사별</h2>
          <p className="mt-0.5 text-xs text-[#9a7c4e]">
            전체 기간 처방금액 기준 내림차순
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">제약사</th>
                <th className="px-5 py-3 text-right font-medium text-[#7a5c2e]">
                  처방 건수
                </th>
                <th className="px-5 py-3 text-right font-medium text-[#7a5c2e]">
                  총 수량
                </th>
                <th className="px-5 py-3 text-right font-medium text-[#7a5c2e]">
                  처방금액
                </th>
              </tr>
            </thead>
            <tbody>
              {isPharmaLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : pharmaStats.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                pharmaStats.map((row, i) => (
                  <tr
                    key={row.name}
                    className={cn(
                      "border-b border-[#f0e4d0] last:border-b-0",
                      i % 2 === 1 && "bg-[#f5ede0]/40",
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-[#2c1f0e]">
                      {row.name}
                    </td>
                    <td className="px-5 py-3 text-right text-[#5a3e1b]">
                      {row.count.toLocaleString("ko-KR")}건
                    </td>
                    <td className="px-5 py-3 text-right text-[#5a3e1b]">
                      {row.quantity.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-[#2c1f0e]">
                      {formatWon(row.amount)}
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
