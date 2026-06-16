import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.local"),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE key 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(url, key);

function currentMonthRange() {
  const month = new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
  return { month, start, end };
}

async function queryStats() {
  const { data, error } = await supabase
    .from("v_dashboard_stats")
    .select("*")
    .maybeSingle();

  if (!error && data) {
    return {
      source: "v_dashboard_stats",
      monthlyCount: Number(data.this_month_edi ?? data.monthly_edi_count ?? 0),
      monthlyAmount: Number(
        data.this_month_edi_amount ?? data.monthly_edi_amount ?? 0,
      ),
      unsettled: Number(data.unsettled_count ?? 0),
    };
  }

  const { start, end } = currentMonthRange();
  const { count } = await supabase
    .from("prescriptions")
    .select("*", { count: "exact", head: true })
    .gte("prescription_date", start)
    .lt("prescription_date", end);

  return {
    source: "prescriptions (fallback)",
    monthlyCount: count ?? 0,
    monthlyAmount: 0,
    unsettled: 0,
    viewError: error?.message,
  };
}

async function ensureSampleEdi() {
  const stats = await queryStats();
  console.log("현재 통계:", stats);

  if (stats.monthlyCount > 0) {
    console.log("이번 달 EDI가 이미 있습니다. 샘플 INSERT 생략.");
    return stats;
  }

  const { data: pharma, error: pharmaError } = await supabase
    .from("pharma_companies")
    .select("id, name")
    .order("name")
    .limit(1)
    .maybeSingle();

  if (pharmaError || !pharma) {
    throw new Error(
      "제약사 데이터가 없습니다. pharma_companies에 1건 이상 등록해주세요.",
    );
  }

  const { start } = currentMonthRange();

  const { data: prescription, error: insertError } = await supabase
    .from("prescriptions")
    .insert({
      pharma_company_id: pharma.id,
      hospital_name: "대시보드 테스트 병원",
      prescription_date: start,
      settlement_date: null,
      status: "saved",
      memo: "dashboard seed sample",
    })
    .select("id")
    .single();

  if (insertError || !prescription) {
    throw new Error(insertError?.message ?? "prescriptions INSERT 실패");
  }

  const { error: itemsError } = await supabase
    .from("prescription_items")
    .insert({
      prescription_id: prescription.id,
      seq: 1,
      insurance_code: "650200400",
      product_name: "레보덴선경2.5mg (샘플)",
      unit_price: 366,
      quantity_original: 100,
      quantity_external: 50,
      amount: 54900,
    });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  console.log(
    `샘플 EDI INSERT 완료 (id=${prescription.id}, 제약사=${pharma.name}, 금액=54,900원)`,
  );

  return queryStats();
}

async function queryPharmaStats() {
  const { data, error } = await supabase
    .from("v_dashboard_pharma_stats")
    .select("*")
    .order("monthly_amount", { ascending: false });

  if (error) {
    console.warn("v_dashboard_pharma_stats:", error.message);
    return [];
  }

  return data ?? [];
}

async function main() {
  const after = await ensureSampleEdi();
  const pharmaRows = await queryPharmaStats();

  console.log("\n=== 대시보드 검증 결과 ===");
  console.log("이번달 EDI 건수:", after.monthlyCount);
  console.log("이번달 EDI 금액:", after.monthlyAmount);
  console.log("미정산 건수:", after.unsettled);
  console.log("제약사별 현황:", pharmaRows.length, "행");
  for (const row of pharmaRows.slice(0, 5)) {
    console.log(
      `  - ${row.pharma_name}: ${row.monthly_count}건 / ${row.monthly_amount}원 / 미정산 ${row.unsettled_count}건`,
    );
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
