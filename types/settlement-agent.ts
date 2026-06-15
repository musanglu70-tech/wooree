export type SettlementConditionType =
  | "inout_combined"
  | "outonly"
  | "prescription_amount";

export type SettlementMatchStatus = "matched" | "mismatch" | "pending";

export interface SettlementAgentCondition {
  id: string;
  companyName: string;
  pharmaCompanyId: string;
  pharmaName: string;
  commissionRate: number;
  conditionType: SettlementConditionType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementAgentConditionForm {
  companyName: string;
  pharmaCompanyId: string;
  commissionRate: string;
  conditionType: SettlementConditionType;
  isActive: boolean;
}

export interface SettlementCompareResult {
  id: string;
  conditionId: string;
  companyName: string;
  pharmaName: string;
  conditionType: SettlementConditionType;
  commissionRate: number;
  ediAmount: number;
  settlementAmount: number;
  expectedCommission: number;
  differenceAmount: number;
  matchStatus: SettlementMatchStatus;
  comparedAt: string;
}

export interface SettlementCompareSummary {
  total: number;
  matched: number;
  mismatch: number;
  pending: number;
  totalDifference: number;
}

export const CONDITION_TYPE_OPTIONS: Array<{
  value: SettlementConditionType;
  label: string;
}> = [
  { value: "inout_combined", label: "원내+원외 합산" },
  { value: "outonly", label: "원외만" },
  { value: "prescription_amount", label: "처방금액 기준" },
];

export function conditionTypeLabel(type: SettlementConditionType): string {
  return (
    CONDITION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export function matchStatusLabel(status: SettlementMatchStatus): string {
  if (status === "matched") return "일치";
  if (status === "mismatch") return "불일치";
  return "대기";
}
