"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { formatWon } from "@/lib/edi/constants";

interface PharmaCompany {
  id: string;
  name: string;
}

interface PrescriptionItem {
  id: string;
  seq: number;
  insurance_code: string;
  product_name: string;
  unit_price: number;
  quantity_original: number;
  quantity_external: number;
  amount: number;
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

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toMonth(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 7);
}

function monthToDate(month: string): string | null {
  return month ? `${month}-01` : null;
}

function calcAmount(row: PrescriptionItem): number {
  return row.unit_price * (row.quantity_original + row.quantity_external);
}

interface Props {
  prescriptionId: string;
}

export function EdiInspectDetail({ prescriptionId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [siblingIds, setSiblingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 편집용 state
  const [pharmaId, setPharmaId] = useState("");
  const [hospital, setHospital] = useState("");
  const [bizNum, setBizNum] = useState("");
  const [prescriptionMonth, setPrescriptionMonth] = useState("");
  const [settlementMonth, setSettlementMonth] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    let active = true;

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
      setBizNum(pres.business_number ?? "");
      setPrescriptionMonth(toMonth(pres.prescription_date));
      setSettlementMonth(toMonth(pres.settlement_date));
      setMemo(pres.memo ?? "");

      const rawItems = (itemsRes.data ?? []) as PrescriptionItem[];
      setItems(rawItems.length > 0 ? rawItems : []);

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
    currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : null;

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );

  const updateItem = (index: number, patch: Partial<PrescriptionItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...patch };
        // amount 자동 계산
        if ("unit_price" in patch || "quantity_original" in patch || "quantity_external" in patch) {
          updated.amount = calcAmount(updated);
        }
        return updated;
      }),
    );
  };

  const handleSave = async (confirm: boolean) => {
    if (!prescription) return;
    setIsSaving(true);

    try {
      const { error: presError } = await supabase
        .from("prescriptions")
        .update({
          pharma_company_id: pharmaId,
          hospital_name: hospital.trim(),
          business_number: bizNum.trim() || null,
          prescription_date: monthToDate(prescriptionMonth),
          settlement_date: monthToDate(settlementMonth),
          memo: memo.trim() || null,
          ...(confirm ? { status: "confirmed" } : {}),
        })
        .eq("id", prescriptionId);

      if (presError) {
        toast.error("저장 실패: " + presError.message);
        return;
      }

      // 항목 업데이트
      for (const item of items) {
        await supabase
          .from("prescription_items")
          .update({
            insurance_code: item.insurance_code,
            product_name: item.product_name,
            unit_price: item.unit_price,
            quantity_original: item.quantity_original,
            quantity_external: item.quantity_external,
            amount: item.amount,
          })
          .eq("id", item.id);
      }

      if (confirm) {
        toast.success("확정 저장되었습니다.");
        // 다음 항목으로 이동하거나 목록으로
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="size-8 animate-spin text-[#4f6ef7]" />
      </div>
    );
  }

  if (!prescription) return null;

  const pharmaName =
    pharmaCompanies.find((p) => p.id === pharmaId)?.name ??
    prescription.pharma_companies?.name ??
    "-";

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1200px]">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/edi/inspect")}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft className="size-4" />
              검수 목록
            </button>
            <h1 className="text-xl font-semibold text-slate-900">
              입력 데이터 검수
            </h1>
          </div>

          {/* 이전 / 다음 */}
          {siblingIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                type="button"
                disabled={!prevId}
                onClick={() => prevId && router.push(`/edi/inspect/${prevId}`)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                이전
              </button>
              <span className="text-xs">
                {currentIndex + 1} / {siblingIds.length}
              </span>
              <button
                type="button"
                disabled={!nextId}
                onClick={() => nextId && router.push(`/edi/inspect/${nextId}`)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 기본 정보 카드 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            기본 정보
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                제약사
              </label>
              <select
                value={pharmaId}
                onChange={(e) => setPharmaId(e.target.value)}
                className={inputCls}
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
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                거래처 (병의원)
              </label>
              <input
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className={inputCls}
                placeholder="병의원명"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                사업자번호
              </label>
              <input
                value={bizNum}
                onChange={(e) => setBizNum(e.target.value)}
                className={inputCls}
                placeholder="000-00-00000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                처방월
              </label>
              <input
                type="month"
                value={prescriptionMonth}
                onChange={(e) => setPrescriptionMonth(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                정산월
              </label>
              <input
                type="month"
                value={settlementMonth}
                onChange={(e) => setSettlementMonth(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                비고
              </label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={inputCls}
                placeholder="메모"
              />
            </div>
          </div>
        </div>

        {/* 처방 항목 카드 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              세부 처방 내역{" "}
              <span className="font-normal text-slate-500">
                {items.length}건
              </span>
            </h2>
            <span className="text-sm font-semibold text-slate-900">
              합계 {formatWon(total)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-3 py-2.5 text-left font-medium">순번</th>
                  <th className="px-3 py-2.5 text-left font-medium">보험코드</th>
                  <th className="px-3 py-2.5 text-left font-medium">제품명</th>
                  <th className="px-3 py-2.5 text-right font-medium">단가</th>
                  <th className="px-3 py-2.5 text-right font-medium">원내수량</th>
                  <th className="px-3 py-2.5 text-right font-medium">원외수량</th>
                  <th className="px-3 py-2.5 text-right font-medium">금액</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      처방 항목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-slate-100 last:border-b-0",
                        idx % 2 === 1 && "bg-slate-50/40",
                      )}
                    >
                      <td className="px-3 py-2 text-slate-500">{item.seq}</td>
                      <td className="px-3 py-2">
                        <input
                          value={item.insurance_code}
                          onChange={(e) =>
                            updateItem(idx, { insurance_code: e.target.value })
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-[#4f6ef7] focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.product_name}
                          onChange={(e) =>
                            updateItem(idx, { product_name: e.target.value })
                          }
                          className="w-full min-w-[120px] rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-[#4f6ef7] focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(idx, {
                              unit_price: Number(e.target.value),
                            })
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right hover:border-slate-200 focus:border-[#4f6ef7] focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity_original}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity_original: Number(e.target.value),
                            })
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right hover:border-slate-200 focus:border-[#4f6ef7] focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity_external}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity_external: Number(e.target.value),
                            })
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right hover:border-slate-200 focus:border-[#4f6ef7] focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        {formatWon(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/edi/inspect")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300"
          >
            <X className="size-4" />
            취소
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              임시 저장
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3d5ce5] disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              확정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
