import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  buildSettlementReportEmailHtml,
  buildSettlementReportEmailText,
  FROM_EMAIL,
} from "@/lib/email/settlement-report-email";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function monthKeyFromDate(value: string): string {
  const trimmed = value.trim();
  return trimmed.length >= 7 ? trimmed.slice(0, 7) : trimmed;
}

/** POST /api/reports/send */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "발송 실패", details: "RESEND_API_KEY 미설정" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      to?: string;
      settlementFileId?: string;
    };

    const to = body.to?.trim();
    const settlementFileId = body.settlementFileId?.trim();

    if (!to || !EMAIL_REGEX.test(to)) {
      return NextResponse.json(
        { error: "발송 실패", details: "올바른 수신 이메일을 입력해주세요." },
        { status: 400 },
      );
    }

    if (!settlementFileId) {
      return NextResponse.json(
        { error: "발송 실패", details: "settlementFileId가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: fileRow, error: fileError } = await supabase
      .from("settlement_files")
      .select(
        "id, settlement_month, total_amount, pharma_company_id, pharma_companies(name)",
      )
      .eq("id", settlementFileId)
      .maybeSingle();

    if (fileError) {
      return NextResponse.json(
        { error: "발송 실패", details: fileError.message },
        { status: 500 },
      );
    }

    if (!fileRow) {
      return NextResponse.json(
        { error: "발송 실패", details: "정산자료를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const row = fileRow as Record<string, unknown>;
    const pharma = row.pharma_companies as { name?: string } | null;
    const pharmaName = toStr(pharma?.name) || "제약사";
    const pharmaCompanyId = toStr(row.pharma_company_id);
    const settlementMonth = monthKeyFromDate(toStr(row.settlement_month));
    const fileTotalAmount = toNumber(row.total_amount);

    const { data: conditionRow } = await supabase
      .from("settlement_agent_conditions")
      .select("commission_rate")
      .eq("pharma_company_id", pharmaCompanyId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const commissionRate = toNumber(
      (conditionRow as { commission_rate?: unknown } | null)?.commission_rate,
    );

    const settlementMonthDate = settlementMonth ? `${settlementMonth}-01` : "";

    const { data: resultRow } = await supabase
      .from("settlement_results")
      .select("edi_amount, expected_commission")
      .eq("pharma_company_id", pharmaCompanyId)
      .eq("settlement_month", settlementMonthDate)
      .order("compared_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ediAmount = toNumber(
      (resultRow as { edi_amount?: unknown } | null)?.edi_amount,
    );
    const expectedCommission = toNumber(
      (resultRow as { expected_commission?: unknown } | null)
        ?.expected_commission,
    );

    const totalAmount =
      ediAmount > 0 ? ediAmount : fileTotalAmount > 0 ? fileTotalAmount : 0;
    const commissionAmount =
      expectedCommission > 0
        ? expectedCommission
        : Math.round((totalAmount * commissionRate) / 100);

    const emailParams = {
      pharmaName,
      settlementMonth,
      totalAmount,
      commissionRate,
      commissionAmount,
    };

    const resend = new Resend(apiKey);
    const [year, mon] = settlementMonth.split("-");
    const monthLabel = mon ? `${year}년 ${mon}월` : settlementMonth;

    const { data, error } = await resend.emails.send({
      from: `우리메디텍 <${FROM_EMAIL}>`,
      to: [to],
      subject: `[정산안내] ${pharmaName} ${monthLabel}`,
      html: buildSettlementReportEmailHtml(emailParams),
      text: buildSettlementReportEmailText(emailParams),
    });

    if (error) {
      console.error(
        "[reports/send] Resend error:",
        JSON.stringify(error, null, 2),
      );
      return NextResponse.json(
        { error: "발송 실패", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id ?? null,
      ...emailParams,
    });
  } catch (error) {
    console.error(
      "[reports/send] error:",
      JSON.stringify(
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
        null,
        2,
      ),
    );

    const details =
      error instanceof Error
        ? error.message
        : "이메일 발송 중 오류가 발생했습니다.";

    return NextResponse.json({ error: "발송 실패", details }, { status: 500 });
  }
}
