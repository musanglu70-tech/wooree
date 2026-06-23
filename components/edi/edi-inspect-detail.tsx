"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

interface PharmaCompany {
  id: string;
  name: string;
}

interface ItemRow {
  id: string | null;
  seq: number;
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
  prescription_date: string | null;
  settlement_date: string | null;
  memo: string | null;
  status: string;
  attachment_urls: string[] | null;
  pharma_companies: { name: string } | null;
}

interface SiblingInfo {
  id: string;
  pharmaName: string;
  hospitalName: string;
  month: string;
  status: string;
}

function toMonth(d: string | null) {
  return d ? d.slice(0, 7) : "";
}
function monthToDate(m: string) {
  return m ? `${m}-01` : null;
}

const ITEM_TYPES = ["처방", "조제", "공급"] as const;

const fieldCls =
  "w-full rounded border border-[#d4c5a9] bg-[#fdf8f0] px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[#c4973d] focus:bg-white";

const topSelectCls =
  "h-7 rounded border border-[#4a3a28] bg-[#3d3020] px-2 text-xs text-[#c8a96e] outline-none focus:border-[#c4973d] cursor-pointer";

interface Props {
  prescriptionId: string;
}

export function EdiInspectDetail({ prescriptionId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [siblings, setSiblings] = useState<SiblingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [attachmentIndex, setAttachmentIndex] = useState(0);
  const [imageScale, setImageScale] = useState(1.0);

  // 폼 필드
  const [pharmaId, setPharmaId] = useState("");
  const [pharmaInput, setPharmaInput] = useState("");
  const [hospital, setHospital] = useState("");
  const [prescriptionMonth, setPrescriptionMonth] = useState("");
  const [settlementMonth, setSettlementMonth] = useState("");
  const [memo, setMemo] = useState("");
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);

  // 상단 필터
  const [fPharma, setFPharma] = useState("");
  const [fHospital, setFHospital] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [fStatus, setFStatus] = useState("saved");

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.all([
      supabase.from("prescriptions").select("*, pharma_companies(name)").eq("id", prescriptionId).single(),
      supabase.from("prescription_items").select("*").eq("prescription_id", prescriptionId).order("seq"),
      supabase.from("pharma_companies").select("id, name").order("name"),
      supabase.from("prescriptions").select("id, hospital_name, prescription_date, status, pharma_companies(name)").order("created_at", { ascending: false }),
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
      setPharmaInput(pres.pharma_companies?.name ?? "");
      setHospital(pres.hospital_name ?? "");
      setPrescriptionMonth(toMonth(pres.prescription_date));
      setSettlementMonth(toMonth(pres.settlement_date));
      setMemo(pres.memo ?? "");
      setAttachmentUrls(pres.attachment_urls ?? []);
      setAttachmentIndex(0);

      const rawItems = (itemsRes.data ?? []) as Record<string, unknown>[];
      setItemRows(
        rawItems.map((r, i) => ({
          id: String(r.id ?? ""),
          seq: Number(r.seq ?? i + 1),
          product_name: String(r.product_name ?? ""),
          unit_price: Number(r.unit_price ?? 0),
          quantity: Number(r.quantity_original ?? 0) + Number(r.quantity_external ?? 0),
          amount: Number(r.amount ?? 0),
          item_type: (r.item_type as "처방" | "조제" | "공급") ?? "처방",
        })),
      );

      setPharmaCompanies((pharmaRes.data ?? []) as PharmaCompany[]);

      const rawSiblings = (siblingsRes.data ?? []) as Record<string, unknown>[];
      setSiblings(rawSiblings.map((r) => ({
        id: String(r.id),
        pharmaName: String((r.pharma_companies as { name?: string } | null)?.name ?? ""),
        hospitalName: String(r.hospital_name ?? ""),
        month: String(r.prescription_date ?? "").slice(0, 7),
        status: String(r.status ?? ""),
      })));

      setIsLoading(false);
    });

    return () => { active = false; };
  }, [prescriptionId, supabase, router]);

  // 필터 옵션
  const pharmaOptions = useMemo(() => Array.from(new Set(siblings.map(s => s.pharmaName).filter(Boolean))).sort(), [siblings]);
  const hospitalOptions = useMemo(() => Array.from(new Set(siblings.map(s => s.hospitalName).filter(Boolean))).sort(), [siblings]);
  const monthOptions = useMemo(() => Array.from(new Set(siblings.map(s => s.month).filter(Boolean))).sort().reverse(), [siblings]);

  // 필터 적용된 목록
  const filteredSiblings = useMemo(() => siblings.filter(s => {
    if (fPharma && s.pharmaName !== fPharma) return false;
    if (fHospital && s.hospitalName !== fHospital) return false;
    if (fMonth && s.month !== fMonth) return false;
    if (fStatus && s.status !== fStatus) return false;
    return true;
  }), [siblings, fPharma, fHospital, fMonth, fStatus]);

  const filteredIds = useMemo(() => filteredSiblings.map(s => s.id), [filteredSiblings]);
  const currentIndex = filteredIds.indexOf(prescriptionId);
  const prevId = currentIndex > 0 ? filteredIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < filteredIds.length - 1 ? filteredIds[currentIndex + 1] : null;

  const total = useMemo(() => itemRows.reduce((s, r) => s + r.amount, 0), [itemRows]);

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
      { id: null, seq: prev.length + 1, product_name: "", unit_price: 0, quantity: 0, amount: 0, item_type: "처방" },
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

      if (presErr) { toast.error("저장 실패: " + presErr.message); return; }

      for (let i = 0; i < itemRows.length; i++) {
        const row = itemRows[i];
        const payload = {
          prescription_id: prescriptionId,
          seq: i + 1,
          product_name: row.product_name,
          unit_price: row.unit_price,
          quantity_original: row.quantity,
          quantity_external: 0,
          amount: row.amount,
          item_type: row.item_type,
        };
        if (row.id) {
          await supabase.from("prescription_items").update(payload).eq("id", row.id);
        } else {
          await supabase.from("prescription_items").insert(payload);
        }
      }

      if (confirm) {
        toast.success("확정 저장되었습니다.");
        if (nextId) router.push(`/edi/inspect/${nextId}`);
        else router.push("/edi/inspect");
      } else {
        toast.success("저장되었습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const pharmaName = pharmaCompanies.find((p) => p.id === pharmaId)?.name ?? prescription?.pharma_companies?.name ?? "";
  const isConfirmed = prescription?.status === "confirmed";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2c2416]">
        <Loader2 className="size-8 animate-spin text-[#c4973d]" />
      </div>
    );
  }
  if (!prescription) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ fontFamily: "sans-serif" }}>

      {/* ── 상단 바 ── */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#3d3020] bg-[#2c2416] px-3">
        {/* 검수 태그 */}
        <span className="flex shrink-0 items-center gap-1 rounded bg-[#3d3020] px-2 py-1 text-xs font-medium text-[#e8c97a]">
          🔍 검수
        </span>

        {/* 카운터 */}
        <span className="shrink-0 text-xs font-semibold text-[#e8c97a]">
          {currentIndex + 1} / {filteredIds.length}
        </span>

        {/* 이전/다음 */}
        <button
          type="button"
          disabled={!prevId}
          onClick={() => prevId && router.push(`/edi/inspect/${prevId}`)}
          className="flex shrink-0 items-center gap-0.5 rounded px-2 py-1 text-xs text-[#b5a080] hover:text-[#e8c97a] disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" />
          이전
        </button>
        <button
          type="button"
          disabled={!nextId}
          onClick={() => nextId && router.push(`/edi/inspect/${nextId}`)}
          className="flex shrink-0 items-center gap-0.5 rounded px-2 py-1 text-xs text-[#b5a080] hover:text-[#e8c97a] disabled:opacity-30"
        >
          다음
          <ChevronRight className="size-3.5" />
        </button>

        <div className="flex-1" />

        {/* 필터 드롭다운 */}
        <select value={fPharma} onChange={e => setFPharma(e.target.value)} className={topSelectCls}>
          <option value="">제약사 전체</option>
          {pharmaOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={fHospital} onChange={e => setFHospital(e.target.value)} className={topSelectCls}>
          <option value="">거래처 전체</option>
          {hospitalOptions.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={fMonth} onChange={e => setFMonth(e.target.value)} className={topSelectCls}>
          <option value="">전체 월</option>
          {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={topSelectCls}>
          <option value="saved">미확정</option>
          <option value="confirmed">확정</option>
          <option value="">전체</option>
        </select>

        <div className="mx-1 h-5 w-px shrink-0 bg-[#4a3a28]" />

        {/* 초기화 */}
        <button
          type="button"
          onClick={() => { setFPharma(""); setFHospital(""); setFMonth(""); setFStatus("saved"); }}
          className="shrink-0 rounded px-2.5 py-1 text-xs text-[#b5a080] hover:bg-[#3d3020] hover:text-[#e8c97a]"
        >
          초기화
        </button>

        {/* 입증 확정 버튼 */}
        {!isConfirmed && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(true)}
            className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#c4973d" }}
          >
            {isSaving ? <Loader2 className="inline size-3.5 animate-spin" /> : "✔"} 입증 확정
          </button>
        )}
        {isConfirmed && (
          <span className="shrink-0 rounded-lg bg-green-700 px-4 py-1.5 text-xs font-bold text-white">
            ✔ 확정완료
          </span>
        )}
      </div>

      {/* ── 메인 두 패널 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 왼쪽: 원본 첨부파일 ── */}
        <div className="flex w-[45%] shrink-0 flex-col bg-[#1a1208]">
          {/* 패널 헤더 */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#3d3020] px-4">
            <span className="text-xs font-medium text-[#c4973d]">📎 원본 첨부파일</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={attachmentIndex <= 0}
                onClick={() => setAttachmentIndex((i) => i - 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-[#7a6040] hover:bg-[#3d3020] hover:text-[#c4973d] disabled:opacity-30"
              >◀</button>
              <button
                type="button"
                disabled={attachmentIndex >= attachmentUrls.length - 1}
                onClick={() => setAttachmentIndex((i) => i + 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-[#7a6040] hover:bg-[#3d3020] hover:text-[#c4973d] disabled:opacity-30"
              >▶</button>
              {attachmentUrls.length > 0 && (
                <span className="ml-1 text-xs text-[#7a6040]">
                  {attachmentIndex + 1}/{attachmentUrls.length}
                </span>
              )}
              <div className="mx-1 h-3 w-px bg-[#3d3020]" />
              <button type="button" onClick={() => setImageScale(s => Math.min(s + 0.2, 3.0))} className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-[#7a6040] hover:bg-[#3d3020] hover:text-[#c4973d]">+</button>
              <button type="button" onClick={() => setImageScale(s => Math.max(s - 0.2, 0.4))} className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-[#7a6040] hover:bg-[#3d3020] hover:text-[#c4973d]">−</button>
              <button type="button" onClick={() => setImageScale(1.0)} className="flex h-6 w-10 items-center justify-center rounded text-xs text-[#7a6040] hover:bg-[#3d3020] hover:text-[#c4973d]">맞춤</button>
            </div>
          </div>

          {/* 첨부파일 영역 */}
          <div className="flex flex-1 items-center justify-center overflow-auto">
            {attachmentUrls.length > 0 && attachmentUrls[attachmentIndex] ? (
              attachmentUrls[attachmentIndex].toLowerCase().includes(".pdf") ? (
                <iframe src={attachmentUrls[attachmentIndex]} className="h-full w-full" title="처방전" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachmentUrls[attachmentIndex]}
                  alt="처방전"
                  style={{ transform: `scale(${imageScale})`, transformOrigin: "center center", transition: "transform 0.15s ease" }}
                  className="max-h-full max-w-full object-contain"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#2c2416] text-[#4a3a28]">
                  <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={1}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <p className="text-sm text-[#4a3a28]">첨부파일 없음</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 입력 데이터 검수 ── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#fdf8f0]">

          {/* 폼 헤더 */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#e8d9bc] bg-[#f5ede0] px-5">
            <span className="text-sm font-semibold text-[#5a3e1b]">📋 입력 데이터 검수</span>
            <span
              className="rounded-full px-3 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: isConfirmed ? "#d4edda" : "#fff3cd",
                color: isConfirmed ? "#155724" : "#856404",
              }}
            >
              {isConfirmed ? "확정" : "미확정"}
            </span>
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* 기본 정보 */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#7a5c2e]">제약사</label>
                <input
                  value={pharmaInput}
                  onChange={(e) => {
                    setPharmaInput(e.target.value);
                    const found = pharmaCompanies.find(p => p.name === e.target.value);
                    setPharmaId(found?.id ?? "");
                  }}
                  list="pharma-datalist"
                  className={fieldCls}
                  placeholder="제약사명 입력"
                />
                <datalist id="pharma-datalist">
                  {pharmaCompanies.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#7a5c2e]">거래처 (병원)</label>
                <input value={hospital} onChange={(e) => setHospital(e.target.value)} className={fieldCls} placeholder="병의원명" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#7a5c2e]">처방월</label>
                <input type="month" value={prescriptionMonth} onChange={(e) => setPrescriptionMonth(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#7a5c2e]">정산월</label>
                <input type="month" value={settlementMonth} onChange={(e) => setSettlementMonth(e.target.value)} className={fieldCls} />
              </div>
            </div>

            {/* 업체명 */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-[#7a5c2e]">업제명 (업모자)</label>
              <input value="우리메디텍" readOnly className={fieldCls + " cursor-default opacity-70"} />
            </div>

            {/* 세부 입력 내역 */}
            <div className="mb-1 text-xs font-semibold text-[#7a5c2e]">세부 입력 내역</div>
            <div className="mb-2 overflow-hidden rounded border border-[#d4c5a9]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#d4c5a9] bg-[#f0e4cc]">
                    <th className="px-3 py-2 text-left font-semibold text-[#7a5c2e]">제품명</th>
                    <th className="w-16 px-2 py-2 text-right font-semibold text-[#7a5c2e]">단가</th>
                    <th className="w-14 px-2 py-2 text-right font-semibold text-[#7a5c2e]">수량</th>
                    <th className="w-20 px-2 py-2 text-right font-semibold text-[#7a5c2e]">금액</th>
                    <th className="w-24 px-2 py-2 text-center font-semibold text-[#7a5c2e]">처방/조제/공급내역</th>
                    <th className="w-6 px-1 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#ecdfc8] last:border-b-0 hover:bg-[#fdf3e3]">
                      <td className="px-2 py-1.5">
                        <input
                          value={row.product_name}
                          onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                          className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400 focus:rounded focus:bg-white focus:px-1 focus:ring-1 focus:ring-[#c4973d]"
                          placeholder="제품명"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.unit_price || ""}
                          onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                          className="w-full bg-transparent text-right text-slate-800 outline-none focus:rounded focus:bg-white focus:ring-1 focus:ring-[#c4973d]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.quantity || ""}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                          className="w-full bg-transparent text-right text-slate-800 outline-none focus:rounded focus:bg-white focus:ring-1 focus:ring-[#c4973d]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                        {row.amount ? row.amount.toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.item_type}
                          onChange={(e) => updateItem(idx, { item_type: e.target.value as "처방" | "조제" | "공급" })}
                          className="w-full rounded border border-[#d4c5a9] bg-[#fdf8f0] px-1 py-0.5 text-center text-xs outline-none focus:border-[#c4973d]"
                        >
                          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button type="button" onClick={() => removeRow(idx)} className="text-[#b5a080] hover:text-red-500">
                          <X className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* 합계 */}
                  <tr className="border-t border-[#d4c5a9] bg-[#f5ede0]">
                    <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-[#7a5c2e]">합계</td>
                    <td className="px-2 py-2 text-right text-sm font-bold text-[#c4973d]">
                      {total.toLocaleString("ko-KR")}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* + 명 추가 */}
            <button
              type="button"
              onClick={addRow}
              className="mb-4 flex w-full items-center justify-center gap-1 rounded border border-dashed border-[#c4973d] py-2 text-xs text-[#c4973d] hover:bg-[#fdf3e3]"
            >
              <Plus className="size-3.5" />
              명 추가
            </button>

            {/* 비고 */}
            <div className="mb-2">
              <label className="mb-1 block text-xs font-semibold text-[#7a5c2e]">비고</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={fieldCls}
                placeholder="검수 메모 (선택)"
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="shrink-0 border-t border-[#e8d9bc] bg-[#f5ede0] p-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white shadow-md transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#c4973d" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a87f30")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#c4973d")}
              >
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                ✔ 확정 저장
              </button>
              {nextId && (
                <button
                  type="button"
                  onClick={() => router.push(`/edi/inspect/${nextId}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#d4c5a9] bg-white px-5 py-3 text-sm font-medium text-[#7a5c2e] hover:bg-[#fdf3e3]"
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
