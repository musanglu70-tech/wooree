"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  businessNumber: string;
  representative: string;
  address: string;
  phone: string;
  email: string;
}

interface CompanyForm {
  name: string;
  businessNumber: string;
  representative: string;
  address: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: CompanyForm = {
  name: "",
  businessNumber: "",
  representative: "",
  address: "",
  phone: "",
  email: "",
};

const PAGE_SIZE = 10;

const inputClassName =
  "h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-3 text-sm text-[#0f172a] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRow(row: Record<string, unknown>): Company {
  return {
    id: toStr(row.id),
    name: toStr(row.name ?? row.company_name),
    businessNumber: toStr(row.business_number),
    representative: toStr(row.representative ?? row.ceo_name ?? row.owner),
    address: toStr(row.address),
    phone: toStr(row.phone ?? row.phone_number ?? row.tel),
    email: toStr(row.email),
  };
}

function FormField({
  label,
  required,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#475569]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

export function CompaniesContent() {
  const supabase = useMemo(() => createClient(), []);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadCompanies = useMemo(
    () => async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        toast.error("업체 목록을 불러오지 못했습니다: " + error.message);
        setCompanies([]);
      } else {
        setCompanies(
          ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
        );
      }
      setIsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    const keyword = appliedSearch.trim();
    if (!keyword) return companies;
    return companies.filter(
      (c) =>
        c.name.includes(keyword) ||
        c.businessNumber.includes(keyword) ||
        c.representative.includes(keyword),
    );
  }, [companies, appliedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCompanies.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingId(company.id);
    setForm({
      name: company.name,
      businessNumber: company.businessNumber,
      representative: company.representative,
      address: company.address,
      phone: company.phone,
      email: company.email,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("업체명을 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        business_number: form.businessNumber.trim() || null,
        representative: form.representative.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      };

      const { error } = editingId
        ? await supabase.from("companies").update(payload).eq("id", editingId)
        : await supabase.from("companies").insert(payload);

      if (error) {
        toast.error(
          (editingId ? "수정" : "등록") + " 실패: " + error.message,
        );
        return;
      }

      toast.success(editingId ? "수정되었습니다." : "등록되었습니다.");
      setIsModalOpen(false);
      await loadCompanies();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`'${company.name}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", company.id);

    if (error) {
      toast.error("삭제 실패: " + error.message);
      return;
    }

    toast.success("삭제되었습니다.");
    await loadCompanies();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[#475569]">
              검색
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="업체명, 사업자번호, 대표자 검색"
              className={inputClassName}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
          >
            <Search className="size-4" />
            조회
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-4 text-sm font-medium text-[#475569] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
          >
            <Plus className="size-4" />
            업체 추가
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-5 py-3 font-medium text-[#475569]">업체명</th>
                <th className="px-5 py-3 font-medium text-[#475569]">
                  사업자번호
                </th>
                <th className="px-5 py-3 font-medium text-[#475569]">대표자</th>
                <th className="px-5 py-3 font-medium text-[#475569]">주소</th>
                <th className="px-5 py-3 font-medium text-[#475569]">
                  전화번호
                </th>
                <th className="px-5 py-3 font-medium text-[#475569]">이메일</th>
                <th className="px-5 py-3 text-center font-medium text-[#475569]">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#64748b]"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : paginatedCompanies.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#64748b]"
                  >
                    {appliedSearch
                      ? "검색 결과가 없습니다."
                      : "등록된 업체가 없습니다."}
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((company, index) => (
                  <tr
                    key={company.id}
                    className={cn(
                      "border-b border-[#f1f5f9] last:border-b-0",
                      index % 2 === 1 && "bg-[#f8fafc]/40",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-[#0f172a]">
                      {company.name}
                    </td>
                    <td className="px-5 py-3.5 text-[#475569]">
                      {company.businessNumber || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#475569]">
                      {company.representative || "-"}
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3.5 text-[#475569]">
                      {company.address || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#475569]">
                      {company.phone || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-[#475569]">
                      {company.email || "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(company)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Pencil className="size-3.5" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(company)}
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

        <div className="flex items-center justify-between border-t border-[#e2e8f0] px-5 py-4">
          <p className="text-xs text-[#64748b]">
            전체 {filteredCompanies.length}건 중{" "}
            {filteredCompanies.length === 0
              ? 0
              : (currentPage - 1) * PAGE_SIZE + 1}
            –{Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)}건
            표시
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#475569] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    pageNum === currentPage
                      ? "bg-[#4f6ef7] text-white"
                      : "border border-[#e2e8f0] text-[#475569] hover:border-[#4f6ef7] hover:text-[#4f6ef7]",
                  )}
                >
                  {pageNum}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#475569] transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="다음 페이지"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#ffffff] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0f172a]">
                {editingId ? "업체 수정" : "업체 추가"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex size-8 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#e2e8f0] hover:text-[#475569]"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField
                label="업체명"
                required
                value={form.name}
                placeholder="업체명"
                onChange={(name) => setForm((f) => ({ ...f, name }))}
              />
              <FormField
                label="사업자번호"
                value={form.businessNumber}
                placeholder="000-00-00000"
                onChange={(businessNumber) =>
                  setForm((f) => ({ ...f, businessNumber }))
                }
              />
              <FormField
                label="대표자"
                value={form.representative}
                placeholder="대표자명"
                onChange={(representative) =>
                  setForm((f) => ({ ...f, representative }))
                }
              />
              <FormField
                label="주소"
                value={form.address}
                placeholder="주소"
                onChange={(address) => setForm((f) => ({ ...f, address }))}
              />
              <FormField
                label="전화번호"
                value={form.phone}
                placeholder="02-0000-0000"
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
              />
              <FormField
                label="이메일"
                type="email"
                value={form.email}
                placeholder="email@example.com"
                onChange={(email) => setForm((f) => ({ ...f, email }))}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-4 text-sm font-medium text-[#475569] transition-colors hover:border-slate-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "저장 중..." : editingId ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
