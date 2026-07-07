"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { downloadExcel } from "@/lib/excel/export";
import {
  krw,
  loadPartnerLines,
  type PartnerLine,
} from "@/lib/partner/settlement";

export function PortalSettlement() {
  const supabase = useMemo(() => createClient(), []);
  const [lines, setLines] = useState<PartnerLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    loadPartnerLines(supabase)
      .then((rows) => {
        setLines(rows);
        setMonth((m) => m || rows[0]?.settlementMonth || "");
      })
      .catch((e) => toast.error("불러오기 실패: " + e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const months = useMemo(
    () =>
      Array.from(new Set(lines.map((l) => l.settlementMonth)))
        .filter(Boolean)
        .sort((a, b) => (a < b ? 1 : -1)),
    [lines],
  );

  const filtered = useMemo(() => {
    const kw = search.trim();
    return lines.filter(
      (l) =>
        (!month || l.settlementMonth === month) &&
        (!kw ||
          l.productName.includes(kw) ||
          l.hospitalName.includes(kw) ||
          l.insuranceCode.includes(kw)),
    );
  }, [lines, month, search]);

  const commissionTotal = filtered.reduce((s, l) => s + l.commission, 0);
  const amountTotal = filtered.reduce((s, l) => s + l.amount, 0);
  const hospitalCount = new Set(filtered.map((l) => l.hospitalName)).size;
  const productCount = new Set(filtered.map((l) => l.productName)).size;

  const handleExcel = () => {
    if (filtered.length === 0) {
      toast.error("다운로드할 내역이 없습니다.");
      return;
    }
    downloadExcel(`정산내역_${month || "전체"}.xlsx`, [
      {
        name: "정산내역",
        rows: filtered.map((l) => ({
          정산월: l.settlementMonth,
          처방월: l.prescriptionMonth,
          거래처: l.hospitalName,
          보험코드: l.insuranceCode,
          제품명: l.productName,
          단가: l.unitPrice,
          수량: l.quantity,
          처방액: l.amount,
          수수료율: l.commissionRate,
          수수료액: l.commission,
        })),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">정산서 조회</h1>
          <p className="mt-1 text-sm text-slate-500">
            월별 정산 내역을 조회하고 다운로드하세요.
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
          <p className="text-sm font-medium text-slate-500">수수료 합계</p>
          <p className="mt-2 text-2xl font-bold text-[#0f766e]">
            {krw(commissionTotal)}
            <span className="ml-1 text-sm text-slate-400">원</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            처방액 {krw(amountTotal)}원
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">거래처 수</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {hospitalCount}
            <span className="ml-1 text-sm text-slate-400">곳</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">제품 수</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {productCount}
            <span className="ml-1 text-sm text-slate-400">종</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              정산월
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
            >
              <option value="">전체</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              검색
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(searchInput);
              }}
              placeholder="제품명, 거래처, 보험코드"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearch(searchInput)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f766e] px-4 text-sm font-semibold text-white hover:bg-[#0e6b63]"
          >
            <Search className="size-4" />
            조회
          </button>
          <button
            type="button"
            onClick={handleExcel}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            <Download className="size-4" />
            엑셀 다운로드
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            정산 상세 내역
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            전체 {filtered.length}건 표시
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">거래처</th>
                <th className="px-4 py-3 font-medium">정산월</th>
                <th className="px-4 py-3 font-medium">처방월</th>
                <th className="px-4 py-3 font-medium">보험코드</th>
                <th className="px-4 py-3 font-medium">제품명</th>
                <th className="px-4 py-3 text-right font-medium">수량</th>
                <th className="px-4 py-3 text-right font-medium">처방액</th>
                <th className="px-4 py-3 text-right font-medium">수수료율</th>
                <th className="px-4 py-3 text-right font-medium">수수료액</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    조회된 정산 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((l, i) => (
                  <tr
                    key={l.prescriptionId + l.insuranceCode + i}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {l.hospitalName || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {l.settlementMonth}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {l.prescriptionMonth}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {l.insuranceCode || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {l.productName || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {krw(l.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {krw(l.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {l.commissionRate ? `${l.commissionRate}%` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#0f766e]">
                      {krw(l.commission)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
