import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_DASHBOARD_STATS,
  type VDashboardStats,
} from "@/types/dashboard";

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeStats(row: Record<string, unknown>): VDashboardStats {
  return {
    unread_notices: toNumber(
      row.unread_notices ?? row.unread_alerts ?? row.unread,
    ),
    confirmed_notices: toNumber(
      row.confirmed_notices ?? row.confirmed_alerts ?? row.confirmed,
    ),
    registered_hospitals: toNumber(
      row.registered_hospitals ?? row.hospital_count ?? row.clinics,
    ),
    registered_pharma: toNumber(
      row.registered_pharma ?? row.pharma_count ?? row.pharma,
    ),
    total_edi_count: toNumber(row.total_edi_count ?? row.total_edi),
    monthly_edi_count: toNumber(
      row.monthly_edi_count ?? row.month_edi_count ?? row.month_edi,
    ),
  };
}

export async function getDashboardStats(): Promise<VDashboardStats> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("v_dashboard_stats")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[getDashboardStats]", error.message);
    return DEFAULT_DASHBOARD_STATS;
  }

  if (!data) {
    return DEFAULT_DASHBOARD_STATS;
  }

  return normalizeStats(data as Record<string, unknown>);
}
