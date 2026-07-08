"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function monthRange(base = new Date()) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const end = `${m === 11 ? y + 1 : y}-${String(m === 11 ? 1 : m + 2).padStart(2, "0")}-01`;
  return { start, end };
}

export function UnfiledHospitalsCard() {
  const supabase = useMemo(() => createClient(), []);
  const [allHospitals, setAllHospitals] = useState<string[]>([]);
  const [filedHospitals, setFiledHospitals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { start, end } = monthRange();
    Promise.all([
      supabase.from("hospitals").select("name"),
      supabase
        .from("prescriptions")
        .select("hospital_name")
        .gte("prescription_date", start)
        .lt("prescription_date", end),
    ])
      .then(([h, p]) => {
        const names = ((h.data as Record<string, unknown>[]) ?? [])
          .map((r) => toStr(r.name))
          .filter(Boolean);
        setAllHospitals(Array.from(new Set(names)));
        const filed = new Set(
          ((p.data as Record<string, unknown>[]) ?? [])
            .map((r) => toStr(r.hospital_name))
            .filter(Boolean),
        );
        setFiledHospitals(filed);
      })
      .finally(() => setLoading(false));
  }, [supabase]);

  const unfiled = useMemo(
    () => allHospitals.filter((n) => !filedHospitals.has(n)).sort(),
    [allHospitals, filedHospitals],
  );

  const now = new Date();
  const monthLabel = `${now.getMonth() + 1}월`;

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <AlertCircle className="size-4 text-amber-500" />
            병의원별 미입력 현황
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {monthLabel} 처방 EDI가 아직 등록되지 않은 거래처
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-600">
            {loading ? "-" : unfiled.length}
            <span className="ml-1 text-sm font-medium text-slate-400">곳</span>
          </p>
          <p className="text-xs text-slate-400">
            전체 {allHospitals.length}곳 중
          </p>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            불러오는 중...
          </p>
        ) : unfiled.length === 0 ? (
          <p className="py-8 text-center text-sm text-emerald-600">
            ✓ 모든 거래처가 이번 달 EDI를 입력했습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {unfiled.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-slate-700"
              >
                <Building2 className="size-3.5 shrink-0 text-amber-400" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
