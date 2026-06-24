"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettlementEmailTarget {
  id: string;
  fileName: string;
  pharma: string;
  month: string;
}

interface SendEmailModalProps {
  open: boolean;
  target: SettlementEmailTarget | null;
  isSending: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-3 text-sm text-[#0f172a] outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function formatMonthLabel(month: string) {
  if (!month) return "-";
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

export function SendEmailModal({
  open,
  target,
  isSending,
  onClose,
  onSubmit,
}: SendEmailModalProps) {
  const [email, setEmail] = useState("woorimedi2018@gmail.com");

  useEffect(() => {
    if (open) setEmail("woorimedi2018@gmail.com");
  }, [open, target?.id]);

  if (!open || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#ffffff] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
            <Mail className="size-4 text-[#4f6ef7]" />
            이메일 발송
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="flex size-8 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#e2e8f0] hover:text-[#475569]"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm">
          <p className="font-medium text-[#0f172a]">{target.pharma}</p>
          <p className="mt-1 text-[#475569]">
            {formatMonthLabel(target.month)} · {target.fileName}
          </p>
          <p className="mt-2 text-xs text-[#64748b]">
            본문에 제약사명, 정산월, 총금액, 수수료율, 수수료금액이 포함됩니다.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#475569]">
            수신 이메일 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            disabled={isSending}
            className={inputClassName}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) onSubmit(email.trim());
            }}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSubmit(email.trim())}
            disabled={isSending || !email.trim()}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            {isSending ? "발송 중..." : "발송"}
          </button>
        </div>
      </div>
    </div>
  );
}
