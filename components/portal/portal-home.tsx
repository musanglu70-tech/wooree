"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Package, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import {
  aggregateByMonth,
  krw,
  loadPartnerLines,
  type PartnerLine,
} from "@/lib/partner/settlement";

const DONUT_COLORS = [
  "#0f766e",
  "#2563eb",
  "#16a34a",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#64748b",
];

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <p className="mt-3">
        <span className="text-3xl font-bold" style={{ color: accent }}>
          {value}
        </span>
        <span className="ml-1 text-sm text-slate-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

export function PortalHome() {
  const supabase = useMemo(() => createClient(), []);
  const [lines, setLines] = useState<PartnerLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerLines(supabase)
      .then(setLines)
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [supabase]);

  const monthly = useMemo(() => aggregateByMonth(lines), [lines]);
  const latestMonth = monthly[0]?.month ?? "";
  const latestLines = useMemo(
    () => lines.filter((l) => l.settlementMonth === latestMonth),
    [lines, latestMonth],
  );

  const commissionTotal = latestLines.reduce((s, l) => s + l.commission, 0);
  const amountTotal = latestLines.reduce((s, l) => s + l.amount, 0);
  const hospitalCount = new Set(latestLines.map((l) => l.hospitalName)).size;
  const productCount = new Set(latestLines.map((l) => l.productName)).size;
  const metricByCommission = commissionTotal > 0;
  const metricLabel = metricByCommission ? "수수료" : "처방액";
  const metric = (l: PartnerLine) =>
    metricByCommission ? l.commission : l.amount;

  const trend = useMemo(
    () =>
      monthly
        .slice(0, 12)
        .reverse()
        .map((m) => ({
          month: m.month.slice(5) + "월",
          value: metricByCommission ? m.commission : m.amount,
        })),
    [monthly, metricByCommission],
  );
  const trendMax = Math.max(1, ...trend.map((t) => t.value));

  const productRatio = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of latestLines)
      map.set(l.productName, (map.get(l.productName) ?? 0) + metric(l));
    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const top = arr.slice(0, 6);
    const rest = arr.slice(6).reduce((s, x) => s + x.value, 0);
    if (rest > 0) top.push({ name: "기타", value: rest });
    return top;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestLines, metricByCommission]);
  const ratioTotal = productRatio.reduce((s, x) => s + x.value, 0) || 1;

  const donutGradient = useMemo(() => {
    let acc = 0;
    const stops: string[] = [];
    productRatio.forEach((p, i) => {
      const start = (acc / ratioTotal) * 100;
      acc += p.value;
      const end = (acc / ratioTotal) * 100;
      stops.push(
        `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${end}%`,
      );
    });
    return `conic-gradient(${stops.join(", ") || "#e2e8f0 0% 100%"})`;
  }, [productRatio, ratioTotal]);

  const topHospitals = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of latestLines)
      map.set(l.hospitalName, (map.get(l.hospitalName) ?? 0) + metric(l));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestLines, metricByCommission]);
  const hospMax = Math.max(1, ...topHospitals.map((h) => h.value));

  const monthLabel = latestMonth
    ? `${latestMonth.slice(0, 4)}년 ${latestMonth.slice(5)}월`
    : "-";

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-slate-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">연간 정산 현황</h1>
        <p className="mt-1 text-sm text-slate-500">최신 정산월: {monthLabel}</p>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          아직 등록된 정산 내역이 없습니다.
          <br />
          관리자가 EDI 정산 데이터를 연결하면 이곳에 표시됩니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Wallet className="size-4" />}
              label={metricLabel}
              value={krw(metricByCommission ? commissionTotal : amountTotal)}
              unit="원"
              sub={monthLabel}
              accent="#0f766e"
            />
            <StatCard
              icon={<Building2 className="size-4" />}
              label="거래처 수"
              value={String(hospitalCount)}
              unit="곳"
              sub={monthLabel}
              accent="#2563eb"
            />
            <StatCard
              icon={<Package className="size-4" />}
              label="제품 수"
              value={String(productCount)}
              unit="종"
              sub={monthLabel}
              accent="#7c3aed"
            />
          </div>

          {/* 월별 추이 (CSS 막대) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-slate-900">
              월별 추이
            </h2>
            <div className="flex h-56 items-end gap-2">
              {trend.map((t) => (
                <div
                  key={t.month}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-[#0f766e] transition-all"
                      style={{
                        height: `${Math.max(2, (t.value / trendMax) * 100)}%`,
                      }}
                      title={`${krw(t.value)}원`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">{t.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 제품별 비중 (CSS 도넛) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                제품별 {metricLabel} 비중
              </h2>
              <div className="flex items-center gap-5">
                <div
                  className="relative size-40 shrink-0 rounded-full"
                  style={{ background: donutGradient }}
                >
                  <div className="absolute inset-[22%] rounded-full bg-white" />
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                  {productRatio.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-600">
                        {p.name || "-"}
                      </span>
                      <span className="shrink-0 font-medium text-slate-400">
                        {((p.value / ratioTotal) * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 거래처 TOP5 (CSS 막대) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                거래처 TOP 5
              </h2>
              <ul className="space-y-3">
                {topHospitals.map((h) => (
                  <li key={h.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="min-w-0 truncate pr-2 text-slate-600">
                        {h.name || "-"}
                      </span>
                      <span className="shrink-0 font-medium text-slate-500">
                        {krw(h.value)}원
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0f766e]"
                        style={{ width: `${(h.value / hospMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
