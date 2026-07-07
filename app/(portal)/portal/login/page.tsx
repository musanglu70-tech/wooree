"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import {
  formatBusinessNumber,
  isValidBusinessNumber,
  partnerEmail,
} from "@/lib/partner/auth";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

export default function PortalLoginPage() {
  const router = useRouter();
  const [businessNumber, setBusinessNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidBusinessNumber(businessNumber)) {
      toast.error("사업자번호 10자리를 정확히 입력해주세요.");
      return;
    }
    if (!password) {
      toast.error("비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: partnerEmail(businessNumber),
        password,
      });

      if (error) {
        toast.error("로그인 실패. 사업자번호와 비밀번호를 확인해주세요.");
        return;
      }

      router.push("/portal/home");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#e6f4f1] text-[#0f766e]">
            <FileSpreadsheet className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            CSO 정산서 포털
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            사업자번호와 비밀번호로 로그인하세요
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              사업자번호
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000-00-00000"
              value={businessNumber}
              onChange={(e) =>
                setBusinessNumber(formatBusinessNumber(e.target.value))
              }
              className={cn(inputClass, "border-slate-200")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              비밀번호
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, "border-slate-200")}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-[#0f766e] text-sm font-semibold text-white transition-colors hover:bg-[#0e6b63] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link
            href="/portal/register"
            className="font-semibold text-[#0f766e] hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
