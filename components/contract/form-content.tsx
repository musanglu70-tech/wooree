"use client";

import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  fieldCount: number;
}

const MOCK_TEMPLATES: ContractTemplate[] = [
  {
    id: "1",
    name: "CSO 위탁판매 계약서",
    description: "표준 CSO 위탁판매 계약 양식 (제약사 공통)",
    updatedAt: "2026-06-01",
    fieldCount: 24,
  },
  {
    id: "2",
    name: "재위탁 신고 동의서",
    description: "재위탁 통보 및 동의 확인용 양식",
    updatedAt: "2026-05-20",
    fieldCount: 12,
  },
  {
    id: "3",
    name: "수수료 정산 합의서",
    description: "제약사별 수수료율 및 정산 조건 합의 양식",
    updatedAt: "2026-05-10",
    fieldCount: 18,
  },
];

export function FormContent() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => toast.info("새 양식 만들기는 준비 중입니다.")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
        >
          <Plus className="size-4" />
          새 양식 만들기
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => toast.info(`양식 열기: ${template.name}`)}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-[#4f6ef7] hover:shadow-md"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-[rgba(79,110,247,0.1)]">
              <FileText className="size-5 text-[#4f6ef7]" />
            </div>
            <h3 className="font-semibold text-slate-900">{template.name}</h3>
            <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">
              {template.description}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>필드 {template.fieldCount}개</span>
              <span>수정 {template.updatedAt}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
