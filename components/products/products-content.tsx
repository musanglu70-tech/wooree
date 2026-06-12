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

interface PharmaCompany {
  id: string;
  name: string;
}

interface Product {
  id: string;
  insuranceCode: string;
  productName: string;
  pharmaCompanyId: string;
  pharmaName: string;
  unitPrice: number;
  isActive: boolean;
}

interface ProductForm {
  insuranceCode: string;
  productName: string;
  pharmaCompanyId: string;
  unitPrice: string;
  isActive: boolean;
}

const EMPTY_FORM: ProductForm = {
  insuranceCode: "",
  productName: "",
  pharmaCompanyId: "",
  unitPrice: "0",
  isActive: true,
};

const PAGE_SIZE = 10;

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeRow(row: Record<string, unknown>): Product {
  const pharma = row.pharma_companies as { id?: string; name?: string } | null;
  return {
    id: toStr(row.id),
    insuranceCode: toStr(row.insurance_code ?? row.code),
    productName: toStr(row.name),
    pharmaCompanyId: toStr(row.pharma_company_id ?? pharma?.id),
    pharmaName: toStr(pharma?.name),
    unitPrice: toNumber(row.unit_price ?? row.price),
    isActive: row.is_active !== false && row.is_active !== "false",
  };
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function ProductsContent() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useMemo(
    () => async () => {
      const [productsResult, pharmaResult] = await Promise.all([
        supabase
          .from("products")
          .select("*, pharma_companies(id, name)")
          .order("name", { ascending: true }),
        supabase
          .from("pharma_companies")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (productsResult.error) {
        toast.error(
          "의약품 목록을 불러오지 못했습니다: " + productsResult.error.message,
        );
        setProducts([]);
      } else {
        setProducts(
          ((productsResult.data as Record<string, unknown>[]) ?? []).map(
            normalizeRow,
          ),
        );
      }

      if (!pharmaResult.error) {
        setPharmaCompanies((pharmaResult.data as PharmaCompany[]) ?? []);
      }

      setIsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const keyword = appliedSearch.trim();
    if (!keyword) return products;
    return products.filter(
      (p) =>
        p.insuranceCode.includes(keyword) ||
        p.productName.includes(keyword),
    );
  }, [products, appliedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
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

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setForm({
      insuranceCode: product.insuranceCode,
      productName: product.productName,
      pharmaCompanyId: product.pharmaCompanyId,
      unitPrice: String(product.unitPrice),
      isActive: product.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.insuranceCode.trim()) {
      toast.error("보험코드를 입력해주세요.");
      return;
    }
    if (!form.productName.trim()) {
      toast.error("제품명을 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        insurance_code: form.insuranceCode.trim(),
        name: form.productName.trim(),
        pharma_company_id: form.pharmaCompanyId || null,
        unit_price: Number(form.unitPrice) || 0,
        is_active: form.isActive,
      };

      const { error } = editingId
        ? await supabase.from("products").update(payload).eq("id", editingId)
        : await supabase.from("products").insert(payload);

      if (error) {
        toast.error(
          (editingId ? "수정" : "등록") + " 실패: " + error.message,
        );
        return;
      }

      toast.success(editingId ? "수정되었습니다." : "등록되었습니다.");
      setIsModalOpen(false);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (
      !window.confirm(
        `'${product.productName}'을(를) 삭제하시겠습니까?`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      toast.error("삭제 실패: " + error.message);
      return;
    }

    toast.success("삭제되었습니다.");
    await loadData();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              검색
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="보험코드, 제품명 검색"
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
          >
            <Plus className="size-4" />
            의약품 추가
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">
                  보험코드
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">제품명</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  단가
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  활성여부
                </th>
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
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    {appliedSearch
                      ? "검색 결과가 없습니다."
                      : "등록된 의약품이 없습니다."}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, index) => (
                  <tr
                    key={product.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                      !product.isActive && "opacity-60",
                    )}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {product.insuranceCode}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {product.productName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {product.pharmaName || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                      {product.unitPrice.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          product.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {product.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Pencil className="size-3.5" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
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

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500">
            전체 {filteredProducts.length}건 중{" "}
            {filteredProducts.length === 0
              ? 0
              : (currentPage - 1) * PAGE_SIZE + 1}
            –{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)}건
            표시
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
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
                      : "border border-slate-200 text-slate-600 hover:border-[#4f6ef7] hover:text-[#4f6ef7]",
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
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {editingId ? "의약품 수정" : "의약품 추가"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="보험코드" required>
                <input
                  value={form.insuranceCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, insuranceCode: e.target.value }))
                  }
                  placeholder="643301120"
                  className={inputClassName}
                />
              </FormField>
              <FormField label="제품명" required>
                <input
                  value={form.productName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productName: e.target.value }))
                  }
                  placeholder="제품명"
                  className={inputClassName}
                />
              </FormField>
              <FormField label="제약사">
                <select
                  value={form.pharmaCompanyId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pharmaCompanyId: e.target.value,
                    }))
                  }
                  className={inputClassName}
                >
                  <option value="">선택 안함</option>
                  {pharmaCompanies.map((pharma) => (
                    <option key={pharma.id} value={pharma.id}>
                      {pharma.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="단가">
                <input
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitPrice: e.target.value }))
                  }
                  className={inputClassName}
                />
              </FormField>
              <FormField label="활성여부">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="size-4 rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7]"
                  />
                  활성
                </label>
              </FormField>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-50"
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
