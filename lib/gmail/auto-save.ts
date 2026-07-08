import type { SupabaseClient } from "@supabase/supabase-js";

export interface AutoSaveItem {
  code: string;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface AutoSaveInput {
  pharmaName: string;
  hospitalName: string;
  prescriptionDate: string; // YYYY-MM-01
  items: AutoSaveItem[];
}

export interface AutoSaveResult {
  saved: boolean;
  reason?: string;
  prescriptionId?: string;
}

function nextMonth(dateYmd: string): string {
  const m = dateYmd.match(/^(\d{4})-(\d{2})/);
  if (!m) return dateYmd;
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const ny = mon === 12 ? y + 1 : y;
  const nm = mon === 12 ? 1 : mon + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/** 제약사명 → id (없으면 생성) */
async function resolvePharmaId(
  admin: SupabaseClient,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data } = await admin
    .from("pharma_companies")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();
  if (data) return (data as { id: string }).id;
  const { data: created, error } = await admin
    .from("pharma_companies")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (error) return null;
  return (created as { id: string }).id;
}

/**
 * 파싱된 처방을 prescriptions + prescription_items 에 자동 저장.
 * 필수 조건: 병의원명 + 품목 1개 이상. (제약사는 없으면 생성)
 * service_role 클라이언트로 호출(RLS 우회). created_by는 null(시스템).
 * 병의원→CSO 매핑 트리거가 company_id를 자동 배정함.
 */
export async function autoSavePrescription(
  admin: SupabaseClient,
  input: AutoSaveInput,
): Promise<AutoSaveResult> {
  if (!input.hospitalName.trim()) {
    return { saved: false, reason: "병의원명 없음" };
  }
  const validItems = input.items.filter(
    (it) => (it.code || it.name) && (it.amount > 0 || it.unitPrice > 0),
  );
  if (validItems.length === 0) {
    return { saved: false, reason: "유효 품목 없음" };
  }

  const prescriptionDate = input.prescriptionDate || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prescriptionDate)) {
    return { saved: false, reason: "처방월 파싱 실패" };
  }

  // 중복 방지: 같은 병의원·처방월·제약사 이미 있으면 skip
  const pharmaId = await resolvePharmaId(admin, input.pharmaName);

  const dupQuery = admin
    .from("prescriptions")
    .select("id")
    .eq("hospital_name", input.hospitalName.trim())
    .eq("prescription_date", prescriptionDate);
  if (pharmaId) dupQuery.eq("pharma_company_id", pharmaId);
  const { data: dup } = await dupQuery.maybeSingle();
  if (dup) {
    return { saved: false, reason: "이미 저장된 처방(중복)" };
  }

  const { data: rx, error: rxErr } = await admin
    .from("prescriptions")
    .insert({
      pharma_company_id: pharmaId,
      hospital_name: input.hospitalName.trim(),
      prescription_date: prescriptionDate,
      settlement_date: nextMonth(prescriptionDate),
      status: "saved",
      memo: "Gmail 자동수집",
    })
    .select("id")
    .single();

  if (rxErr || !rx) {
    return { saved: false, reason: rxErr?.message ?? "처방 저장 실패" };
  }

  const prescriptionId = (rx as { id: string }).id;
  const items = validItems.map((it, i) => ({
    prescription_id: prescriptionId,
    seq: i + 1,
    insurance_code: it.code || "",
    product_name: it.name || "",
    unit_price: Math.round(it.unitPrice) || 0,
    quantity_original: Math.round(it.quantity) || 0,
    quantity_external: 0,
    amount: Math.round(it.amount) || 0,
  }));

  const { error: itemErr } = await admin
    .from("prescription_items")
    .insert(items);
  if (itemErr) {
    return { saved: false, reason: "품목 저장 실패: " + itemErr.message };
  }

  return { saved: true, prescriptionId };
}
