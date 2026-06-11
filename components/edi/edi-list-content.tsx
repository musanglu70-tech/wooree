"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { PHARMAS, formatWon } from "@/lib/edi/constants";
import { cn } from "@/lib/utils";

type EdiStatus = "저장" | "확정";

interface EdiListItem {
  id: string;
  month: string;
  pharma: string;
  hospital: string;
  amount: number;
  status: EdiStatus;
  createdAt: string;
}

const MOCK_ITEMS: EdiListItem[] = [
  {
    id: "1",
    month: "2026-06",
    pharma: "위더스제약",
    hospital: "현마음의원",
    amount: 1_285_024,
    status: "저장",
    createdAt: "2026-06-08",
  },
  {
    id: "2",
    month: "2026-06",
    pharma: "(주)테라벤이븐스",
    hospital: "상진형내과의원",
    amount: 2_928_380,
    status: "확정",
    createdAt: "2026-06-07",
  },
  {
    id: "3",
    month: "2026-06",
    pharma: "대웅바이오(주)",
    hospital: "제이산부인과의원(대전)",
    amount: 824_938,
    status: "저장",
    createdAt: "2026-06-06",
  },
  {
    id: "4",
    month: "2026-05",
    pharma: "위더스제약",
    hospital: "포커스앤여성의원",
    amount: 1_067_145,
    status: "확정",
    createdAt: "2026-05-31",
  },
  {
    id: "5",
    month: "2026-05",
    pharma: "경동제약(주)",
    hospital: "강승모내과의원(충주)",
    amount: 1_134_336,
    status: "확정",
    createdAt: "2026-05-28",
  },
  {
    id: "6",
    month: "2026-05",
    pharma: "위더스제약",
    hospital: "둘앗은비뇨기과의원(충주)",
    amount: 5_430_052,
    status: "저장",
    createdAt: "2026-05-25",
  },
  {
    id: "7",
    month: "2026-05",
    pharma: "한화제약(주)",
    hospital: "365베스트치과의원",
    amount: 1_955_028,
    status: "확정",
    createdAt: "2026-05-22",
  },
  {
    id: "8",
    month: "2026-04",
    pharma: "동광제약(주)",
    hospital: "365시온감동치과의원",
    amount: 1_563_660,
    status: "저장",
    createdAt: "2026-04-30",
  },
  {
    id: "9",
    month: "2026-04",
    pharma: "오스틴제약주식회사",
    hospital: "송탄바른치과의원",
    amount: 474_376,
    status: "확정",
    createdAt: "2026-04-18",
  },
  {
    id: "10",
    month: "2026-04",
    pharma: "대화제약(주)",
    hospital: "서울대학교병원",
    amount: 48_520_000,
    status: "확정",
    createdAt: "2026-04-10",
  },
];

const PAGE_SIZE = 5;

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}년 ${mon}월`;
}

function StatusBadge({ status }: { status: EdiStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "저장"
          ? "bg-slate-100 text-slate-600"
          : "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]",
      )}
    >
      {status}
    </span>
  );
}

export function EdiListContent() {
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPharma, setFilterPharma] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    month: "",
    pharma: "",
    client: "",
  });
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter((item) => {
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
  }, [appliedFilters]);

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

  return (
    <div className="space-y-4">
      {/* 필터 */}
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

      {/* 통계 카드 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">총 건수</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {filteredItems.length.toLocaleString("ko-KR")}건
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">총 처방금액</p>
          <p className="mt-1 text-2xl font-semibold text-[#4f6ef7]">
            {formatWon(totalAmount)}
          </p>
        </div>
      </section>

      {/* 테이블 */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">처방월</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  병의원명
                </th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  처방금액
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  등록일
                </th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  상세
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    조회 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
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
                      {item.createdAt}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(`상세보기: ${item.hospital} (목업)`)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
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
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500">
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
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
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
                      : "border border-slate-200 text-slate-600 hover:border-[#4f6ef7] hover:text-[#4f6ef7]",
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
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
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
