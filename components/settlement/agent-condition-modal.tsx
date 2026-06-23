"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONDITION_TYPE_OPTIONS,
  type SettlementAgentConditionForm,
  type SettlementConditionType,
} from "@/types/settlement-agent";

interface PharmaCompany {
  id: string;
  name: string;
}

interface AgentConditionModalProps {
  open: boolean;
  editingId: string | null;
  initialForm: SettlementAgentConditionForm;
  pharmaCompanies: PharmaCompany[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (form: SettlementAgentConditionForm) => void;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 text-sm text-[#2c1f0e] outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

export function AgentConditionModal({
  open,
  editingId,
  initialForm,
  pharmaCompanies,
  isSaving,
  onClose,
  onSubmit,
}: AgentConditionModalProps) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (open) setForm(initialForm);
  }, [open, initialForm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#fdf8f0] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#2c1f0e]">
            {editingId ? "조건 수정" : "조건 추가"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex size-8 items-center justify-center rounded-lg text-[#b5a080] transition-colors hover:bg-[#eee3cc] hover:text-[#7a5c2e]"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              업체명 <span className="text-red-500">*</span>
            </label>
            <input
              value={form.companyName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, companyName: e.target.value }))
              }
              placeholder="우리메디텍"
              className={inputClassName}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              제약사 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.pharmaCompanyId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  pharmaCompanyId: e.target.value,
                }))
              }
              className={inputClassName}
            >
              <option value="">제약사 선택</option>
              {pharmaCompanies.map((pharma) => (
                <option key={pharma.id} value={pharma.id}>
                  {pharma.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              수수료율 (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.commissionRate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  commissionRate: e.target.value,
                }))
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5a3e1b]">
              조건 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.conditionType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  conditionType: e.target.value as SettlementConditionType,
                }))
              }
              className={inputClassName}
            >
              {CONDITION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-[#e8d9bc] px-3 py-2.5">
            <span className="text-sm text-[#5a3e1b]">활성 여부</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() =>
                setForm((prev) => ({ ...prev, isActive: !prev.isActive }))
              }
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                form.isActive ? "bg-[#4f6ef7]" : "bg-slate-200",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-[#fdf8f0] shadow transition-transform",
                  form.isActive ? "left-5" : "left-0.5",
                )}
              />
            </button>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-[#e8d9bc] px-4 py-2 text-sm font-medium text-[#5a3e1b] transition-colors hover:bg-[#f5ede0] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isSaving}
            className="rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
