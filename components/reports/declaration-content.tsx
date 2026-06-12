"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, FileOutput } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface RecommissionReport {
  id: string;
  title: string;
  companyName: string;
  reportDate: string;
  totalAmount: number;
  isSent: boolean;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeRow(row: Record<string, unknown>): RecommissionReport {
  const company = row.companies as { name?: string } | null;

  return {
    id: toStr(row.id),
    title: toStr(row.title),
    companyName: toStr(company?.name ?? row.company_name),
    reportDate: toStr(
      row.report_date ?? row.created_at,
    ).slice(0, 10),
    totalAmount: toNumber(row.total_amount),
    isSent: Boolean(row.is_sent),
  };
}

export function DeclarationContent() {
  const supabase = useMemo(() => createClient(), []);

  const [reports, setReports] = useState<RecommissionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("recommission_reports")
      .select("*, companies(name)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("신고서 목록을 불러오지 못했습니다: " + error.message);
          setReports([]);
        } else {
          setReports(
            ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
          );
        }
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 font-medium text-slate-600">신고서</th>
              <th className="px-5 py-3 font-medium text-slate-600">업체명</th>
              <th className="px-5 py-3 font-medium text-slate-600">신고일</th>
              <th className="px-5 py-3 text-right font-medium text-slate-600">
                총금액
              </th>
              <th className="px-5 py-3 font-medium text-slate-600">
                발송여부
              </th>
              <th className="px-5 py-3 text-center font-medium text-slate-600">
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  불러오는 중...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  등록된 신고서가 없습니다.
                </td>
              </tr>
            ) : (
              reports.map((item, index) => (
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
                      {item.title || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">
                    {item.companyName || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {item.reportDate || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                    {formatWon(item.totalAmount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        item.isSent
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {item.isSent ? "발송완료" : "미발송"}
                    </span>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
