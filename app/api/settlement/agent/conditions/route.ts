import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SettlementConditionType } from "@/types/settlement-agent";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function mapCondition(row: Record<string, unknown>) {
  const pharma = row.pharma_companies as { name?: string } | null;
  return {
    id: toStr(row.id),
    companyName: toStr(row.company_name),
    pharmaCompanyId: toStr(row.pharma_company_id),
    pharmaName: toStr(pharma?.name),
    commissionRate: Number(row.commission_rate) || 0,
    conditionType: toStr(row.condition_type) as SettlementConditionType,
    isActive: Boolean(row.is_active),
    createdAt: toStr(row.created_at),
    updatedAt: toStr(row.updated_at),
  };
}

/** GET /api/settlement/agent/conditions */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("settlement_agent_conditions")
      .select("*, pharma_companies(name)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      conditions: ((data as Record<string, unknown>[]) ?? []).map(mapCondition),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "조건 조회에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** POST /api/settlement/agent/conditions */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyName?: string;
      pharmaCompanyId?: string;
      commissionRate?: number;
      conditionType?: SettlementConditionType;
      isActive?: boolean;
    };

    const companyName = body.companyName?.trim();
    const pharmaCompanyId = body.pharmaCompanyId?.trim();
    const commissionRate = Number(body.commissionRate);
    const conditionType = body.conditionType;

    if (!companyName) {
      return NextResponse.json(
        { message: "업체명이 필요합니다." },
        { status: 400 },
      );
    }
    if (!pharmaCompanyId) {
      return NextResponse.json(
        { message: "제약사를 선택해주세요." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return NextResponse.json(
        { message: "수수료율은 0~100 사이여야 합니다." },
        { status: 400 },
      );
    }
    if (!conditionType) {
      return NextResponse.json(
        { message: "조건 유형이 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("settlement_agent_conditions")
      .insert({
        company_name: companyName,
        pharma_company_id: pharmaCompanyId,
        commission_rate: commissionRate,
        condition_type: conditionType,
        is_active: body.isActive ?? true,
      })
      .select("*, pharma_companies(name)")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      condition: mapCondition(data as Record<string, unknown>),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "조건 저장에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
