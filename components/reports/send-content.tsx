"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type SendTab = "pending" | "sent";

interface SendReport {
  id: string;
  title: string;
  companyName: string;
  totalAmount: number;
  isSent: boolean;
  sentAt: string;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeRow(row: Record<string, unknown>): SendReport {
  const company = row.companies as { name?: string } | null;

  return {
    id: toStr(row.id),
    title: toStr(row.title),
    companyName: toStr(company?.name ?? row.company_name),
    totalAmount: toNumber(row.total_amount),
    isSent: Boolean(row.is_sent),
    sentAt: toStr(row.sent_at).slice(0, 16).replace("T", " "),
  };
}

export function SendContent() {
  const supabase = useMemo(() => createClient(), []);

  const [reports, setReports] = useState<SendReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SendTab>("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendingIds, setSendingIds] = useState<string[]>([]);

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("recommission_reports")
      .select("*, companies(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("신고서 목록을 불러오지 못했습니다: " + error.message);
      setReports([]);
    } else {
      setReports(
        ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
      );
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const pendingItems = useMemo(
    () => reports.filter((r) => !r.isSent),
    [reports],
  );
  const sentItems = useMemo(
    () => reports.filter((r) => r.isSent),
    [reports],
  );

  const displayItems = activeTab === "pending" ? pendingItems : sentItems;

  const allSelected =
    pendingItems.length > 0 && selectedIds.length === pendingItems.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : pendingItems.map((item) => item.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const sendReports = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.error("발송할 항목을 선택해주세요.");
      return;
    }

    setSendingIds(ids);
    const now = new Date().toISOString();
    let successCount = 0;

    try {
      for (const id of ids) {
        const { error } = await supabase
          .from("recommission_reports")
          .update({ is_sent: true, sent_at: now })
          .eq("id", id);

        if (error) {
          toast.error("발송 실패: " + error.message);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}건 발송 완료되었습니다.`);
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        await loadReports();
      }
    } finally {
      setSendingIds([]);
    }
  };

  const handleSendOne = async (report: SendReport) => {
    await sendReports([report.id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "pending"
                ? "bg-[#4f6ef7] text-white"
                : "text-[#7a5c2e] hover:bg-[#f5ede0]",
            )}
          >
            발송 대기
            {pendingItems.length > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === "pending"
                    ? "bg-[#fdf8f0]/20"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {pendingItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "sent"
                ? "bg-[#4f6ef7] text-white"
                : "text-[#7a5c2e] hover:bg-[#f5ede0]",
            )}
          >
            발송 완료
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                activeTab === "sent"
                  ? "bg-[#fdf8f0]/20"
                  : "bg-[#eee3cc] text-[#7a5c2e]",
              )}
            >
              {sentItems.length}
            </span>
          </button>
        </div>

        {activeTab === "pending" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sendReports(selectedIds)}
              disabled={selectedIds.length === 0 || sendingIds.length > 0}
              className="inline-flex items-center gap-2 rounded-lg border border-[#4f6ef7] bg-[#fdf8f0] px-4 py-2.5 text-sm font-semibold text-[#4f6ef7] transition-colors hover:bg-[rgba(79,110,247,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
              선택 발송
            </button>
            <button
              type="button"
              onClick={() => sendReports(pendingItems.map((item) => item.id))}
              disabled={pendingItems.length === 0 || sendingIds.length > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mail className="size-4" />
              전체 발송
            </button>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                {activeTab === "pending" && (
                  <th className="w-12 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-slate-300 accent-[#4f6ef7]"
                      aria-label="전체 선택"
                    />
                  </th>
                )}
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">업체명</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">신고서</th>
                <th className="px-5 py-3 text-right font-medium text-[#7a5c2e]">
                  총금액
                </th>
                {activeTab === "pending" ? (
                  <th className="px-5 py-3 text-center font-medium text-[#7a5c2e]">
                    발송
                  </th>
                ) : (
                  <th className="px-5 py-3 font-medium text-[#7a5c2e]">
                    발송일시
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={activeTab === "pending" ? 5 : 4}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : displayItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "pending" ? 5 : 4}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
                  >
                    {activeTab === "pending"
                      ? "발송 대기 항목이 없습니다."
                      : "발송 완료 내역이 없습니다."}
                  </td>
                </tr>
              ) : (
                displayItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[#f0e4d0] last:border-b-0",
                      index % 2 === 1 && "bg-[#f5ede0]/40",
                    )}
                  >
                    {activeTab === "pending" && (
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="size-4 rounded border-slate-300 accent-[#4f6ef7]"
                          aria-label={`${item.title} 선택`}
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-medium text-[#2c1f0e]">
                      {item.companyName || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a3e1b]">
                      {item.title || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-[#2c1f0e]">
                      {formatWon(item.totalAmount)}
                    </td>
                    {activeTab === "pending" ? (
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleSendOne(item)}
                          disabled={sendingIds.includes(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#4f6ef7] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="size-3.5" />
                          {sendingIds.includes(item.id) ? "발송 중..." : "발송"}
                        </button>
                      </td>
                    ) : (
                      <td className="px-5 py-3.5 text-[#7a5c2e]">
                        {item.sentAt || "-"}
                      </td>
                    )}
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
