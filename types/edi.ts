export type RxType = "처방" | "조제";

export interface RxRow {
  code: string;
  name: string;
  unit: string;
  prescriptionCount: string;
  price: string;
  totalUsage: string;
  totalAmount: string;
  inN: string;
  outN: string;
  type: RxType;
  commissionRate: number | null;
  extraCommissionRate: number | null;
  /** 보험코드가 products 마스터에 없을 때 */
  needsReview?: boolean;
  /** products 마스터와 매칭됨 */
  masterMatched?: boolean;
}

export function createRxRow(): RxRow {
  return {
    code: "643301120",
    name: "",
    unit: "",
    prescriptionCount: "0",
    price: "0",
    totalUsage: "0",
    totalAmount: "0",
    inN: "0",
    outN: "0",
    type: "처방",
    commissionRate: null,
    extraCommissionRate: null,
  };
}

export function rowAmount(row: RxRow): number {
  const totalAmount = Number(row.totalAmount) || 0;
  if (totalAmount > 0) return totalAmount;

  return (
    (Number(row.price) || 0) *
    ((Number(row.inN) || 0) + (Number(row.outN) || 0))
  );
}
