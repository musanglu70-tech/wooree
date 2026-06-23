"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { PharmaDashboardStat } from "@/types/dashboard";

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRow(row: Record<string, unknown>): PharmaDashboardStat {
  return {
    pharmaCompanyId: toStr(row.pharma_company_id),
    pharmaName: toStr(row.pharma_name),
    monthlyCount: toNumber(row.monthly_count),
    monthlyAmount: toNumber(row.monthly_amount),
    unsettledCount: toNumber(row.unsettled_count),
  };
}

async function loadPharmaStatsFallback(
  supabase: ReturnType<typeof createClient>,
): Promise<PharmaDashboardStat[]> {
  const month = new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;

  const { data: companies } = await supabase
    .from("pharma_companies")
    .select("id, name")
    .order("name");

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("id, pharma_company_id, prescription_date, settlement_date, status, prescription_items(amount)");

  const map = new Map<string, PharmaDashboardStat>();

  for (const company of companies ?? []) {
    map.set(company.id, {
      pharmaCompanyId: company.id,
      pharmaName: company.name,
      monthlyCount: 0,
      monthlyAmount: 0,
      unsettledCount: 0,
    });
  }

  for (const row of (prescriptions as Record<string, unknown>[]) ?? []) {
    const pharmaId = toStr(row.pharma_company_id);
    const stat = map.get(pharmaId);
    if (!stat) continue;

    const date = toStr(row.prescription_date);
    const items = row.prescription_items as { amount?: number }[] | null;
    const amount = (items ?? []).reduce(
      (sum, item) => sum + toNumber(item.amount),
      0,
    );

    if (date >= start && date < end) {
      stat.monthlyCount += 1;
      stat.monthlyAmount += amount;
    }

    if (!row.settlement_date || row.status === "saved") {
      stat.unsettledCount += 1;
    }
  }

  return Array.from(map.values())
    .filter(
      (row) =>
        row.monthlyCount > 0 || row.monthlyAmount > 0 || row.unsettledCount > 0,
    )
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

export function PharmaStatsTable() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<PharmaDashboardStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("v_dashboard_pharma_stats")
        .select("*")
        .order("monthly_amount", { ascending: false });

      if (!active) return;

      if (!error && data) {
        const normalized = ((data as Record<string, unknown>[]) ?? [])
          .map(normalizeRow)
          .filter(
            (row) =>
              row.monthlyCount > 0 ||
              row.monthlyAmount > 0 ||
              row.unsettledCount > 0,
          );
        setRows(normalized);
        setIsLoading(false);
        return;
      }

      if (error) {
        console.warn("[dashboard] v_dashboard_pharma_stats fallback:", error.message);
      }

      try {
        const fallback = await loadPharmaStatsFallback(supabase);
        setRows(fallback);
      } catch {
        toast.error("제약사별 현황을 불러오지 못했습니다.");
        setRows([]);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="px-6 py-12 text-center text-sm text-[#9a7c4e]">
        불러오는 중...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-[#9a7c4e]">
        이번 달 제약사별 처방 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]/80">
            <th className="px-6 py-3 font-medium text-[#7a5c2e]">제약사</th>
            <th className="px-6 py-3 text-right font-medium text-[#7a5c2e]">
              이번달 건수
            </th>
            <th className="px-6 py-3 text-right font-medium text-[#7a5c2e]">
              이번달 금액
            </th>
            <th className="px-6 py-3 text-right font-medium text-[#7a5c2e]">
              미정산
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.pharmaCompanyId}
              className={cn(
                "border-b border-[#f0e4d0] last:border-b-0",
                index % 2 === 1 && "bg-[#f5ede0]/40",
              )}
            >
              <td className="px-6 py-3.5 font-medium text-[#2c1f0e]">
                {row.pharmaName}
              </td>
              <td className="px-6 py-3.5 text-right tabular-nums text-[#5a3e1b]">
                {row.monthlyCount.toLocaleString("ko-KR")}건
              </td>
              <td className="px-6 py-3.5 text-right font-medium tabular-nums text-[#4f6ef7]">
                {formatWon(row.monthlyAmount)}
              </td>
              <td className="px-6 py-3.5 text-right tabular-nums text-amber-700">
                {row.unsettledCount.toLocaleString("ko-KR")}건
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
