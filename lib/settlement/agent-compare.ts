import type {
  SettlementConditionType,
  SettlementMatchStatus,
} from "@/types/settlement-agent";

export interface PrescriptionItemRow {
  unit_price?: number | null;
  quantity_original?: number | null;
  quantity_external?: number | null;
  amount?: number | null;
}

export interface SettlementFileRow {
  id: string;
  total_amount?: number | null;
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function monthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
  return { start, end };
}

export function monthToDate(month: string): string {
  return month ? `${month}-01` : "";
}

export function calcItemAmount(
  item: PrescriptionItemRow,
  conditionType: SettlementConditionType,
): number {
  const unitPrice = toNumber(item.unit_price);
  const qtyIn = toNumber(item.quantity_original);
  const qtyOut = toNumber(item.quantity_external);
  const amount = toNumber(item.amount);

  switch (conditionType) {
    case "outonly":
      return unitPrice > 0 ? unitPrice * qtyOut : amount;
    case "inout_combined":
      if (unitPrice > 0) return unitPrice * (qtyIn + qtyOut);
      return amount;
    case "prescription_amount":
    default:
      return amount;
  }
}

export function sumEdiAmount(
  items: PrescriptionItemRow[],
  conditionType: SettlementConditionType,
): number {
  return items.reduce(
    (sum, item) => sum + calcItemAmount(item, conditionType),
    0,
  );
}

export function pickSettlementAmount(files: SettlementFileRow[]): {
  amount: number;
  fileId: string | null;
} {
  if (!files.length) return { amount: 0, fileId: null };
  const latest = files[0];
  return {
    amount: toNumber(latest.total_amount),
    fileId: latest.id,
  };
}

export function buildCompareRow(params: {
  ediAmount: number;
  settlementAmount: number;
  commissionRate: number;
}): {
  expectedCommission: number;
  differenceAmount: number;
  matchStatus: SettlementMatchStatus;
} {
  const { ediAmount, settlementAmount, commissionRate } = params;
  const expectedCommission = Math.round((ediAmount * commissionRate) / 100);
  const differenceAmount =
    settlementAmount > 0 ? expectedCommission - settlementAmount : 0;

  let matchStatus: SettlementMatchStatus = "pending";
  if (settlementAmount <= 0) {
    matchStatus = "pending";
  } else if (Math.abs(differenceAmount) < 1) {
    matchStatus = "matched";
  } else {
    matchStatus = "mismatch";
  }

  return { expectedCommission, differenceAmount, matchStatus };
}
