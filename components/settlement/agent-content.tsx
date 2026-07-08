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
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    summary: string;
    flags: Array<{
      pharma: string;
      severity: string;
      reason: string;
      suggestion: string;
    }>;
  } | null>(null);
  const [compareMonth, setCompareMonth] = useState(
    () => new Date().toISOString().slice(0, 7),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState(EMPTY_FORM);

  const loadConditions = useCallback(async () => {
    const { data, error } = await supabase
      .from("settlement_agent_conditions")
      .select("*, pharma_companies(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("조건 목록을 불러오지 못했습니다: " + error.message);
      setConditions([]);
      return;
    }

    setConditions(
      ((data as Record<string, unknown>[]) ?? []).map(normalizeCondition),
    );
  }, [supabase]);

  const loadCompareResults = useCallback(
    async (month: string) => {
      const settlementMonth = `${month}-01`;
      const { data, error } = await supabase
        .from("settlement_results")
        .select("*, pharma_companies(name)")
        .eq("settlement_month", settlementMonth)
        .order("compared_at", { ascending: false });

      if (error) {
        setCompareResults([]);
        setSummary(null);
        return;
      }

      const rows = ((data as Record<string, unknown>[]) ?? []).map(
        normalizeResult,
      );
      setCompareResults(rows);
      setSummary({
        total: rows.length,
        matched: rows.filter((row) => row.matchStatus === "matched").length,
        mismatch: rows.filter((row) => row.matchStatus === "mismatch").length,
        pending: rows.filter((row) => row.matchStatus === "pending").length,
        totalDifference: rows.reduce(
          (sum, row) => sum + Math.abs(row.differenceAmount),
          0,
        ),
      });
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    async function init() {
      const [pharmaRes, conditionsRes] = await Promise.all([
        supabase
          .from("pharma_companies")
          .select("id, name")
          .order("name", { ascending: true }),
        supabase
          .from("settlement_agent_conditions")
          .select("*, pharma_companies(name)")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      if (pharmaRes.error) {
        toast.error(
          "제약사 목록을 불러오지 못했습니다: " + pharmaRes.error.message,
        );
        setPharmaCompanies([]);
      } else {
        setPharmaCompanies((pharmaRes.data as PharmaCompany[]) ?? []);
      }

      if (conditionsRes.error) {
        toast.error(
          "조건 목록을 불러오지 못했습니다: " + conditionsRes.error.message,
        );
        setConditions([]);
      } else {
        setConditions(
          ((conditionsRes.data as Record<string, unknown>[]) ?? []).map(
            normalizeCondition,
          ),
        );
      }

      await loadCompareResults(compareMonth);
      setIsLoading(false);
    }

    void init();

    const channel = supabase
      .channel("settlement-agent-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlement_agent_conditions" },
        () => {
          void loadConditions();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlement_results" },
        () => {
          void loadCompareResults(compareMonth);
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, compareMonth, loadConditions, loadCompareResults]);

  const openAddModal = () => {
    setEditingId(null);
    setModalForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (condition: SettlementAgentCondition) => {
    setEditingId(condition.id);
    setModalForm({
      companyName: condition.companyName,
      pharmaCompanyId: condition.pharmaCompanyId,
      commissionRate: String(condition.commissionRate),
      conditionType: condition.conditionType,
      isActive: condition.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleSaveCondition = async (form: SettlementAgentConditionForm) => {
    if (!form.companyName.trim()) {
      toast.error("업체명을 입력해주세요.");
      return;
    }
    if (!form.pharmaCompanyId) {
      toast.error("제약사를 선택해주세요.");
      return;
    }

    const rate = Number(form.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("수수료율은 0~100 사이로 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        company_name: form.companyName.trim(),
        pharma_company_id: form.pharmaCompanyId,
        commission_rate: rate,
        condition_type: form.conditionType,
        is_active: form.isActive,
      };

      const { error } = editingId
        ? await supabase
            .from("settlement_agent_conditions")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("settlement_agent_conditions").insert(payload);

      if (error) {
        toast.error((editingId ? "수정" : "등록") + " 실패: " + error.message);
        return;
      }

      toast.success(editingId ? "조건이 수정되었습니다." : "조건이 추가되었습니다.");
      setIsModalOpen(false);
      await loadConditions();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (
    condition: SettlementAgentCondition,
    event: MouseEvent,
  ) => {
    event.stopPropagation();

    const next = !condition.isActive;
    const { error } = await supabase
      .from("settlement_agent_conditions")
      .update({ is_active: next })
      .eq("id", condition.id);

    if (error) {
      toast.error("상태 변경 실패: " + error.message);
      return;
    }

    setConditions((prev) =>
      prev.map((row) =>
        row.id === condition.id ? { ...row, isActive: next } : row,
      ),
    );
  };

  const handleDelete = async (
    condition: SettlementAgentCondition,
    event: MouseEvent,
  ) => {
    event.stopPropagation();

    if (
      !window.confirm(
        `'${condition.pharmaName}' 조건을 삭제하시겠습니까?`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("settlement_agent_conditions")
      .delete()
      .eq("id", condition.id);

    if (error) {
      toast.error("삭제 실패: " + error.message);
      return;
    }

    toast.success("삭제되었습니다.");
    await loadConditions();
  };

  const handleRunCompare = async () => {
    setIsComparing(true);

    try {
      const response = await fetch("/api/settlement/agent/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: compareMonth }),
      });

      const body = (await response.json()) as {
        message?: string;
        summary?: SettlementCompareSummary;
        results?: Array<
          SettlementCompareResult & { conditionLabel?: string }
        >;
      };

      if (!response.ok) {
        toast.error(body.message ?? "AI 대조에 실패했습니다.");
        return;
      }

      if (body.summary) setSummary(body.summary);
      if (body.results?.length) {
        setCompareResults(
          body.results.map((row) => ({
            id: row.id,
            conditionId: row.conditionId,
            companyName: row.companyName,
            pharmaName: row.pharmaName,
            conditionType: row.conditionType,
            commissionRate: row.commissionRate,
            ediAmount: row.ediAmount,
            settlementAmount: row.settlementAmount,
            expectedCommission: row.expectedCommission,
            differenceAmount: row.differenceAmount,
            matchStatus: row.matchStatus,
            comparedAt: row.comparedAt,
          })),
        );
      }
      toast.success("AI 대조가 완료되었습니다.");
      await loadCompareResults(compareMonth);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI 대조 중 오류가 발생했습니다.",
      );
    } finally {
      setIsComparing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch("/api/settlement/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: compareMonth }),
      });
      const body = (await response.json()) as {
        message?: string;
        result?: {
          summary: string;
          flags: Array<{
            pharma: string;
            severity: string;
            reason: string;
            suggestion: string;
          }>;
        };
      };
      if (!response.ok) {
        toast.error(body.message ?? "분석 실패");
        return;
      }
      if (body.result) setAnalysis(body.result);
      if (body.message) toast.message(body.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI 분석 중 오류가 발생했습니다.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            에이전트 조건 관리
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            업체×제약사 수수료 조건으로 EDI와 정산자료를 자동 대조합니다
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
        >
          <Plus className="size-4" />
          조건 추가
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">업체명</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">수수료율</th>
                <th className="px-5 py-3 font-medium text-slate-600">조건</th>
                <th className="px-5 py-3 font-medium text-slate-600">활성상태</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : conditions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    등록된 조건이 없습니다. 조건 추가 버튼을 눌러 등록하세요.
                  </td>
                </tr>
              ) : (
                conditions.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => openEditModal(row)}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/80",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {row.companyName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{row.pharmaName}</td>
                    <td className="px-5 py-3.5 font-medium text-[#4f6ef7]">
                      {row.commissionRate}%
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {conditionTypeLabel(row.conditionType)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={(event) => handleToggleActive(row, event)}
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                          row.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                        )}
                      >
                        {row.isActive ? "활성" : "비활성"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Pencil className="size-3.5" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(row, event)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI 자동 대조</h2>
            <p className="mt-1 text-xs text-slate-500">
              활성 조건 기준으로 처방월 EDI 금액과 제약사 정산파일 수수료를
              비교합니다
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                처방월
              </label>
              <input
                type="month"
                value={compareMonth}
                onChange={(e) => setCompareMonth(e.target.value)}
                className={cn(inputClassName, "min-w-[150px]")}
              />
            </div>
            <button
              type="button"
              onClick={handleRunCompare}
              disabled={isComparing}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isComparing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bot className="size-4" />
              )}
              {isComparing ? "대조 중..." : "AI 대조 실행"}
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#7c3aed] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bot className="size-4" />
              )}
              {isAnalyzing ? "분석 중..." : "AI 이상 분석"}
            </button>
          </div>
        </div>

        {analysis && (
          <div className="mb-4 rounded-lg border border-[#7c3aed]/30 bg-[#f5f3ff] p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#6d28d9]">
              <Bot className="size-4" /> AI 이상 정산 분석
            </p>
            <p className="text-sm text-slate-700">
              {analysis.summary || "특이사항이 없습니다."}
            </p>
            {analysis.flags.length > 0 && (
              <ul className="mt-3 space-y-2">
                {analysis.flags.map((f, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          f.severity === "high"
                            ? "bg-red-100 text-red-700"
                            : f.severity === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {f.severity === "high"
                          ? "높음"
                          : f.severity === "medium"
                            ? "중간"
                            : "낮음"}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {f.pharma}
                      </span>
                    </div>
                    <p className="mt-1.5 text-slate-700">{f.reason}</p>
                    {f.suggestion && (
                      <p className="mt-1 text-xs text-[#6d28d9]">
                        → {f.suggestion}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {summary && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">전체</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {summary.total}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs text-emerald-700">일치</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">
                {summary.matched}
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs text-red-700">불일치</p>
              <p className="mt-1 text-lg font-semibold text-red-700">
                {summary.mismatch}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-700">차액 합계</p>
              <p className="mt-1 text-lg font-semibold text-amber-800">
                {formatWon(summary.totalDifference)}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-600">업체</th>
                <th className="px-4 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-4 py-3 font-medium text-slate-600">조건</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  EDI 금액
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  예상 수수료
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  정산파일 금액
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  차액
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">결과</th>
              </tr>
            </thead>
            <tbody>
              {compareResults.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    AI 대조 실행 후 결과가 표시됩니다.
                  </td>
                </tr>
              ) : (
                compareResults.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-slate-900">{row.companyName}</td>
                    <td className="px-4 py-3 text-slate-700">{row.pharmaName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {conditionTypeLabel(row.conditionType)} ({row.commissionRate}
                      %)
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatWon(row.ediAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#4f6ef7]">
                      {formatWon(row.expectedCommission)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.settlementAmount > 0
                        ? formatWon(row.settlementAmount)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={cn(
                          row.differenceAmount === 0
                            ? "text-emerald-600"
                            : row.differenceAmount > 0
                              ? "text-red-600"
                              : "text-blue-600",
                        )}
                      >
                        {row.differenceAmount > 0 ? "+" : ""}
                        {formatWon(row.differenceAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MatchBadge status={row.matchStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AgentConditionModal
        open={isModalOpen}
        editingId={editingId}
        initialForm={modalForm}
        pharmaCompanies={pharmaCompanies}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={handleSaveCondition}
      />
    </div>
  );
}
