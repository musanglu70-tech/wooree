import * as XLSX from "xlsx";
import { createRxRow, type RxRow } from "@/types/edi";
import { downloadExcel } from "@/lib/excel/export";

const TEMPLATE_HEADERS = [
  "원구코드",
  "명칭",
  "단위",
  "처방횟수",
  "단가",
  "총사용량",
  "총금액",
] as const;

const CODE_ALIASES = ["원구코드", "보험코드", "청구코드"];
const NAME_ALIASES = ["명칭", "제품명"];
const UNIT_ALIASES = ["단위"];
const RX_COUNT_ALIASES = ["처방횟수"];
const PRICE_ALIASES = ["단가"];
const TOTAL_USAGE_ALIASES = ["총사용량"];
const TOTAL_AMOUNT_ALIASES = ["총금액"];

const SUMMARY_CODE_RE = /^(합계|소계|총계|계|total|subtotal)$/i;
const INSURANCE_CODE_RE = /^\d{9}$|^[A-Z]\d{8}$/i;

function normalizeKey(value: string): string {
  return value.replace(/\s/g, "").trim();
}

function parseNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function pickValue(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    for (const [key, value] of entries) {
      if (normalizeKey(key) === target) return value;
    }
  }
  return undefined;
}

function toCodeString(value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d+\.?\d*$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) return String(Math.trunc(num));
  }
  return raw.toUpperCase();
}

function isValidDataRow(code: string): boolean {
  if (!code || SUMMARY_CODE_RE.test(code)) return false;
  return INSURANCE_CODE_RE.test(code);
}

export function downloadPrescriptionUploadTemplate(): void {
  downloadExcel("처방입력_양식.xlsx", [
    {
      name: "처방입력",
      rows: [
        {
          원구코드: "650200400",
          명칭: "레보덴선경2.5mg",
          단위: "1정",
          처방횟수: 3,
          단가: 366,
          총사용량: 4265,
          총금액: 54900,
        },
      ],
    },
  ]);
}

export function parsePrescriptionExcel(buffer: ArrayBuffer): RxRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("INVALID_FORMAT");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("INVALID_FORMAT");
  }

  const headerKeys = Object.keys(rawRows[0] ?? {}).map(normalizeKey);
  const hasCodeColumn = CODE_ALIASES.some((alias) =>
    headerKeys.includes(normalizeKey(alias)),
  );
  const hasNameColumn = NAME_ALIASES.some((alias) =>
    headerKeys.includes(normalizeKey(alias)),
  );

  if (!hasCodeColumn || !hasNameColumn) {
    throw new Error("INVALID_FORMAT");
  }

  const parsed: RxRow[] = [];

  for (const row of rawRows) {
    const code = toCodeString(pickValue(row, CODE_ALIASES));
    if (!isValidDataRow(code)) continue;

    const name = String(pickValue(row, NAME_ALIASES) ?? "").trim();
    const unit = String(pickValue(row, UNIT_ALIASES) ?? "").trim() || "1정";
    const prescriptionCount = parseNumber(pickValue(row, RX_COUNT_ALIASES));
    const unitPrice = parseNumber(pickValue(row, PRICE_ALIASES));
    const totalUsage = parseNumber(pickValue(row, TOTAL_USAGE_ALIASES));
    const totalAmount = parseNumber(pickValue(row, TOTAL_AMOUNT_ALIASES));

    parsed.push({
      ...createRxRow(),
      code,
      name,
      unit,
      prescriptionCount: String(prescriptionCount),
      price: String(unitPrice),
      totalUsage: String(totalUsage),
      totalAmount: String(totalAmount),
      inN: String(totalUsage > 0 ? totalUsage : prescriptionCount),
      outN: "0",
      type: "처방",
      commissionRate: null,
      extraCommissionRate: null,
    });
  }

  if (parsed.length === 0) {
    throw new Error("INVALID_FORMAT");
  }

  return parsed;
}

export function countFilledPrescriptionRows(rows: RxRow[]): number {
  return rows.filter((row) => {
    const hasDefaultCodeOnly =
      row.code.trim() === "643301120" && row.name.trim() === "";
    if (hasDefaultCodeOnly) return false;

    return (
      row.name.trim() !== "" ||
      row.code.trim() !== "" ||
      Number(row.prescriptionCount) > 0 ||
      Number(row.price) > 0 ||
      Number(row.totalUsage) > 0 ||
      Number(row.totalAmount) > 0 ||
      Number(row.inN) > 0 ||
      Number(row.outN) > 0
    );
  }).length;
}

const TEMPLATE_HEADERS = [