"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("올바른 이메일을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (error) {
        toast.error("메일 발송 실패: " + error.message);
        return;
      }
      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          비밀번호 찾기
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          가입한 이메일로 재설정 링크를 보내드립니다.
        </p>
      </div>

      {sent ? (
        <div className="space-y-5 text-center">
          <div className="rounded-lg bg-emerald-50 px-4 py-6 text-sm text-emerald-700">
            <b>{email}</b> 으로 재설정 메일을 보냈습니다.
            <br />
            메일의 링크를 눌러 새 비밀번호를 설정하세요.
          </div>
          <a
            href="/login"
            className="inline-block text-sm font-semibold text-[#4f6ef7] hover:underline"
          >
            로그인으로 돌아가기
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              이메일
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="가입한 이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20",
              )}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-[#4f6ef7] text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "발송 중..." : "재설정 메일 보내기"}
          </button>
          <p className="text-center text-sm">
            <a
              href="/login"
              className="font-medium text-slate-400 hover:underline"
            >
              로그인으로 돌아가기
            </a>
          </p>
        </form>
      )}
    </div>
  );
}
