export type RxType = "처방" | "조제";

export interface RxRow {
  code: string;
  name: string;
  price: string;
  inN: string;
  outN: string;
  type: RxType;
}

export function createRxRow(): RxRow {
  return {
    code: "643301120",
    name: "",
    price: "0",
    inN: "0",
    outN: "0",
    type: "처방",
  };
}

export function rowAmount(row: RxRow): number {
  return (
    (Number(row.price) || 0) *
    ((Number(row.inN) || 0) + (Number(row.outN) || 0))
  );
}
