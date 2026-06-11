"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Building2,
  Download,
  Eye,
  FolderOpen,
  Inbox,
  Layers,
  Scissors,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabId = "inbox" | "review" | "archive" | "cso" | "split";

interface SettlementFile {
  id: string;
  tab: TabId;
  fileName: string;
  pharma: string;
  month: string;
  uploadedAt: string;
  status: string;
}

const TABS: { id: TabId; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "수신함", icon: Inbox },
  { id: "review", label: "검토함", icon: Eye },
  { id: "archive", label: "보관함", icon: Archive },
  { id: "cso", label: "CSO별 집계", icon: Layers },
  { id: "split", label: "원본 분리", icon: Scissors },
];

const MOCK_FILES: SettlementFile[] = [
  {
    id: "1",
    tab: "inbox",
    fileName: "위더스제약_2026-05_정산.xlsx",
    pharma: "위더스제약",
    month: "2026-05",
    uploadedAt: "2026-06-08 10:22",
    status: "수신",
  },
  {
    id: "2",
    tab: "inbox",
    fileName: "테라벤이븐스_2026-05_정산.xlsx",
    pharma: "(주)테라벤이븐스",
    month: "2026-05",
    uploadedAt: "2026-06-07 15:40",
    status: "수신",
  },
  {
    id: "3",
    tab: "review",
    fileName: "대웅바이오_2026-04_정산.xlsx",
    pharma: "대웅바이오(주)",
    month: "2026-04",
    uploadedAt: "2026-05-30 09:15",
    status: "검토중",
  },
  {
    id: "4",
    tab: "review",
    fileName: "경동제약_2026-04_정산.xlsx",
    pharma: "경동제약(주)",
    month: "2026-04",
    uploadedAt: "2026-05-29 14:00",
    status: "검토중",
  },
  {
    id: "5",
    tab: "archive",
    fileName: "한화제약_2026-03_정산.xlsx",
    pharma: "한화제약(주)",
    month: "2026-03",
    uploadedAt: "2026-04-25 11:30",
    status: "보관",
  },
  {
    id: "6",
    tab: "cso",
    fileName: "CSO집계_우리메디텍_2026-05.xlsx",
    pharma: "전체",
    month: "2026-05",
    uploadedAt: "2026-06-06 16:00",
    status: "집계완료",
  },
  {
    id: "7",
    tab: "split",
    fileName: "원본분리_위더스_2026-05.pdf",
    pharma: "위더스제약",
    month: "2026-05",
    uploadedAt: "2026-06-05 13:20",
    status: "분리완료",
  },
];

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}년 ${mon}월`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    수신: "bg-blue-50 text-blue-700",
    검토중: "bg-amber-50 text-amber-700",
    보관: "bg-slate-100 text-slate-600",
    집계완료: "bg-emerald-50 text-emerald-700",
    분리완료: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {status}
    </span>
  );
}

export function ByPharmaContent() {
  const [activeTab, setActiveTab] = useState<TabId>("inbox");

  const filteredFiles = useMemo(
    () => MOCK_FILES.filter((f) => f.tab === activeTab),
    [activeTab],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-[#4f6ef7] text-white"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => toast.info("파일 업로드는 서버 연동 후 사용 가능합니다.")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
        >
          <Upload className="size-4" />
          직접 업로드
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">파일명</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">정산월</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  업로드일
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    해당 탭에 파일이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file, index) => (
                  <tr
                    key={file.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        <FolderOpen className="size-4 text-slate-400" />
                        {file.fileName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-slate-400" />
                        {file.pharma}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {formatMonthLabel(file.month)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {file.uploadedAt}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={file.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.info(`미리보기: ${file.fileName}`)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info(`다운로드: ${file.fileName}`)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Download className="size-3.5" />
                        </button>
                      </div>
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
