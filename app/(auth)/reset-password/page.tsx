"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PW_REGEX.test(password)) {
      toast.error("비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(
          "변경 실패: " +
            error.message +
            " (메일 링크가 만료되었을 수 있습니다)",
        );
        return;
      }
      toast.success("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      await supabase.auth.signOut();
      router.push("/login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          새 비밀번호 설정
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          사용하실 새 비밀번호를 입력하세요.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            새 비밀번호
          </label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="영문+숫자 조합 6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            새 비밀번호 확인
          </label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-[#4f6ef7] text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}
