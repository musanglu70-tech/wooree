"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface InspectItem {
  id: string;
  month: string;
  pharma: string;
  hospital: string;
  amount: number;
  createdAt: string;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeRow(row: Record<string, unknown>): InspectItem {
  const pharma = row.pharma_companies as { name?: string } | null;
  const month = toStr(row.prescription_date);

  return {
    id: toStr(row.id),
    month: month.length >= 7 ? month.slice(0, 7) : month,
    pharma: toStr(pharma?.name),
    hospital: toStr(row.hospital_name),
    amount: toNumber(row.total_amount ?? row.amount),
    createdAt: toStr(row.created_at).slice(0, 10),
  };
}

function formatMonthLabel(month: string) {
  if (!month) return "-";
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

export function EdiInspectContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [items, setItems] = useState<InspectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterPharma, setFilterPharma] = useState("");
  const [applied, setApplied] = useState({ month: "", pharma: "" });

  useEffect(() => {
    let active = true;

    supabase
      .from("prescriptions")
      .select("*, pharma_companies(name)")
      .eq("status", "saved")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("검수 목록을 불러오지 못했습니다: " + error.message);
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
      if (applied.month && item.month !== applied.month) return false;
      if (applied.pharma && item.pharma !== applied.pharma) return false;
      return true;
    });
  }, [items, applied]);

  const handleSearch = () => {
    setApplied({ month: filterMonth, pharma: filterPharma });
  };

  const handleReset = () => {
    setFilterMonth("");
    setFilterPharma("");
    setApplied({ month: "", pharma: "" });
  };

  return (
    <div className="space-y-4">
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
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#7a5c2e] transition-colors hover:bg-[#f5ede0]"
            >
              <RotateCcw className="size-3.5" />
              초기화
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
            >
              <Search className="size-4" />
              조회
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
        <div className="border-b border-[#e8d9bc] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#2c1f0e]">
            검수 대기 (저장 상태){" "}
            <span className="font-normal text-[#9a7c4e]">
              {filteredItems.length}건
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">처방월</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">제약사</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">병의원</th>
                <th className="px-5 py-3 text-right font-medium text-[#7a5c2e]">
                  처방금액
                </th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">등록일</th>
                <th className="px-5 py-3 text-center font-medium text-[#7a5c2e]">
                  검수
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    검수 대기 중인 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
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
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {item.createdAt || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/edi/inspect/${item.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#4f6ef7] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
                      >
                        <ClipboardCheck className="size-3.5" />
                        확정
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
                                                                                                                                                                                                    