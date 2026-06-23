"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { downloadExcel, formatYmd } from "@/lib/excel/export";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface EdiListItem {
  id: string;
  month: string;
  pharma: string;
  hospital: string;
  amount: number;
  status: string;
  createdAt: string;
}

const PAGE_SIZE = 5;

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors placeholder:text-[#b5a080] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

const STATUS_LABEL: Record<string, string> = {
  saved: "저장",
  confirmed: "확정",
  저장: "저장",
  확정: "확정",
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toMonth(value: unknown): string {
  const str = toStr(value);
  return str.length >= 7 ? str.slice(0, 7) : str;
}

function toDateOnly(value: unknown): string {
  const str = toStr(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function normalizeRow(row: Record<string, unknown>): EdiListItem {
  return {
    id: toStr(row.id ?? row.prescription_id ?? crypto.randomUUID()),
    month: toMonth(
      row.month ?? row.prescription_month ?? row.prescription_date,
    ),
    pharma: toStr(
      row.pharma_company_name ??
        row.pharma_name ??
        row.pharma ??
        row.company_name,
    ),
    hospital: toStr(row.hospital_name ?? row.hospital ?? row.client),
    amount: toNumber(
      row.total_amount ?? row.amount ?? row.prescription_amount ?? row.sum_amount,
    ),
    status: toStr(row.status),
    createdAt: toDateOnly(row.created_at ?? row.created_date ?? row.registered_at),
  };
}

function formatMonthLabel(month: string) {
  if (!month) return "-";
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
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

export function EdiListContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<EdiListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterPharma, setFilterPharma] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    month: "",
    pharma: "",
    client: "",
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    supabase
      .from("v_monthly_prescriptions")
      .select("*")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("목록을 불러오지 못했습니다: " + error.message);
          setItems([]);
        } else {
          setItems(
            ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
          );
        }
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  const pharmaList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.pharma) set.add(item.pharma);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko-KR"));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (appliedFilters.month && item.month !== appliedFilters.month) {
        return false;
      }
      if (appliedFilters.pharma && item.pharma !== appliedFilters.pharma) {
        return false;
      }
      if (
        appliedFilters.client &&
        !item.hospital.includes(appliedFilters.client)
      ) {
        return false;
      }
      return true;
    });
  }, [items, appliedFilters]);

  const totalAmount = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.amount, 0),
    [filteredItems],
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleSearch = () => {
    setAppliedFilters({
      month: filterMonth,
      pharma: filterPharma,
      client: filterClient.trim(),
    });
    setPage(1);
  };

  const handleExport = () => {
    if (filteredItems.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    downloadExcel(`EDI목록_${formatYmd()}.xlsx`, [
      {
        name: "EDI목록",
        rows: filteredItems.map((item) => ({
          처방월: formatMonthLabel(item.month),
          제약사: item.pharma || "-",
          병의원명: item.hospital || "-",
          처방금액: item.amount,
          상태: STATUS_LABEL[item.status] ?? item.status ?? "-",
          등록일: item.createdAt || "-",
        })),
      },
    ]);

    toast.success("엑셀 파일을 다운로드했습니다.");
  };

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
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              제약사
            </label>
            <select
              value={filterPharma}
              onChange={(e) => setFilterPharma(e.target.value)}
              className={inputClassName}
            >
              <option value="">전체</option>
              {pharmaList.map((pharma) => (
                <option key={pharma} value={pharma}>
                  {pharma}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              거래처 검색
            </label>
            <input
              type="text"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              placeholder="병의원명 검색"
              className={inputClassName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
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

      {/* 통계 카드 + 엑셀 다운로드 */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm">
            <p className="text-sm text-[#9a7c4e]">총 건수</p>
            <p className="mt-1 text-2xl font-semibold text-[#2c1f0e]">
              {filteredItems.length.toLocaleString("ko-KR")}건
            </p>
          </div>
          <div className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm">
            <p className="text-sm text-[#9a7c4e]">총 처방금액</p>
            <p className="mt-1 text-2xl font-semibold text-[#4f6ef7]">
              {formatWon(totalAmount)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isLoading || filteredItems.length === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-4 text-sm font-medium text-[#5a3e1b] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          엑셀 다운로드
        </button>
      </section>

      {/* 테이블 */}
      <section className="overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">처방월</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">제약사</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">
                  병의원명
                </th>
                <th className="px-5 py-3 text-right font-medium text-[#7a5c2e]">
                  처방금액
                </th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">상태</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">
                  등록일
                </th>
                <th className="px-5 py-3 text-center font-medium text-[#7a5c2e]">
                  상세
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    조회 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[#f0e4d0] last:border-b-0",
                      index % 2 === 1 && "bg-[#f5ede0]/40",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[#5a3e1b]">
                      {formatMonthLabel(item.month)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#2c1f0e]">
                      {item.pharma || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a3e1b]">
                      {item.hospital || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-[#2c1f0e]">
                      {formatWon(item.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {item.createdAt || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/edi/${item.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#e8d9bc] px-2.5 py-1.5 text-xs font-medium text-[#5a3e1b] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                      >
                        <Eye className="size-3.5" />
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between border-t border-[#e8d9bc] px-5 py-4">
          <p className="text-xs text-[#9a7c4e]">
            전체 {filteredItems.length}건 중{" "}
            {filteredItems.length === 0
              ? 0
              : (currentPage - 1) * PAGE_SIZE + 1}
            –
            {Math.min(currentPage * PAGE_SIZE, filteredItems.length)}건 표시
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-[#e8d9bc] text-[#7a5c2e] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    pageNum === currentPage
                      ? "bg-[#4f6ef7] text-white"
                      : "border border-[#e8d9bc] text-[#7a5c2e] hover:border-[#4f6ef7] hover:text-[#4f6ef7]",
                  )}
                >
                  {pageNum}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-[#e8d9bc] text-[#7a5c2e] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="다음 페이지"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
