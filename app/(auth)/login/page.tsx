"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/browser";
import {
  normalizeBusinessNumber,
  partnerEmail,
} from "@/lib/partner/auth";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    const supabase = createClient();

    // 입력값이 숫자 10자리면 사업자번호(파트너) 로그인으로 처리
    const raw = data.email.trim();
    const digits = normalizeBusinessNumber(raw);
    const isBizNo = !raw.includes("@") && digits.length === 10;
    const loginEmail = isBizNo ? partnerEmail(digits) : raw;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: data.password,
    });

    if (error) {
      toast.error("로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
      return;
    }

    const role = (
      authData.user?.user_metadata as { role?: string } | undefined
    )?.role;

    router.push(role === "partner" ? "/portal/home" : "/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          CSO(주)우리메디텍
        </h1>
        <p className="mt-2 text-sm text-slate-500">EDI 관리 시스템</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-slate-700"
          >
            아이디 / 사업자번호
          </label>
          <input
            id="email"
            type="text"
            autoComplete="username"
            placeholder="이메일 또는 사업자번호(숫자 10자리)"
            className={cn(
              "h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20",
              errors.email ? "border-red-400" : "border-slate-200",
            )}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-700"
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            className={cn(
              "h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20",
              errors.password ? "border-red-400" : "border-slate-200",
            )}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-[#4f6ef7] text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm">
        <a
          href="/forgot-password"
          className="font-medium text-[#4f6ef7] hover:underline"
        >
          비밀번호를 잊으셨나요?
        </a>
      </p>
      <p className="mt-3 text-center text-sm text-slate-500">
        계정이 없으신가요?{" "}
        <a
          href="/portal/register"
          className="font-semibold text-[#4f6ef7] hover:underline"
        >
          회원가입
        </a>
      </p>
    </div>
  );
}
