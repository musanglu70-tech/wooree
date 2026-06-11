"use client";

import { useMemo, useState } from "react";
import { CheckCheck, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NoticeTab = "unread" | "read";

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  isRead: boolean;
}

const INITIAL_NOTICES: Notice[] = [
  {
    id: "1",
    title: "6월 정산 일정 안내",
    content: "6월 정산 마감일은 6월 20일입니다. 기한 내 제출 부탁드립니다.",
    category: "정산",
    createdAt: "2026-06-08 09:30",
    isRead: false,
  },
  {
    id: "2",
    title: "EDI 입력 양식 업데이트",
    content: "신규 EDI 엑셀 양식이 업데이트되었습니다. 양식 다운로드 후 사용해주세요.",
    category: "EDI",
    createdAt: "2026-06-07 14:15",
    isRead: false,
  },
  {
    id: "3",
    title: "시스템 점검 안내",
    content: "6월 10일 02:00~04:00 시스템 점검이 예정되어 있습니다.",
    category: "시스템",
    createdAt: "2026-06-06 11:00",
    isRead: false,
  },
  {
    id: "4",
    title: "위더스제약 단가 변경 공지",
    content: "위더스제약 3개 품목의 단가가 6월 1일부터 변경됩니다.",
    category: "제약사",
    createdAt: "2026-06-05 16:40",
    isRead: true,
  },
  {
    id: "5",
    title: "재위탁 신고 마감 안내",
    content: "5월분 재위탁 신고 마감일이 6월 15일입니다.",
    category: "재위탁",
    createdAt: "2026-06-04 10:20",
    isRead: true,
  },
  {
    id: "6",
    title: "신규 제약사 등록",
    content: "건일바이오팜주식회사가 신규 등록되었습니다.",
    category: "제약사",
    createdAt: "2026-06-03 09:00",
    isRead: true,
  },
  {
    id: "7",
    title: "OCR 기능 개선 안내",
    content: "OCR 인식 정확도가 개선되었습니다.",
    category: "시스템",
    createdAt: "2026-06-01 13:30",
    isRead: true,
  },
];

export function NoticesContent() {
  const [notices, setNotices] = useState(INITIAL_NOTICES);
  const [activeTab, setActiveTab] = useState<NoticeTab>("unread");

  const filteredNotices = useMemo(() => {
    return notices.filter((n) =>
      activeTab === "unread" ? !n.isRead : n.isRead,
    );
  }, [notices, activeTab]);

  const unreadCount = notices.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setNotices((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("모든 공지를 확인 처리했습니다.");
  };

  const deleteAll = () => {
    setNotices((prev) =>
      activeTab === "unread"
        ? prev.filter((n) => n.isRead)
        : [],
    );
    toast.success(
      activeTab === "unread"
        ? "미확인 공지를 모두 삭제했습니다."
        : "확인한 공지를 모두 삭제했습니다.",
    );
  };

  const toggleRead = (id: string) => {
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n)),
    );
  };

  const handleCreate = () => {
    toast.info("공지 작성 기능은 준비 중입니다.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("unread")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "unread"
                ? "bg-[#4f6ef7] text-white"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            미확인
            {unreadCount > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === "unread"
                    ? "bg-white/20 text-white"
                    : "bg-red-100 text-red-600",
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("read")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "read"
                ? "bg-[#4f6ef7] text-white"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            확인
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
          >
            <CheckCheck className="size-4" />
            전체 확인
          </button>
          <button
            type="button"
            onClick={deleteAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
            전체 삭제
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
          >
            <PenLine className="size-4" />
            공지 작성
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">구분</th>
                <th className="px-5 py-3 font-medium text-slate-600">제목</th>
                <th className="px-5 py-3 font-medium text-slate-600">내용</th>
                <th className="px-5 py-3 font-medium text-slate-600">등록일</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  처리
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredNotices.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    {activeTab === "unread"
                      ? "미확인 공지가 없습니다."
                      : "확인한 공지가 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredNotices.map((notice, index) => (
                  <tr
                    key={notice.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                      !notice.isRead && "bg-[rgba(79,110,247,0.03)]",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {notice.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {!notice.isRead && (
                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#4f6ef7]" />
                      )}
                      {notice.title}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-slate-600">
                      {notice.content}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {notice.createdAt}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleRead(notice.id)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                      >
                        {notice.isRead ? "미확인으로" : "확인"}
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
