import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function monthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
  return { start, end };
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { taskId?: string };
    const taskId = body.taskId;

    if (!taskId) {
      return NextResponse.json(
        { message: "taskId가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: task, error: taskError } = await supabase
      .from("automation_tasks")
      .select("*, companies(id, name)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { message: taskError?.message ?? "작업을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await supabase
      .from("automation_tasks")
      .update({ status: "processing" })
      .eq("id", taskId);

    const taskRow = task as Record<string, unknown>;
    const company = taskRow.companies as { id?: string; name?: string } | null;
    const companyId = toStr(taskRow.company_id ?? company?.id);
    const companyName = toStr(company?.name) || "업체";

    const prescriptionDate = toStr(
      taskRow.prescription_month ?? taskRow.prescription_date,
    );
    const month =
      prescriptionDate.length >= 7
        ? prescriptionDate.slice(0, 7)
        : new Date().toISOString().slice(0, 7);

    const { start, end } = monthRange(month);

    let prescriptionQuery = supabase
      .from("prescriptions")
      .select("*, pharma_companies(name), prescription_items(*)")
      .gte("prescription_date", start)
      .lt("prescription_date", end);

    if (companyId) {
      prescriptionQuery = prescriptionQuery.eq("company_id", companyId);
    }

    let { data: prescriptions, error: rxError } = await prescriptionQuery;

    if (!rxError && companyId && (prescriptions ?? []).length === 0) {
      const fallback = await supabase
        .from("prescriptions")
        .select("*, pharma_companies(name), prescription_items(*)")
        .gte("prescription_date", start)
        .lt("prescription_date", end);
      prescriptions = fallback.data;
      rxError = fallback.error;
    }

    if (rxError) {
      await supabase
        .from("automation_tasks")
        .update({ status: "error" })
        .eq("id", taskId);
      return NextResponse.json({ message: rxError.message }, { status: 500 });
    }

    const rxRows = (prescriptions as Record<string, unknown>[]) ?? [];

    let totalAmount = 0;
    const items: Array<Record<string, unknown>> = [];

    rxRows.forEach((rx) => {
      const pharma = rx.pharma_companies as { name?: string } | null;
      const rxAmount = toNumber(rx.total_amount ?? rx.amount);
      totalAmount += rxAmount;

      const rxItems =
        (rx.prescription_items as Record<string, unknown>[]) ?? [];
      if (rxItems.length > 0) {
        rxItems.forEach((item) => {
          items.push({
            hospital_name: rx.hospital_name,
            pharma_name: pharma?.name,
            insurance_code: item.insurance_code,
            product_name: item.product_name,
            quantity_original: item.quantity_original,
            quantity_external: item.quantity_external,
            amount: item.amount,
          });
        });
      } else {
        items.push({
          hospital_name: rx.hospital_name,
          pharma_name: pharma?.name,
          amount: rxAmount,
        });
      }
    });

    const reportContent = {
      company_name: companyName,
      prescription_month: month,
      prescription_month_label: formatMonthLabel(month),
      total_amount: totalAmount,
      prescription_count: rxRows.length,
      items,
    };

    const title = `${formatMonthLabel(month)} 재위탁 신고서 (${companyName})`;
    const now = new Date().toISOString();

    const { error: reportError } = await supabase
      .from("recommission_reports")
      .insert({
        company_id: companyId || null,
        automation_task_id: taskId,
        title,
        prescription_month: `${month}-01`,
        total_amount: totalAmount,
        content: reportContent,
        is_sent: false,
      });

    if (reportError) {
      await supabase
        .from("automation_tasks")
        .update({ status: "error" })
        .eq("id", taskId);
      return NextResponse.json({ message: reportError.message }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("automation_tasks")
      .update({ status: "sent", sent_at: now })
      .eq("id", taskId);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      taskId,
      totalAmount,
      prescriptionCount: rxRows.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
