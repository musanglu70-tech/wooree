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

interface Hospital {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  doctorName: string;
}

interface HospitalForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  doctorName: string;
}

const EMPTY_FORM: HospitalForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  doctorName: "",
};

const PAGE_SIZE = 10;

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRow(row: Record<string, unknown>): Hospital {
  return {
    id: toStr(row.id),
    name: toStr(row.name ?? row.hospital_name),
    code: toStr(row.code ?? row.hospital_code),
    address: toStr(row.address),
    phone: toStr(row.phone ?? row.phone_number ?? row.tel),
    doctorName: toStr(row.doctor_name ?? row.doctor),
  };
}

function FormField({
  label,
  required,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

export function HospitalsContent() {
  const supabase = useMemo(() => createClient(), []);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HospitalForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadHospitals = useMemo(
    () => async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        toast.error("병의원 목록을 불러오지 못했습니다: " + error.message);
        setHospitals([]);
      } else {
        setHospitals(
          ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
        );
      }
      setIsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  const filteredHospitals = useMemo(() => {
    const keyword = appliedSearch.trim();
    if (!keyword) return hospitals;
    return hospitals.filter(
      (hospital) =>
        hospital.name.includes(keyword) ||
        hospital.code.includes(keyword) ||
        hospital.doctorName.includes(keyword) ||
        hospital.address.includes(keyword),
    );
  }, [hospitals, appliedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHospitals.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedHospitals = filteredHospitals.slice(
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

  const openEditModal = (hospital: Hospital) => {
    setEditingId(hospital.id);
    setForm({
      name: hospital.name,
      code: hospital.code,
      address: hospital.address,
      phone: hospital.phone,
      doctorName: hospital.doctorName,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("병의원명을 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        doctor_name: form.doctorName.trim() || null,
      };

      const { error } = editingId
        ? await supabase.from("hospitals").update(payload).eq("id", editingId)
        : await supabase.from("hospitals").insert(payload);

      if (error) {
        toast.error(
          (editingId ? "수정" : "등록") + " 실패: " + error.message,
        );
        return;
      }

      toast.success(editingId ? "수정되었습니다." : "등록되었습니다.");
      setIsModalOpen(false);
      await loadHospitals();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (hospital: Hospital) => {
    if (!window.confirm(`'${hospital.name}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    const { error } = await supabase
      .from("hospitals")
      .delete()
      .eq("id", hospital.id);

    if (error) {
      toast.error("삭제 실패: " + error.message);
      return;
    }

    toast.success("삭제되었습니다.");
    await loadHospitals();
  };

  return (
    <div className="space-y-4">
      {/* 검색 */}
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
              placeholder="병의원명, 코드, 의사명, 주소 검색"
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
            병의원 추가
          </button>
        </div>
      </section>

      {/* 테이블 */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">
                  병의원명
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">코드</th>
                <th className="px-5 py-3 font-medium text-slate-600">주소</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  전화번호
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">의사명</th>
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
              ) : paginatedHospitals.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    {appliedSearch
                      ? "검색 결과가 없습니다."
                      : "등록된 병의원이 없습니다."}
                  </td>
                </tr>
              ) : (
                paginatedHospitals.map((hospital, index) => (
                  <tr
                    key={hospital.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {hospital.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {hospital.code || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {hospital.address || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {hospital.phone || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {hospital.doctorName || "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(hospital)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Pencil className="size-3.5" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(hospital)}
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

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500">
            전체 {filteredHospitals.length}건 중{" "}
            {filteredHospitals.length === 0
              ? 0
              : (currentPage - 1) * PAGE_SIZE + 1}
            –{Math.min(currentPage * PAGE_SIZE, filteredHospitals.length)}건
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

      {/* 추가/수정 모달 */}
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
                {editingId ? "병의원 수정" : "병의원 추가"}
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
              <FormField
                label="병의원명"
                required
                value={form.name}
                placeholder="병의원명"
                onChange={(name) => setForm((f) => ({ ...f, name }))}
              />
              <FormField
                label="코드"
                value={form.code}
                placeholder="병의원 코드"
                onChange={(code) => setForm((f) => ({ ...f, code }))}
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
                label="의사명"
                value={form.doctorName}
                placeholder="의사명"
                onChange={(doctorName) =>
                  setForm((f) => ({ ...f, doctorName }))
                }
              />
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
