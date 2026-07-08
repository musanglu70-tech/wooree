"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const COLORS = [
  "#4f6ef7",
  "#0f766e",
  "#16a34a",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#64748b",
];

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function krw(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}
function monthRange(base = new Date()) {
  const y = base.getFullYear();
  const m = base.getMonth();
  return {
    start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    end: `${m === 11 ? y + 1 : y}-${String(m === 11 ? 1 : m + 2).padStart(2, "0")}-01`,
  };
}

interface Slice {
  name: string;
  value: number;
}

export function DashboardCharts() {
  const supabase = useMemo(() => createClient(), []);
  const [pharma, setPharma] = useState<Slice[]>([]);
  const [hospitals, setHospitals] = useState<Slice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { start, end } = monthRange();
    supabase
      .from("prescriptions")
      .select("hospital_name, pharma_companies(name), prescription_items(amount)")
      .gte("prescription_date", start)
      .lt("prescription_date", end)
      .then(({ data }) => {
        const pMap = new Map<string, number>();
        const hMap = new Map<string, number>();
        for (const r of (data as Record<string, unknown>[]) ?? []) {
          const pn =
            toStr((r.pharma_companies as { name?: string } | null)?.name) ||
            "(미지정)";
          const hn = toStr(r.hospital_name) || "(미지정)";
          const amt = (
            (r.prescription_items as Record<string, unknown>[] | null) ?? []
          ).reduce((s, it) => s + toNum(it.amount), 0);
          pMap.set(pn, (pMap.get(pn) ?? 0) + amt);
          hMap.set(hn, (hMap.get(hn) ?? 0) + amt);
        }
        const sort = (m: Map<string, number>) =>
          Array.from(m.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        const p = sort(pMap);
        const top = p.slice(0, 6);
        const rest = p.slice(6).reduce((s, x) => s + x.value, 0);
        if (rest > 0) top.push({ name: "기타", value: rest });
        setPharma(top);
        setHospitals(sort(hMap).slice(0, 5));
        setLoading(false);
      });
  }, [supabase]);

  const pharmaTotal = pharma.reduce((s, x) => s + x.value, 0) || 1;
  const hospMax = Math.max(1, ...hospitals.map((h) => h.value));

  const donut = useMemo(() => {
    let acc = 0;
    const stops = pharma.map((p, i) => {
      const start = (acc / pharmaTotal) * 100;
      acc += p.value;
      const end = (acc / pharmaTotal) * 100;
      return `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(", ") || "#e2e8f0 0% 100%"})`;
  }, [pharma, pharmaTotal]);

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 제약사별 매출 비중 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          제약사별 매출 비중
        </h2>
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            불러오는 중...
          </p>
        ) : pharma.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            이번 달 데이터 없음
          </p>
        ) : (
          <div className="flex items-center gap-5">
            <div
              className="relative size-40 shrink-0 rounded-full"
              style={{ background: donut }}
            >
              <div className="absolute inset-[22%] rounded-full bg-white" />
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
              {pharma.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {p.name}
                  </span>
                  <span className="shrink-0 font-medium text-slate-400">
                    {((p.value / pharmaTotal) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 거래처별 실적 순위 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          거래처별 실적 순위 TOP 5
        </h2>
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            불러오는 중...
          </p>
        ) : hospitals.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            이번 달 데이터 없음
          </p>
        ) : (
          <ul className="space-y-3">
            {hospitals.map((h, i) => (
              <li key={h.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="min-w-0 truncate pr-2 text-slate-600">
                    {i + 1}. {h.name}
                  </span>
                  <span className="shrink-0 font-medium text-slate-500">
                    {krw(h.value)}원
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#4f6ef7]"
                    style={{ width: `${(h.value / hospMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
