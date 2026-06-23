"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface PharmaCompany {
  id: string;
  name: string;
}

interface ItemRow {
  id: string | null; // null = 신규 추가
  seq: number;
  insurance_code: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  amount: number;
  item_type: "처방" | "조제" | "공급";
}

interface Prescription {
  id: string;
  pharma_company_id: string;
  hospital_name: string;
  business_number: string | null;
  prescription_date: string | null;
  settlement_date: string | null;
  memo: string | null;
  status: string;
  pharma_companies: { name: string } | null;
}

function toMonth(d: string | null) {
  return d ? d.slice(0, 7) : "";
}
function monthToDate(m: string) {
  return m ? `${m}-01` : null;
}
function formatWon(n: number) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR");
}

const ITEM_TYPES = ["처방", "조제", "공급"] as const;

interface Props {
  prescriptionId: string;
}

export function EdiInspectDetail({ prescriptionId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [siblingIds, setSiblingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 편집 state
  const [pharmaId, setPharmaId] = useState("");
  const [hospital, setHospital] = useState("");
  const [prescriptionMonth, setPrescriptionMonth] = useState("");
  const [settlementMonth, setSettlementMonth] = useState("");
  const [memo, setMemo] = useState("");
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.all([
      supabase
        .from("prescriptions")
        .select("*, pharma_companies(name)")
        .eq("id", prescriptionId)
        .single(),
      supabase
        .from("prescription_items")
        .select("*")
        .eq("prescription_id", prescriptionId)
        .order("seq"),
      supabase.from("pharma_companies").select("id, name").order("name"),
      supabase
        .from("prescriptions")
        .select("id")
        .eq("status", "saved")
        .order("created_at", { ascending: false }),
    ]).then(([presRes, itemsRes, pharmaRes, siblingsRes]) => {
      if (!active) return;
      if (presRes.error || !presRes.data) {
        toast.error("처방 정보를 불러오지 못했습니다.");
        router.push("/edi/inspect");
        return;
      }
      const pres = presRes.data as Prescription;
      setPrescription(pres);
      setPharmaId(pres.pharma_company_id ?? "");
      setHospital(pres.hospital_name ?? "");
      setPrescriptionMonth(toMonth(pres.prescription_date));
      setSettlementMonth(toMonth(pres.settlement_date));
      setMemo(pres.memo ?? "");

      const rawItems = (itemsRes.data ?? []) as Record<string, unknown>[];
      setItemRows(
        rawItems.map((r, i) => ({
          id: String(r.id ?? ""),
          seq: Number(r.seq ?? i + 1),
          insurance_code: String(r.insurance_code ?? ""),
          product_name: String(r.product_name ?? ""),
          unit_price: Number(r.unit_price ?? 0),
          quantity: Number(r.quantity_original ?? 0) + Number(r.quantity_external ?? 0),
          amount: Number(r.amount ?? 0),
          item_type: (r.item_type as "처방" | "조제" | "공급") ?? "처방",
        })),
      );

      setPharmaCompanies((pharmaRes.data ?? []) as PharmaCompany[]);
      setSiblingIds(
        ((siblingsRes.data ?? []) as { id: string }[]).map((r) => r.id),
      );
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [prescriptionId, supabase, router]);

  const currentIndex = siblingIds.indexOf(prescriptionId);
  const prevId = currentIndex > 0 ? siblingIds[currentIndex - 1] : null;
  const nextId =
    currentIndex >= 0 && currentIndex < siblingIds.length - 1
      ? siblingIds[currentIndex + 1]
      : null;

  const total = useMemo(
    () => itemRows.reduce((s, r) => s + r.amount, 0),
    [itemRows],
  );

  const updateItem = (idx: number, patch: Partial<ItemRow>) => {
    setItemRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        if ("unit_price" in patch || "quantity" in patch) {
          next.amount = next.unit_price * next.quantity;
        }
        return next;
      }),
    );
  };

  const addRow = () => {
    setItemRows((prev) => [
      ...prev,
      {
        id: null,
        seq: prev.length + 1,
        insurance_code: "",
        product_name: "",
        unit_price: 0,
        quantity: 0,
        amount: 0,
        item_type: "처방",
      },
    ]);
  };

  const removeRow = (idx: number) => {
    setItemRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (confirm: boolean) => {
    if (!prescription) return;
    setIsSaving(true);
    try {
      const { error: presErr } = await supabase
        .from("prescriptions")
        .update({
          pharma_company_id: pharmaId || null,
          hospital_name: hospital.trim(),
          prescription_date: monthToDate(prescriptionMonth),
          settlement_date: monthToDate(settlementMonth),
          memo: memo.trim() || null,
          ...(confirm ? { status: "confirmed" } : {}),
        })
        .eq("id", prescriptionId);

      if (presErr) {
        toast.error("저장 실패: " + presErr.message);
        return;
      }

      for (let i = 0; i < itemRows.length; i++) {
        const row = itemRows[i];
        const payload = {
          prescription_id: prescriptionId,
          seq: i + 1,
          insurance_code: row.insurance_code,
          product_name: row.product_name,
          unit_price: row.unit_price,
          quantity_original: row.quantity,
          quantity_external: 0,
          amount: row.amount,
          item_type: row.item_type,
        };
        if (row.id) {
          await supabase
            .from("prescription_items")
            .update(payload)
            .eq("id", row.id);
        } else {
          await supabase.from("prescription_items").insert(payload);
        }
      }

      if (confirm) {
        toast.success("확정 저장되었습니다.");
        if (nextId) {
          router.push(`/edi/inspect/${nextId}`);
        } else {
          router.push("/edi/inspect");
        }
      } else {
        toast.success("저장되었습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const pharmaName =
    pharmaCompanies.find((p) => p.id === pharmaId)?.name ??
    prescription?.pharma_companies?.name ??
    "";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#4f6ef7]" />
      </div>
    );
  }
  if (!prescription) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f1f5f9]">
      {/* ── 상단 네비게이션 바 ── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        {/* 왼쪽: 목록, 이전/다음, 순번 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/edi/inspect")}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft className="size-3.5" />
            검수 목록
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            type="button"
            disabled={!prevId}
            onClick={() => prevId && router.push(`/edi/inspect/${prevId}`)}
            className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" />
            이전
          </button>
          <span className="min-w-[48px] text-center text-xs font-medium text-slate-700">
            {currentIndex + 1} / {siblingIds.length}
          </span>
          <button
            type="button"
            disabled={!nextId}
            onClick={() => nextId && router.push(`/edi/inspect/${nextId}`)}
            className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* 오른쪽: 제약사·병의원 표시 */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{pharmaName || "-"}</span>
          <span>|</span>
          <span>{hospital || "-"}</span>
        </div>
      </div>

      {/* ── 메인 두 패널 ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 원본 첨부파일 */}
        <div className="flex w-[45%] shrink-0 flex-col border-r border-slate-200 bg-slate-900">
          <div className="flex h-10 items-center gap-2 border-b border-slate-700 px-4">
            <span className="text-xs font-medium text-slate-300">
              📎 원본 첨부파일
            </span>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-slate-500">
              <div className="mx-auto mb-2 size-12 rounded-lg bg-slate-800 p-3 text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">첨부파일 없음</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 입력 데이터 검수 */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* 폼 헤더 */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-5">
            <span className="text-sm font-semibold text-slate-900">
              📋 입력 데이터 검수
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                prescription.status === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {prescription.status === "confirmed" ? "처정" : "미처정"}
            </span>
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 기본 정보 */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  제약사
                </label>
                <select
                  value={pharmaId}
                  onChange={(e) => setPharmaId(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] focus:bg-white"
                >
                  <option value="">선택</option>
                  {pharmaCompanies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  거래처 (병의원)
                </label>
                <input
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] focus:bg-white"
                  placeholder="병의원명"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  처방월
                </label>
                <input
                  type="month"
                  value={prescriptionMonth}
                  onChange={(e) => setPrescriptionMonth(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  정산월
                </label>
                <input
                  type="month"
                  value={settlementMonth}
                  onChange={(e) => setSettlementMonth(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] focus:bg-white"
                />
              </div>
            </div>

            {/* 세부 입력 내역 테이블 */}
            <div className="mb-1 text-xs font-medium text-slate-600">
              세부 입력 내역
            </div>
            <div className="mb-2 overflow-hidden rounded border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-2 py-2 text-left font-medium">제품명</th>
                    <th className="w-16 px-2 py-2 text-right font-medium">단가</th>
                    <th className="w-16 px-2 py-2 text-right font-medium">수량</th>
                    <th className="w-20 px-2 py-2 text-right font-medium">금액</th>
                    <th className="w-20 px-2 py-2 text-center font-medium">
                      처방/조제/공급
                    </th>
                    <th className="w-6 px-1 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-2 py-1.5">
                        <input
                          value={row.product_name}
                          onChange={(e) =>
                            updateItem(idx, { product_name: e.target.value })
                          }
                          className="w-full bg-transparent outline-none hover:bg-slate-50 focus:rounded focus:bg-slate-50 focus:px-1"
                          placeholder="제품명"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.unit_price || ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              unit_price: Number(e.target.value),
                            })
                          }
                          className="w-full bg-transparent text-right outline-none hover:bg-slate-50 focus:rounded focus:bg-slate-50"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.quantity || ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className="w-full bg-transparent text-right outline-none hover:bg-slate-50 focus:rounded focus:bg-slate-50"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                        {row.amount ? row.amount.toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.item_type}
                          onChange={(e) =>
                            updateItem(idx, {
                              item_type: e.target.value as
                                | "처방"
                                | "조제"
                                | "공급",
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-xs outline-none focus:border-[#4f6ef7]"
                        >
                          {ITEM_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* 합계 행 */}
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td
                      colSpan={3}
                      className="px-2 py-2 text-right text-xs font-medium text-slate-600"
                    >
                      합계
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-bold text-[#4f6ef7]">
                      {formatWon(total)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 행 추가 버튼 */}
            <button
              type="button"
              onClick={addRow}
              className="mb-4 flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 py-2 text-xs text-slate-500 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
            >
              <Plus className="size-3.5" />
              행 추가
            </button>

            {/* 비고 */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                비고 (검수 메모)
              </label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-[#4f6ef7] focus:bg-white"
                placeholder="검수 메모 (선택)"
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="shrink-0 border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4f6ef7] py-3 text-sm font-semibold text-white hover:bg-[#3d5ce5] disabled:opacity-60"
              >
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                확정 저장
              </button>
              {nextId && (
                <button
                  type="button"
                  onClick={() => router.push(`/edi/inspect/${nextId}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300"
                >
                  다음
                  <ChevronRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
