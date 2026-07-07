"use client";

import { useRouter } from "next/navigation";
import { Clock, LogOut, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function PortalStatusScreen({
  status,
  companyName,
}: {
  status: string;
  companyName: string;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  };

  const rejected = status === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl ${
            rejected
              ? "bg-red-50 text-red-500"
              : "bg-amber-50 text-amber-500"
          }`}
        >
          {rejected ? (
            <XCircle className="size-7" />
          ) : (
            <Clock className="size-7" />
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900">
          {rejected ? "가입이 반려되었습니다" : "승인 대기 중입니다"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {rejected ? (
            <>
              {companyName ? `${companyName} 님의 ` : ""}가입 신청이 반려되었습니다.
              <br />
              자세한 사항은 관리자에게 문의해주세요.
            </>
          ) : (
            <>
              {companyName ? `${companyName} 님의 ` : ""}회원가입이 접수되었습니다.
              <br />
              관리자 승인 후 정산 내역을 확인하실 수 있습니다.
            </>
          )}
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <LogOut className="size-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
