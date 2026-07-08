"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/use-user-profile";

export function GmailImportButton() {
  const router = useRouter();
  const { isAdmin, isLoading } = useUserProfile();
  const [running, setRunning] = useState(false);

  if (isLoading || !isAdmin) return null;

  const run = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/run-import", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "실행 실패");
        return;
      }
      toast.success(body.message ?? "완료");
      router.refresh();
    } catch (e) {
      toast.error("요청 실패: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={running}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:opacity-60"
    >
      {running ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MailCheck className="size-4" />
      )}
      {running ? "수집 중..." : "Gmail 자동수집 실행"}
    </button>
  );
}
