"use client";

import { useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SendTab = "pending" | "sent";
type SendStatus = "대기" | "발송완료";

interface SendItem {
  id: string;
  company: string;
  reportTitle: string;
  email: string;
  status: SendStatus;
  sentAt?: string;
}

const INITIAL_PENDING: SendItem[] = [
  {
    id: "1",
    company: "우리메디텍",
    reportTitle: "2026년 5월 재위탁 신고서 (위더스제약)",
    email: "contact@woorimeditech.co.kr",
    status: "대기",
  },
  {
    id: "2",
    company: "우리메디텍",
    reportTitle: "2026년 5월 재위탁 신고서 (테라벤이븐스)",
    email: "edi@teravenus.com",
    status: "대기",
  },
  {
    id: "3",
    company: "우리메디텍",
    reportTitle: "2026년 4월 재위탁 신고서 (대웅바이오)",
    email: "settlement@daewoongbio.com",
    status: "대기",
  },
  {
    id: "4",
    company: "우리메디텍",
    reportTitle: "2026년 4월 재위탁 신고서 (경동제약)",
    email: "cso@kyungdong.co.kr",
    status: "대기",
  },
];

const INITIAL_SENT: SendItem[] = [
  {
    id: "s1",
    company: "우리메디텍",
    reportTitle: "2026년 3월 재위탁 신고서 (한화제약)",
    email: "pharma@hanwha.co.kr",
    status: "발송완료",
    sentAt: "2026-04-18 14:30",
  },
  {
    id: "s2",
    company: "우리메디텍",
    reportTitle: "2026년 3월 재위탁 신고서 (동광제약)",
    email: "report@dongkwang.com",
    status: "발송완료",
    sentAt: "2026-04-15 10:20",
  },
];

function StatusBadge({ status }: { status: SendStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "대기"
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700",
      )}
    >
      {status}
    </span>
  );
}

export function SendContent() {
  const [activeTab, setActiveTab] = useState<SendTab>("pending");
  const [pendingItems, setPendingItems] = useState(INITIAL_PENDING);
  const [sentItems, setSentItems] = useState(INITIAL_SENT);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pendingCount = pendingItems.length;
  const sentCount = sentItems.length;

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

  const sendItems = (ids: string[]) => {
    if (ids.length === 0) {
      toast.error("발송할 항목을 선택해주세요.");
      return;
    }

    const now = new Date();
    const sentAt = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

    const toSend = pendingItems.filter((item) => ids.includes(item.id));
    setPendingItems((prev) => prev.filter((item) => !ids.includes(item.id)));
    setSentItems((prev) => [
      ...toSend.map((item) => ({
        ...item,
        status: "발송완료" as const,
        sentAt,
      })),
      ...prev,
    ]);
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    toast.success(`${ids.length}건 발송 완료되었습니다.`);
  };

  const displayItems = useMemo(
    () => (activeTab === "pending" ? pendingItems : sentItems),
    [activeTab, pendingItems, sentItems],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "pending"
                ? "bg-[#4f6ef7] text-white"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            발송 대기
            {pendingCount > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === "pending"
                    ? "bg-white/20"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {pendingCount}
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
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            발송 완료 내역
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                activeTab === "sent"
                  ? "bg-white/20"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {sentCount}
            </span>
          </button>
        </div>

        {activeTab === "pending" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sendItems(selectedIds)}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-[#4f6ef7] bg-white px-4 py-2.5 text-sm font-semibold text-[#4f6ef7] transition-colors hover:bg-[rgba(79,110,247,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
              선택 발송
            </button>
            <button
              type="button"
              onClick={() => sendItems(pendingItems.map((item) => item.id))}
              disabled={pendingItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mail className="size-4" />
              전체 발송
            </button>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
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
                <th className="px-5 py-3 font-medium text-slate-600">업체명</th>
                <th className="px-5 py-3 font-medium text-slate-600">신고서</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  발송 대상 이메일
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                {activeTab === "sent" && (
                  <th className="px-5 py-3 font-medium text-slate-600">
                    발송일시
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "pending" ? 5 : 5}
                    className="px-5 py-12 text-center text-sm text-slate-500"
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
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    {activeTab === "pending" && (
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="size-4 rounded border-slate-300 accent-[#4f6ef7]"
                          aria-label={`${item.reportTitle} 선택`}
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {item.company}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {item.reportTitle}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{item.email}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    {activeTab === "sent" && (
                      <td className="px-5 py-3.5 text-slate-600">
                        {item.sentAt ?? "-"}
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
