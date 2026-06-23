"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Bot,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AgentConditionModal } from "@/components/settlement/agent-condition-modal";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import {
  conditionTypeLabel,
  matchStatusLabel,
  type SettlementAgentCondition,
  type SettlementAgentConditionForm,
  type SettlementCompareResult,
  type SettlementCompareSummary,
  type SettlementConditionType,
} from "@/types/settlement-agent";

interface PharmaCompany {
  id: string;
  name: string;
}

const EMPTY_FORM: SettlementAgentConditionForm = {
  companyName: "우리메디텍",
  pharmaCompanyId: "",
  commissionRate: "10",
  conditionType: "inout_combined",
  isActive: true,
};

const inputClassName =
  "h-10 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeCondition(row: Record<string, unknown>): SettlementAgentCondition {
  const pharma = row.pharma_companies as { name?: string } | null;
  return {
    id: toStr(row.id),
    companyName: toStr(row.company_name),
    pharmaCompanyId: toStr(row.pharma_company_id),
    pharmaName: toStr(pharma?.name),
    commissionRate: toNumber(row.commission_rate),
    conditionType: toStr(row.condition_type) as SettlementConditionType,
    isActive: Boolean(row.is_active),
    createdAt: toStr(row.created_at),
    updatedAt: toStr(row.updated_at),
  };
}

function normalizeResult(row: Record<string, unknown>): SettlementCompareResult {
  const pharma = row.pharma_companies as { name?: string } | null;
  return {
    id: toStr(row.id),
    conditionId: toStr(row.condition_id),
    companyName: toStr(row.company_name),
    pharmaName: toStr(pharma?.name),
    conditionType: toStr(row.condition_type) as SettlementConditionType,
    commissionRate: toNumber(row.commission_rate),
    ediAmount: toNumber(row.edi_amount),
    settlementAmount: toNumber(row.settlement_amount),
    expectedCommission: toNumber(row.expected_commission),
    differenceAmount: toNumber(row.difference_amount),
    matchStatus:
      toStr(row.match_status) === "matched"
        ? "matched"
        : toStr(row.match_status) === "mismatch"
          ? "mismatch"
          : "pending",
    comparedAt: toStr(row.compared_at),
  };
}

function MatchBadge({
  status,
}: {
  status: SettlementCompareResult["matchStatus"];
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "matched" && "bg-emerald-50 text-emerald-700",
        status === "mismatch" && "bg-red-50 text-red-700",
        status === "pending" && "bg-amber-50 text-amber-700",
      )}
    >
      {matchStatusLabel(status)}
    </span>
  );
}

export function AgentContent() {
  const supabase = useMemo(() => createClient(), []);

  const [conditions, setConditions] = useState<SettlementAgentCondition[]>([]);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [compareResults, setCompareResults] = useState<SettlementCompareResult[]>(
    [],
  );
  const [summary, setSummary] = useState<SettlementCompareSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareMonth, setCompareMonth] = useState(
    () => new Date().toISOString().slice(0, 7),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState(EMPTY_FORM);

  const loadConditions = 