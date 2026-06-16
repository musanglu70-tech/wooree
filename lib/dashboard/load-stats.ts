import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_DASHBOARD_STATS,
  type VDashboardStats,
} from "@/types/dashboard";

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function currentMonthRange(): { start: string; end: string } {
  const month = new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
  return { start, end };
}

export function normalizeDashboardStats(
  row: Record<string, unknown>,
  confirmedNotices = 0,
): VDashboardStats {
  return {
    unread_notices: toNumber(row.unconfirmed_notices ?? row.unread_notices),
    confirmed_notices: toNumber(row.confirmed_notices ?? confirmedNotices),
    registered_hospitals: toNumber(row.registered_hospitals),
    registered_pharma: toNumber(row.registered_pharma),
    total_edi_count: toNumber(row.total_edi_count),
    monthly_edi_count: toNumber(row.this_month_edi ?? row.monthly_edi_count),
    monthly_edi_amount: toNumber(
      row.this_month_edi_amount ?? row.monthly_edi_amount,
    ),
    unsettled_count: toNumber(row.unsettled_count),
  };
}

async function loadStatsFallback(
  supabase: SupabaseClient,
  confirmedNotices: number,
): Promise<VDashboardStats> {
  const { start, end } = currentMonthRange();

  const [
    unreadRes,
    hospitalsRes,
    pharmaRes,
    totalRes,
    monthRes,
    unsettledRes,
  ] = await Promise.all([
    supabase
      .from("notices")
      .select("*", { count: "exact", head: true })
      .eq("is_confirmed", false),
    supabase.from("prescriptions").select("hospital_name"),
    supabase.from("pharma_companies").select("*", { count: "exact", head: true }),
    supabase.from("prescriptions").select("*", { count: "exact", head: true }),
    supabase
      .from("prescriptions")
      .select("id, prescription_items(amount)")
      .gte("prescription_date", start)
      .lt("prescription_date", end),
    supabase
      .from("prescriptions")
      .select("*", { count: "exact", head: true })
      .or("settlement_date.is.null,status.eq.saved"),
  ]);

  const hospitals = new Set(
    ((hospitalsRes.data as { hospital_name?: string }[]) ?? [])
      .map((row) => row.hospital_name?.trim())
      .filter(Boolean),
  );

  const monthRows = (monthRes.data as Record<string, unknown>[]) ?? [];
  let monthlyAmount = 0;
  for (const row of monthRows) {
    const items = row.prescription_items as { amount?: number }[] | null;
    if (items?.length) {
      monthlyAmount += items.reduce(
        (sum, item) => sum + toNumber(item.amount),
        0,
      );
    }
  }

  return {
    unread_notices: unreadRes.count ?? 0,
    confirmed_notices: confirmedNotices,
    registered_hospitals: hospitals.size,
    registered_pharma: pharmaRes.count ?? 0,
    total_edi_count: totalRes.count ?? 0,
    monthly_edi_count: monthRows.length,
    monthly_edi_amount: monthlyAmount,
    unsettled_count: unsettledRes.count ?? 0,
  };
}

export async function fetchDashboardStats(
  supabase: SupabaseClient,
): Promise<VDashboardStats> {
  const confirmedRes = await supabase
    .from("notices")
    .select("*", { count: "exact", head: true })
    .eq("is_confirmed", true);

  const confirmedCount = confirmedRes.count ?? 0;

  const { data, error } = await supabase
    .from("v_dashboard_stats")
    .select("*")
    .maybeSingle();

  if (!error && data) {
    return normalizeDashboardStats(
      data as Record<string, unknown>,
      confirmedCount,
    );
  }

  if (error) {
    console.warn("[dashboard] v_dashboard_stats fallback:", error.message);
  }

  try {
    return await loadStatsFallback(supabase, confirmedCount);
  } catch {
    return { ...DEFAULT_DASHBOARD_STATS, confirmed_notices: confirmedCount };
  }
}
