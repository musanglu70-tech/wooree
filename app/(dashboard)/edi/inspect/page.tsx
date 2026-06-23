"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { FileCheck, Loader2 } from "lucide-react";

export default function EdiInspectPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [hasNone, setHasNone] = useState(false);

  useEffect(() => {
    supabase
      .from("prescriptions")
      .select("id")
      .eq("status", "saved")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.id) {
          router.replace(`/edi/inspect/${data[0].id}`);
        } else {
          setHasNone(true);
        }
      });
  }, [supabase, router]);

  if (hasNone) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-slate-500">
        <FileCheck className="size-16 text-slate-300" />
        <p className="text-lg font-medium">검수 대기 중인 처방이 없습니다</p>
        <button
          onClick={() => router.push("/edi/new")}
          className="rounded-lg bg-[#4f6ef7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d5ce5]"
        >
          신규 입력하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-slate-400" />
    </div>
  );
}
