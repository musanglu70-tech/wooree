"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { useUserProfile } from "@/hooks/use-user-profile";

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}

/** 본사 관리자 전용 — 테넌트(CSO 업체) 전환 셀렉터 */
export function TenantSwitcher() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { isAdmin, isLoading } = useUserProfile();

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [active, setActive] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading || !isAdmin) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: comps }, { data: prof }] = await Promise.all([
        supabase.from("companies").select("id, name").order("name"),
        user
          ? supabase
              .from("profiles")
              .select("active_tenant_id")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setCompanies(
        ((comps as Record<string, unknown>[]) ?? []).map((r) => ({
          id: toStr(r.id),
          name: toStr(r.name),
        })),
      );
      setActive(
        toStr((prof as { active_tenant_id?: string } | null)?.active_tenant_id),
      );
    })();
  }, [isLoading, isAdmin, supabase]);

  if (isLoading || !isAdmin) return null;

  const onChange = async (value: string) => {
    setSaving(true);
    setActive(value);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ active_tenant_id: value || null })
        .eq("id", user.id);
      if (error) {
        toast.error("전환 실패: " + error.message);
        return;
      }
      toast.success(
        value
          ? `${companies.find((c) => c.id === value)?.name ?? "업체"} 컨텍스트로 전환`
          : "전체 보기로 전환",
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-2 py-2" style={{ borderBottom: "1px solid #1e1b2e" }}>
      <label
        className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold"
        style={{ color: "#64748b" }}
      >
        <Building2 className="size-3" />
        테넌트 전환
      </label>
      <select
        value={active}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-2 py-1.5 text-[12px] font-medium outline-none disabled:opacity-50"
        style={{
          background: "#1a1826",
          color: "#e2e8f0",
          border: "1px solid #2a2740",
        }}
      >
        <option value="">전체 보기 (본사)</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
