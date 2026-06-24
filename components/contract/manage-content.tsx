"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface ContractItem {
  id: string;
  title: string;
  companyName: string;
  pharmaName: string;
  validFrom: string;
  validTo: string;
  status: string;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-3 text-sm text-[#0f172a] outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  sent: "발송",
  signed: "서명완료",
  초안: "초안",
  발송: "발송",
  서명완료: "서명완료",
};

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toDateOnly(value: unknown): string {
  const str = toStr(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function normalizeRow(row: Record<string, unknown>): ContractItem {
  const company = row.companies as { name?: string } | null;
  const pharma = row.pharma_companies as { name?: string } | null;

  return {
    id: toStr(row.id),
    title: toStr(row.title ?? row.name ?? row.contract_name),
    companyName: toStr(company?.name ?? row.company_name),
    pharmaName: toStr(pharma?.name ?? row.pharma_company_name),
    validFrom: toDateOnly(row.valid_from ?? row.start_date ?? row.valid_start),
    validTo: toDateOnly(row.valid_to ?? row.end_date ?? row.valid_end),
    status: toStr(row.status),
  };
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status ?? "-";
  const isSigned = status === "signed" || status === "서명완료";
  const isSent = status === "sent" || status === "발송";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        isSigned
          ? "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]"
          : isSent
            ? "bg-amber-50 text-amber-700"
            : "bg-[#e2e8f0] text-[#475569]",
      )}
    >
      {label}
    </span>
  );
}

export function ManageContent() {
  const supabase = useMemo(() => createClient(), []);

  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterPharma, setFilterPharma] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [applied, setApplied] = useState({
    pharma: "",
    company: "",
    status: "",
  });

  useEffect(() => {
    let active = true;

    supabase
      .from("contracts")
      .select("*, companies(name), pharma_companies(name)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("계약서 목록을 불러오지 못했습니다: " + error.message);
          setContracts([]);
        } else {
          setContracts(
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
    contracts.forEach((c) => {
      if (c.pharmaName) set.add(c.pharmaName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko-KR"));
  }, [contracts]);

  const statusList = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.status) set.add(STATUS_LABEL[c.status] ?? c.status);
    });
    return Array.from(set);
  }, [contracts]);

  const filteredItems = useMemo(() => {
    return contracts.filter((item) => {
      if (applied.pharma && item.pharmaName !== applied.pharma) return false;
      if (
        applied.company &&
        !item.companyName.includes(applied.company)
      ) {
        return false;
      }
      if (applied.status) {
        const label = STATUS_LABEL[item.status] ?? item.status;
        if (label !== applied.status) return false;
      }
      return true;
    });
  }, [contracts, applied]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#475569]">
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
            <label className="mb-1.5 block text-xs font-medium text-[#475569]">
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
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#475569]">
              상태
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={inputClassName}
            >
              <option value="">전체</option>
              {statusList.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                setApplied({
                  pharma: filterPharma,
                  company: filterCompany.trim(),
                  status: filterStatus,
                })
              }
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
            >
              <Search className="size-4" />
              조회
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-5 py-3 font-medium text-[#475569]">제목</th>
                <th className="px-5 py-3 font-medium text-[#475569]">업체명</th>
                <th className="px-5 py-3 font-medium text-[#475569]">
                  제약사명
                </th>
                <th className="px-5 py-3 font-medium text-[#475569]">
                  유효기간
                </th>
                <th className="px-5 py-3 font-medium text-[#475569]">상태</th>
                <th className="px-5 py-3 text-center font-medium text-[#475569]">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#64748b]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#64748b]"
                  >
                    등록된 계약서가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isSigned =
                    item.status === "signed" || item.status === "서명완료";

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-[#f1f5f9] last:border-b-0",
                        index % 2 === 1 && "bg-[#f8fafc]/40",
                      )}
                    >
                      <td className="px-5 py-3.5 font-medium text-[#0f172a]">
                        {item.title || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-[#475569]">
                        {item.companyName || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-[#475569]">
                        {item.pharmaName || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-[#475569]">
                        {item.validFrom || "-"} ~ {item.validTo || "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              toast.info(`보기: ${item.title}`)
                            }
                            className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          {!isSigned && (
                            <button
                              type="button"
                              onClick={() =>
                                toast.info(`발송: ${item.title}`)
                              }
                              className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                            >
                              <Send className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
