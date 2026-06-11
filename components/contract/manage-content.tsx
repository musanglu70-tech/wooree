"use client";

import { useMemo, useState } from "react";
import { Eye, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { PHARMAS } from "@/lib/edi/constants";
import { cn } from "@/lib/utils";

type ContractStatus = "초안" | "발송" | "서명완료";
type StatusFilter = "전체" | ContractStatus;

interface ContractItem {
  id: string;
  name: string;
  company: string;
  pharma: string;
  validFrom: string;
  validTo: string;
  status: ContractStatus;
}

const MOCK_CONTRACTS: ContractItem[] = [
  {
    id: "1",
    name: "위더스제약 CSO 위탁계약",
    company: "우리메디텍",
    pharma: "위더스제약",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    status: "서명완료",
  },
  {
    id: "2",
    name: "테라벤이븐스 위탁판매 계약",
    company: "우리메디텍",
    pharma: "(주)테라벤이븐스",
    validFrom: "2026-03-01",
    validTo: "2027-02-28",
    status: "발송",
  },
  {
    id: "3",
    name: "대웅바이오 수수료 합의서",
    company: "우리메디텍",
    pharma: "대웅바이오(주)",
    validFrom: "2026-04-01",
    validTo: "2027-03-31",
    status: "초안",
  },
  {
    id: "4",
    name: "경동제약 재위탁 동의서",
    company: "우리메디텍",
    pharma: "경동제약(주)",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    status: "서명완료",
  },
  {
    id: "5",
    name: "한화제약 CSO 계약",
    company: "우리메디텍",
    pharma: "한화제약(주)",
    validFrom: "2026-06-01",
    validTo: "2027-05-31",
    status: "발송",
  },
  {
    id: "6",
    name: "동광제약 위탁계약",
    company: "우리메디텍",
    pharma: "동광제약(주)",
    validFrom: "2026-02-01",
    validTo: "2027-01-31",
    status: "초안",
  },
];

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function StatusBadge({ status }: { status: ContractStatus }) {
  const styles: Record<ContractStatus, string> = {
    초안: "bg-slate-100 text-slate-600",
    발송: "bg-amber-50 text-amber-700",
    서명완료: "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

export function ManageContent() {
  const [filterPharma, setFilterPharma] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("전체");
  const [applied, setApplied] = useState({
    pharma: "",
    company: "",
    status: "전체" as StatusFilter,
  });

  const filteredItems = useMemo(() => {
    return MOCK_CONTRACTS.filter((item) => {
      if (applied.pharma && item.pharma !== applied.pharma) return false;
      if (applied.company && !item.company.includes(applied.company)) {
        return false;
      }
      if (applied.status !== "전체" && item.status !== applied.status) {
        return false;
      }
      return true;
    });
  }, [applied]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              상태
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as StatusFilter)
              }
              className={inputClassName}
            >
              <option value="전체">전체</option>
              <option value="초안">초안</option>
              <option value="발송">발송</option>
              <option value="서명완료">서명완료</option>
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">
                  계약서명
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">업체</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  유효기간
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-slate-100 last:border-b-0",
                    index % 2 === 1 && "bg-slate-50/40",
                  )}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{item.company}</td>
                  <td className="px-5 py-3.5 text-slate-700">{item.pharma}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {item.validFrom} ~ {item.validTo}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toast.info(`보기: ${item.name}`)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      {item.status !== "서명완료" && (
                        <button
                          type="button"
                          onClick={() => toast.success(`발송: ${item.name}`)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Send className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
