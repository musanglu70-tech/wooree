import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildCompareRow,
  monthRange,
  monthToDate,
  pickSettlementAmount,
  sumEdiAmount,
} from "@/lib/settlement/agent-compare";
import type {
  SettlementCompareResult,
  SettlementCompareSummary,
  SettlementConditionType,
} from "@/types/settlement-agent";
import { conditionTypeLabel } from "@/types/settlement-agent";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

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
    const { start, end } = monthRange(month);
    const settlementMonth = monthToDate(month);

    const { data: conditions, error: conditionsError } = await supabase
      .from("settlement_agent_conditions")
      .select("*, pharma_companies(name)")
      .eq("is_active", true);

    if (conditionsError) {
      return NextResponse.json(
        { message: conditionsError.message },
        { status: 500 },
      );
    }

    const activeConditions = (conditions as Record<string, unknown>[]) ?? [];
    if (!activeConditions.length) {
      return NextResponse.json(
        { message: "활성화된 정산 조건이 없습니다." },
        { status: 400 },
      );
    }

    await supabase
      .from("settlement_results")
      .delete()
      .eq("settlement_month", settlementMonth);

    const results: SettlementCompareResult[] = [];
    const inserts: Record<string, unknown>[] = [];

    for (const row of activeConditions) {
      const conditionId = toStr(row.id);
      const pharmaCompanyId = toStr(row.pharma_company_id);
      const companyName = toStr(row.company_name);
      const conditionType = toStr(
        row.condition_type,
      ) as SettlementConditionType;
      const commissionRate = toNumber(row.commission_rate);
      const pharma = row.pharma_companies as { name?: string } | null;
      const pharmaName = toStr(pharma?.name);

      const { data: prescriptions, error: rxError } = await supabase
        .from("prescriptions")
        .select("id, prescription_items(*)")
        .eq("pharma_company_id", pharmaCompanyId)
        .gte("prescription_date", start)
        .lt("prescription_date", end);

      if (rxError) {
        return NextResponse.json({ message: rxError.message }, { status: 500 });
      }

      const items = ((prescriptions as Record<string, unknown>[]) ?? []).flatMap(
        (rx) =>
          (rx.prescription_items as Record<string, unknown>[]) ?? [],
      );

      const ediAmount = sumEdiAmount(
        items as Parameters<typeof sumEdiAmount>[0],
        conditionType,
      );

      const { data: settlementFiles, error: fileError } = await supabase
        .from("settlement_files")
        .select("id, total_amount, uploaded_at")
        .eq("pharma_company_id", pharmaCompanyId)
        .eq("settlement_month", settlementMonth)
        .order("uploaded_at", { ascending: false });

      if (fileError) {
        return NextResponse.json({ message: fileError.message }, { status: 500 });
      }

      const { amount: settlementAmount, fileId } = pickSettlementAmount(
        ((settlementFiles as Record<string, unknown>[]) ?? []).map((file) => ({
          id: toStr(file.id),
          total_amount:
            file.total_amount == null || file.total_amount === ""
              ? null
              : toNumber(file.total_amount),
        })),
      );

      const { expectedCommission, differenceAmount, matchStatus } =
        buildCompareRow({ ediAmount, settlementAmount, commissionRate });

      const comparedAt = new Date().toISOString();

      inserts.push({
        condition_id: conditionId,
        settlement_month: settlementMonth,
        company_name: companyName,
        pharma_company_id: pharmaCompanyId,
        condition_type: conditionType,
        commission_rate: commissionRate,
        edi_amount: ediAmount,
        settlement_amount: settlementAmount,
        expected_commission: expectedCommission,
        difference_amount: differenceAmount,
        match_status: matchStatus,
        settlement_file_id: fileId,
        compared_at: comparedAt,
      });

      results.push({
        id: conditionId,
        conditionId,
        companyName,
        pharmaName,
        conditionType,
        commissionRate,
        ediAmount,
        settlementAmount,
        expectedCommission,
        differenceAmount,
        matchStatus,
        comparedAt,
      });
    }

    if (inserts.length) {
      const { error: insertError } = await supabase
        .from("settlement_results")
        .insert(inserts);

      if (insertError) {
        return NextResponse.json({ message: insertError.message }, { status: 500 });
      }
    }

    const summary: SettlementCompareSummary = {
      total: results.length,
      matched: results.filter((row) => row.matchStatus === "matched").length,
      mismatch: results.filter((row) => row.matchStatus === "mismatch").length,
      pending: results.filter((row) => row.matchStatus === "pending").length,
      totalDifference: results.reduce(
        (sum, row) => sum + Math.abs(row.differenceAmount),
        0,
      ),
    };

    return NextResponse.json({
      month,
      monthLabel: `${month.split("-")[0]}년 ${month.split("-")[1]}월`,
      summary,
      results: results.map((row) => ({
        ...row,
        conditionLabel: conditionTypeLabel(row.conditionType),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 대조 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
