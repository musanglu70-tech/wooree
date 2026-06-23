"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Search } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "processing" | "sent" | "error";

interface AutomationTask {
  id: string;
  companyName: string;
  prescriptionMonth: string;
  status: string;
  createdAt: string;
  sentAt: string;
}

const STATUS_TABS: {
  id: StatusFilter;
  label: string;
  value?: string;
}[] = [
  { id: "all", label: "전체" },
  { id: "pending", label: "대기", value: "pending" },
  { id: "processing", label: "처리중", value: "processing" },
  { id: "sent", label: "완료", value: "sent" },
  { id: "error", label: "오류", value: "error" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  processing: "처리중",
  sent: "완료",
  error: "오류",
};

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors placeholder:text-[#b5a080] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRow(row: Record<string, unknown>): AutomationTask {
  const company = row.companies as { name?: string } | null;
  const month = toStr(row.prescription_month ?? row.prescription_date);

  return {
    id: toStr(row.id),
    companyName: toStr(company?.name ?? row.company_name),
    prescriptionMonth: month.length >= 7 ? month.slice(0, 7) : month,
    status: toStr(row.status),
    createdAt: toStr(row.created_at).slice(0, 16).replace("T", " "),
    sentAt: toStr(row.sent_at).slice(0, 16).replace("T", " "),
  };
}

function formatMonthLabel(month: string) {
  if (!month) return "-";
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status ?? "-";
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    processing: "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]",
    sent: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-600",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-[#eee3cc] text-[#7a5c2e]",
      )}
    >
      {label}
    </span>
  );
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function ProgressContent() {
  const supabase = useMemo(() => createClient(), []);

  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [prescriptionMonth, setPrescriptionMonth] = useState(currentMonth);

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("automation_tasks")
      .select("*, companies(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("작업 목록을 불러오지 못했습니다: " + error.message);
      setTasks([]);
    } else {
      setTasks(
        ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
      );
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tabCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: tasks.length,
      pending: 0,
      processing: 0,
      sent: 0,
      error: 0,
    };
    tasks.forEach((task) => {
      if (task.status === "pending") counts.pending++;
      if (task.status === "processing") counts.processing++;
      if (task.status === "sent") counts.sent++;
      if (task.status === "error") counts.error++;
    });
    return counts;
  }, [tasks]);

  const filteredItems = useMemo(() => {
    const tab = STATUS_TABS.find((t) => t.id === activeTab);
    return tasks.filter((item) => {
      if (tab?.value && item.status !== tab.value) return false;
      if (appliedSearch && !item.companyName.includes(appliedSearch)) {
        return false;
      }
      return true;
    });
  }, [tasks, activeTab, appliedSearch]);

  const handleGenerate = async () => {
    if (!prescriptionMonth) {
      toast.error("처방월을 선택해주세요.");
      return;
    }

    setIsGenerating(true);

    try {
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });

      if (companyError) {
        toast.error("업체 목록을 불러오지 못했습니다: " + companyError.message);
        return;
      }

      const companyList = companies ?? [];
      if (companyList.length === 0) {
        toast.error("등록된 업체가 없습니다.");
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const company of companyList) {
        const { data: task, error: insertError } = await supabase
          .from("automation_tasks")
          .insert({
            company_id: company.id,
            prescription_month: `${prescriptionMonth}-01`,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError || !task) {
          failCount++;
          continue;
        }

        const response = await fetch("/api/automation/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id }),
        });

        if (!response.ok) {
          const result = (await response.json()) as { message?: string };
          toast.error(
            `${company.name}: ${result.message ?? "신고서 생성 실패"}`,
          );
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount}개 업체 재위탁 신고서 생성이 완료되었습니다.`,
        );
      }
      if (failCount > 0 && successCount === 0) {
        toast.error("신고서 생성에 실패했습니다.");
      }

      await loadTasks();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              처방월
            </label>
            <input
              type="month"
              value={prescriptionMonth}
              onChange={(e) => setPrescriptionMonth(e.target.value)}
              className={inputClassName}
            />
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="size-4" />
            {isGenerating ? "생성 중..." : "재위탁 신고서 생성"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              activeTab === tab.id
                ? "border-[#4f6ef7] bg-[rgba(79,110,247,0.06)] shadow-sm"
                : "border-[#e8d9bc] bg-[#fdf8f0] hover:border-slate-300",
            )}
          >
            <p
              className={cn(
                "text-sm font-medium",
                activeTab === tab.id ? "text-[#4f6ef7]" : "text-[#9a7c4e]",
              )}
            >
              {tab.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#2c1f0e]">
              {tabCounts[tab.id]}건
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="업체명 검색"
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">업체명</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">처방월</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">상태</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">생성일</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">완료일</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    조회 결과가 없습니다.
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
                    <td className="px-5 py-3.5 font-medium text-[#2c1f0e]">
                      {item.companyName || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a3e1b]">
                      {formatMonthLabel(item.prescriptionMonth)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {item.createdAt || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {item.sentAt || "-"}
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
