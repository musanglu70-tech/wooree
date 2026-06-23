"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface MonthlyPrescriptionRow {
  id: string;
  month: string;
  pharma: string;
  company: string;
  hospital: string;
  amount: number;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  saved: "저장",
  confirmed: "확정",
  저장: "저장",
  확정: "확정",
};

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toMonth(value: unknown): string {
  const str = toStr(value);
  return str.length >= 7 ? str.slice(0, 7) : str;
}

function formatMonthLabel(month: string) {
  if (!month) return "-";
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function normalizeRow(row: Record<string, unknown>): MonthlyPrescriptionRow {
  return {
    id: toStr(row.id ?? row.prescription_id ?? crypto.randomUUID()),
    month: toMonth(
      row.prescription_month ?? row.month ?? row.prescription_date,
    ),
    pharma: toStr(
      row.pharma_company_name ?? row.pharma_name ?? row.pharma ?? row.company_name,
    ),
    company: toStr(row.company_name ?? row.company),
    hospital: toStr(row.hospital_name ?? row.hospital ?? row.client),
    amount: toNumber(
      row.total_amount ?? row.amount ?? row.prescription_amount ?? row.sum_amount,
    ),
    status: toStr(row.status),
  };
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status ?? "-";
  const isConfirmed = status === "confirmed" || status === "확정";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        isConfirmed
          ? "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]"
          : "bg-[#eee3cc] text-[#7a5c2e]",
      )}
    >
      {label || "-"}
    </span>
  );
}

export function MonthlyPrescriptionsTable() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<MonthlyPrescriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("v_monthly_prescriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("처방 현황을 불러오지 못했습니다: " + error.message);
          setRows([]);
        } else {
          setRows(
            ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
          );
        }
        setIsLoading(false);
      });

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
        등록된 처방 데이터가 없습니다
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="hidden w-full min-w-[800px] text-left text-sm md:table">
          <thead>
            <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]/80">
              <th className="px-6 py-3 font-medium text-[#7a5c2e]">처방월</th>
              <th className="px-6 py-3 font-medium text-[#7a5c2e]">제약사</th>
              <th className="px-6 py-3 font-medium text-[#7a5c2e]">업체</th>
              <th className="px-6 py-3 font-medium text-[#7a5c2e]">
                병의원명
              </th>
              <th className="px-6 py-3 text-right font-medium text-[#7a5c2e]">
                처방금액
              </th>
              <th className="px-6 py-3 font-medium text-[#7a5c2e]">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-[#f0e4d0] last:border-b-0",
                  index % 2 === 1 && "bg-[#f5ede0]/40",
                )}
              >
                <td className="px-6 py-3.5 text-[#5a3e1b]">
                  {formatMonthLabel(row.month)}
                </td>
                <td className="px-6 py-3.5 font-medium text-[#2c1f0e]">
                  {row.pharma || "-"}
                </td>
                <td className="px-6 py-3.5 text-[#5a3e1b]">
                  {row.company || "-"}
                </td>
                <td className="px-6 py-3.5 text-[#5a3e1b]">
                  {row.hospital || "-"}
                </td>
                <td className="px-6 py-3.5 text-right font-medium text-[#2c1f0e]">
                  {formatWon(row.amount)}
                </td>
                <td className="px-6 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#9a7c4e]">
                {formatMonthLabel(row.month)}
              </span>
              <StatusBadge status={row.status} />
            </div>

            <p className="mt-2 text-base font-semibold text-[#2c1f0e]">
              {row.pharma || "-"}
            </p>

            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#9a7c4e]">업체</dt>
                <dd className="text-right text-[#5a3e1b]">
                  {row.company || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#9a7c4e]">병의원</dt>
                <dd className="text-right text-[#5a3e1b]">
                  {row.hospital || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#9a7c4e]">금액</dt>
                <dd className="text-right font-semibold text-[#2c1f0e]">
                  {formatWon(row.amount)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
