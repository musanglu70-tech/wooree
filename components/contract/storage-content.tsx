"use client";

import { useMemo, useState } from "react";
import { Archive, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArchivedContract {
  id: string;
  name: string;
  company: string;
  pharma: string;
  archivedAt: string;
  signedAt: string;
}

const MOCK_ARCHIVED: ArchivedContract[] = [
  {
    id: "1",
    name: "위더스제약 CSO 위탁계약 (2025)",
    company: "우리메디텍",
    pharma: "위더스제약",
    archivedAt: "2026-01-15",
    signedAt: "2025-12-20",
  },
  {
    id: "2",
    name: "테라벤이븐스 위탁판매 계약 (2025)",
    company: "우리메디텍",
    pharma: "(주)테라벤이븐스",
    archivedAt: "2026-01-10",
    signedAt: "2025-11-30",
  },
  {
    id: "3",
    name: "대웅바이오 수수료 합의서 (2025)",
    company: "우리메디텍",
    pharma: "대웅바이오(주)",
    archivedAt: "2025-12-28",
    signedAt: "2025-12-15",
  },
  {
    id: "4",
    name: "경동제약 재위탁 동의서",
    company: "우리메디텍",
    pharma: "경동제약(주)",
    archivedAt: "2025-12-20",
    signedAt: "2025-12-01",
  },
  {
    id: "5",
    name: "한화제약 CSO 계약 (2024)",
    company: "우리메디텍",
    pharma: "한화제약(주)",
    archivedAt: "2025-11-05",
    signedAt: "2024-12-28",
  },
];

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors placeholder:text-[#b5a080] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

export function StorageContent() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!appliedSearch) return MOCK_ARCHIVED;
    const q = appliedSearch.toLowerCase();
    return MOCK_ARCHIVED.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.pharma.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q),
    );
  }, [appliedSearch]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="계약서명, 제약사, 업체 검색"
            className={inputClassName}
            onKeyDown={(e) => {
              if (e.key === "Enter") setAppliedSearch(search.trim());
            }}
          />
          <button
            type="button"
            onClick={() => setAppliedSearch(search.trim())}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#4f6ef7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
          >
            <Search className="size-4" />
            검색
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">
                  계약서명
                </th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">업체</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">제약사</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">
                  서명일
                </th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">
                  보관일
                </th>
                <th className="px-5 py-3 text-center font-medium text-[#7a5c2e]">
                  다운로드
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    검색 결과가 없습니다.
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
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 font-medium text-[#2c1f0e]">
                        <Archive className="size-4 text-[#b5a080]" />
                        {item.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#5a3e1b]">
                      {item.company}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a3e1b]">{item.pharma}</td>
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {item.signedAt}
                    </td>
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {item.archivedAt}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toast.info(`다운로드: ${item.name}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#e8d9bc] px-2.5 py-1.5 text-xs font-medium text-[#5a3e1b] hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                      >
                        <Download className="size-3.5" />
                        PDF
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
