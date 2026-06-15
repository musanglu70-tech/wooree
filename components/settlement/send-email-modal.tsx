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
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

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
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) setEmail("");
  }, [open, target?.id]);

  if (!open || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Mail className="size-4 text-[#4f6ef7]" />
            이메일 발송
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="font-medium text-slate-900">{target.pharma}</p>
          <p className="mt-1 text-slate-600">
            {formatMonthLabel(target.month)} · {target.fileName}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            본문에 제약사명, 정산월, 총금액, 수수료율, 수수료금액이 포함됩니다.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">
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
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
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
