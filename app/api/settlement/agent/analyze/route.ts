import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  analyzeSettlement,
  type AnalysisInputRow,
} from "@/lib/settlement/claude-analysis";
import { monthToDate } from "@/lib/settlement/agent-compare";

export const maxDuration = 60;

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** POST /api/settlement/agent/analyze — 해당 월 정산 대조결과 Claude 이상 분석 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { month?: string };
    const month = body.month?.trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { message: "정산월(YYYY-MM)이 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("settlement_results")
      .select(
        "company_name, condition_type, commission_rate, edi_amount, settlement_amount, expected_commission, difference_amount, match_status, pharma_companies(name)",
      )
      .eq("settlement_month", monthToDate(month));

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const rows: AnalysisInputRow[] = (
      (data as Record<string, unknown>[]) ?? []
    ).map((r) => ({
      pharmaName:
        toStr((r.pharma_companies as { name?: string } | null)?.name) ||
        toStr(r.company_name),
      companyName: toStr(r.company_name),
      conditionType: toStr(r.condition_type),
      commissionRate: toNum(r.commission_rate),
      ediAmount: toNum(r.edi_amount),
      settlementAmount: toNum(r.settlement_amount),
      expectedCommission: toNum(r.expected_commission),
      differenceAmount: toNum(r.difference_amount),
      matchStatus: toStr(r.match_status),
    }));

    if (rows.length === 0) {
      return NextResponse.json({
        message: "해당 월의 정산 대조 결과가 없습니다. 먼저 정산 실행을 해주세요.",
        result: { summary: "", flags: [] },
      });
    }

    const result = await analyzeSettlement(rows);
    return NextResponse.json({ result });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.";
    console.error("[settlement/analyze] error:", details);
    return NextResponse.json({ message: details }, { status: 500 });
  }
}
