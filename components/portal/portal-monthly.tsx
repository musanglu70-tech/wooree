"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import {
  aggregateByMonth,
  krw,
  loadPartnerLines,
  type PartnerLine,
} from "@/lib/partner/settlement";

export function PortalMonthly() {
  const supabase = useMemo(() => createClient(), []);
  const [lines, setLines] = useState<PartnerLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    loadPartnerLines(supabase)
      .then(setLines)
      .catch((e) => toast.error("불러오기 실패: " + e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const monthly = useMemo(() => aggregateByMonth(lines), [lines]);
  const totalCommission = monthly.reduce((s, m) => s + m.commission, 0);
  const totalAmount = monthly.reduce((s, m) => s + m.amount, 0);
  const totalCount = monthly.reduce((s, m) => s + m.count, 0);
  const totalQty = monthly.reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">월별 수수료 합계</h1>
          <p className="mt-1 text-sm text-slate-500">
            정산월 별 수수료 합계를 한눈에 확인하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-[#0f766e] hover:text-[#0f766e]"
        >
          <RefreshCw className="size-4" />
          새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">총 정산월</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {monthly.length}
            <span className="ml-1 text-sm text-slate-400">개월</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">총 데이터 건수</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {krw(totalCount)}
            <span className="ml-1 text-sm text-slate-400">건</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#0f766e]/30 bg-[#e6f4f1] p-5 shadow-sm">
          <p className="text-sm font-medium text-[#0f766e]">
            총 수수료액 (전체)
          </p>
          <p className="mt-2 text-2xl font-bold text-[#0f766e]">
            {krw(totalCommission)}
            <span className="ml-1 text-sm">원</span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            정산월별 합계
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">정산월</th>
                <th className="px-5 py-3 text-right font-medium">건수</th>
                <th className="px-5 py-3 text-right font-medium">수량</th>
                <th className="px-5 py-3 text-right font-medium">처방액</th>
                <th className="px-5 py-3 text-right font-medium">총 수수료액</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : monthly.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    정산 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {monthly.map((m, i) => (
                    <tr
                      key={m.month}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {m.month}
                        {i === 0 && (
                          <span className="ml-2 rounded bg-[#e6f4f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#0f766e]">
                            최신
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {krw(m.count)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {krw(m.quantity)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {krw(m.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#0f766e]">
                        {krw(m.commission)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-5 py-3.5 text-slate-800">총합계</td>
                    <td className="px-5 py-3.5 text-right text-slate-700">
                      {krw(totalCount)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700">
                      {krw(totalQty)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700">
                      {krw(totalAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[#0f766e]">
                      {krw(totalCommission)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
