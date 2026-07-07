import type { SupabaseClient } from "@supabase/supabase-js";

/** 파트너 정산 상세 1줄 (prescription_item 기준) */
export interface PartnerLine {
  prescriptionId: string;
  settlementMonth: string; // YYYY-MM (prescription_date 기준)
  prescriptionMonth: string; // YYYY-MM
  hospitalName: string;
  pharmaName: string;
  insuranceCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  amount: number; // 처방액
  commissionRate: number; // %
  commission: number; // 수수료액
}

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(dateStr: string): string {
  const t = dateStr.trim();
  return t.length >= 7 ? t.slice(0, 7) : t;
}

/**
 * 로그인한 파트너의 정산 상세 내역을 불러온다.
 * RLS 로 본인 company_id 데이터만 반환됨 (browser client + 세션 쿠키).
 */
export async function loadPartnerLines(
  supabase: SupabaseClient,
): Promise<PartnerLine[]> {
  const { data, error } = await supabase
    .from("prescriptions")
    .select(
      `id, hospital_name, prescription_date, settlement_date,
       pharma_companies(name),
       prescription_items(insurance_code, product_name, unit_price,
         quantity_original, quantity_external, amount, commission_rate)`,
    )
    .order("prescription_date", { ascending: false });

  if (error) throw new Error(error.message);

  const lines: PartnerLine[] = [];

  for (const raw of (data as Record<string, unknown>[]) ?? []) {
    const prescriptionId = toStr(raw.id);
    const hospitalName = toStr(raw.hospital_name);
    const rxDate = toStr(raw.prescription_date);
    const settlementDate = toStr(raw.settlement_date) || rxDate;
    const pharma = raw.pharma_companies as { name?: string } | null;
    const pharmaName = toStr(pharma?.name);
    const items =
      (raw.prescription_items as Record<string, unknown>[] | null) ?? [];

    for (const it of items) {
      const amount = toNum(it.amount);
      const rate = toNum(it.commission_rate);
      const quantity =
        toNum(it.quantity_original) + toNum(it.quantity_external);
      lines.push({
        prescriptionId,
        settlementMonth: monthKey(settlementDate),
        prescriptionMonth: monthKey(rxDate),
        hospitalName,
        pharmaName,
        insuranceCode: toStr(it.insurance_code),
        productName: toStr(it.product_name),
        unitPrice: toNum(it.unit_price),
        quantity,
        amount,
        commissionRate: rate,
        commission: rate > 0 ? Math.round((amount * rate) / 100) : 0,
      });
    }
  }

  return lines;
}

export function krw(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

/** 월별 합계 집계 */
export interface MonthlyTotal {
  month: string;
  count: number;
  quantity: number;
  commission: number;
  amount: number; // 처방액
}

export function aggregateByMonth(lines: PartnerLine[]): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  for (const l of lines) {
    const cur =
      map.get(l.settlementMonth) ??
      {
        month: l.settlementMonth,
        count: 0,
        quantity: 0,
        commission: 0,
        amount: 0,
      };
    cur.count += 1;
    cur.quantity += l.quantity;
    cur.commission += l.commission;
    cur.amount += l.amount;
    map.set(l.settlementMonth, cur);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.month < b.month ? 1 : -1,
  );
}
