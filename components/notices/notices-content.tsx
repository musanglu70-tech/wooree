"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, PenLine, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type NoticeTab = "unread" | "read";

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  isConfirmed: boolean;
}

interface NoticeForm {
  title: string;
  content: string;
  category: string;
}

const EMPTY_FORM: NoticeForm = { title: "", content: "", category: "일반" };

const CATEGORIES = ["일반", "정산", "EDI", "제약사", "재위탁", "시스템"];

const inputClassName =
  "w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 py-2 text-sm text-[#2c1f0e] outline-none transition-colors placeholder:text-[#b5a080] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRow(row: Record<string, unknown>): Notice {
  return {
    id: toStr(row.id),
    title: toStr(row.title),
    content: toStr(row.content ?? row.body),
    category: toStr(row.category ?? row.type),
    createdAt: toStr(row.created_at).slice(0, 16).replace("T", " "),
    isConfirmed: Boolean(row.is_confirmed ?? row.is_read),
  };
}

export function NoticesContent() {
  const supabase = useMemo(() => createClient(), []);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NoticeTab>("unread");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<NoticeForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadNotices = useMemo(
    () => async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("공지를 불러오지 못했습니다: " + error.message);
        setNotices([]);
      } else {
        setNotices(
          ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
        );
      }
      setIsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const filteredNotices = useMemo(() => {
    return notices.filter((n) =>
      activeTab === "unread" ? !n.isConfirmed : n.isConfirmed,
    );
  }, [notices, activeTab]);

  const unreadCount = notices.filter((n) => !n.isConfirmed).length;

  const handleConfirm = async (notice: Notice) => {
    const { error } = await supabase
      .from("notices")
      .update({ is_confirmed: true })
      .eq("id", notice.id);

    if (error) {
      toast.error("확인 처리 실패: " + error.message);
      return;
    }

    setNotices((prev) =>
      prev.map((n) => (n.id === notice.id ? { ...n, isConfirmed: true } : n)),
    );
    toast.success("확인 처리되었습니다.");
  };

  const markAllConfirmed = async () => {
    if (unreadCount === 0) {
      toast.info("미확인 공지가 없습니다.");
      return;
    }

    const { error } = await supabase
      .from("notices")
      .update({ is_confirmed: true })
      .eq("is_confirmed", false);

    if (error) {
      toast.error("전체 확인 처리 실패: " + error.message);
      return;
    }

    setNotices((prev) => prev.map((n) => ({ ...n, isConfirmed: true })));
    toast.success("모든 공지를 확인 처리했습니다.");
  };

  const deleteAll = async () => {
    if (notices.length === 0) {
      toast.info("삭제할 공지가 없습니다.");
      return;
    }
    if (
      !window.confirm(
        `전체 공지 ${notices.length}건을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("notices")
      .delete()
      .not("id", "is", null);

    if (error) {
      toast.error("전체 삭제 실패: " + error.message);
      return;
    }

    setNotices([]);
    toast.success("전체 공지를 삭제했습니다.");
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!form.content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("notices").insert({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_confirmed: false,
      });

      if (error) {
        toast.error("공지 등록 실패: " + error.message);
        return;
      }

      toast.success("공지가 등록되었습니다.");
      setIsModalOpen(false);
      setActiveTab("unread");
      await loadNotices();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("unread")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "unread"
                ? "bg-[#4f6ef7] text-white"
                : "text-[#7a5c2e] hover:bg-[#f5ede0]",
            )}
          >
            미확인
            {unreadCount > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === "unread"
                    ? "bg-[#fdf8f0]/20 text-white"
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
                : "text-[#7a5c2e] hover:bg-[#f5ede0]",
            )}
          >
            확인
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllConfirmed}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 py-2 text-sm font-medium text-[#5a3e1b] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
          >
            <CheckCheck className="size-4" />
            전체 확인
          </button>
          <button
            type="button"
            onClick={deleteAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
            전체 삭제
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
          >
            <PenLine className="size-4" />
            공지 작성
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">구분</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">제목</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">내용</th>
                <th className="px-5 py-3 font-medium text-[#7a5c2e]">등록일</th>
                <th className="px-5 py-3 text-center font-medium text-[#7a5c2e]">
                  처리
                </th>
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
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[#9a7c4e]"
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
                      "border-b border-[#f0e4d0] last:border-b-0",
                      index % 2 === 1 && "bg-[#f5ede0]/40",
                      !notice.isConfirmed && "bg-[rgba(79,110,247,0.03)]",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-[#eee3cc] px-2.5 py-0.5 text-xs font-medium text-[#7a5c2e]">
                        {notice.category || "일반"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#2c1f0e]">
                      {!notice.isConfirmed && (
                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#4f6ef7]" />
                      )}
                      {notice.title}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-[#7a5c2e]">
                      {notice.content}
                    </td>
                    <td className="px-5 py-3.5 text-[#7a5c2e]">
                      {notice.createdAt || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {notice.isConfirmed ? (
                        <span className="text-xs text-[#b5a080]">확인됨</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirm(notice)}
                          className="rounded-lg border border-[#e8d9bc] px-2.5 py-1.5 text-xs font-medium text-[#5a3e1b] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          확인
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 공지 작성 모달 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#fdf8f0] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#2c1f0e]">
                공지 작성
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex size-8 items-center justify-center rounded-lg text-[#b5a080] transition-colors hover:bg-[#eee3cc] hover:text-[#7a5c2e]"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
                  구분
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={inputClassName}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="공지 제목"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  placeholder="공지 내용"
                  rows={4}
                  className={cn(inputClassName, "resize-none")}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-4 text-sm font-medium text-[#5a3e1b] transition-colors hover:border-slate-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
