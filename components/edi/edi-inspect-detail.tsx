"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plus, Upload, X } from "lucide-react";
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
  "w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7]/20";

const topSelectCls =
  "h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#4f6ef7] cursor-pointer";

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
  const [imageContrast, setImageContrast] = useState(1.0);
  const [isBlackWhite, setIsBlackWhite] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // storage path 추출 (전체 URL → path 변환 지원)
  function toStoragePath(urlOrPath: string): string {
    const marker = "/prescription-attachments/";
    const idx = urlOrPath.indexOf(marker);
    return idx !== -1 ? urlOrPath.slice(idx + marker.length) : urlOrPath;
  }

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

  // attachment_urls 변경 시 signed URL 생성
  useEffect(() => {
    if (attachmentUrls.length === 0) { setSignedUrls([]); return; }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        attachmentUrls.map(async (u) => {
          const path = toStoragePath(u);
          const { data } = await supabase.storage
            .from("prescription-attachments")
            .createSignedUrl(path, 3600);
          return data?.signedUrl ?? u;
        }),
      );
      if (!cancelled) setSignedUrls(results);
    })();
    return () => { cancelled = true; };
  }, [attachmentUrls, supabase]);

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

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length || !prescription) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { toast.error("로그인이 필요합니다."); return; }
    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userData.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("prescription-attachments")
          .upload(path, file, { upsert: false });
        if (!uploadError) {
          newUrls.push(path);
        } else {
          toast.error(`업로드 실패: ${uploadError.message}`);
        }
      }
      if (newUrls.length > 0) {
        const updatedUrls = [...attachmentUrls, ...newUrls];
        const { error } = await supabase
          .from("prescriptions")
          .update({ attachment_urls: updatedUrls })
          .eq("id", prescriptionId);
        if (error) {
          toast.error("저장 실패: " + error.message);
        } else {
          setAttachmentUrls(updatedUrls);
          setAttachmentIndex(updatedUrls.length - 1);
          toast.success(`${newUrls.length}개 파일 첨부 완료!`);
        }
      }
    } finally {
      setIsUploading(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
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
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="size-8 animate-spin text-[#4f6ef7]" />
      </div>
    );
  }
  if (!prescription) return null;

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden p-2.5" style={{ fontFamily: "sans-serif", background: "#f1f5f9" }}>

      {/* ── 상단 바 ── */}
      <div className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
        <span className="flex shrink-0 items-center gap-1 px-1 text-sm font-semibold text-slate-700">
          🔍 검수
        </span>
        <span className="shrink-0 text-xs text-slate-400">
          {currentIndex >= 0 ? currentIndex + 1 : "-"} / {filteredIds.length}
        </span>
        <button
          type="button"
          disabled={!prevId}
          onClick={() => prevId && router.push(`/edi/inspect/${prevId}`)}
          className="flex shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs disabled:opacity-40"
          style={{ color: prevId ? "#374151" : "#9ca3af" }}
        >
          <ChevronLeft className="size-3" />
          이전
        </button>
        <button
          type="button"
          disabled={!nextId}
          onClick={() => nextId && router.push(`/edi/inspect/${nextId}`)}
          className="flex shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold disabled:opacity-40"
          style={{ color: nextId ? "#374151" : "#9ca3af" }}
        >
          다음
          <ChevronRight className="size-3" />
        </button>

        <div className="flex-1" />

        <select value={fPharma} onChange={e => setFPharma(e.target.value)} className={topSelectCls}>
          <option value="">제약사 전체</option>
          {pharmaOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={topSelectCls}>
          <option value="">업체 전체</option>
          <option value="우리메디텍">우리메디텍</option>
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

        {!isConfirmed && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(true)}
            className="shrink-0 rounded px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-60"
            style={{ backgroundColor: "#4f6ef7" }}
          >
            {isSaving ? <Loader2 className="inline size-3 animate-spin" /> : "✔ 확정"}
          </button>
        )}
        {isConfirmed && (
          <span className="shrink-0 rounded bg-green-700 px-3 py-1 text-xs font-bold text-white">
            확정완료
          </span>
        )}
      </div>

      {/* ── 메인 두 패널 ── */}
      <div className="flex flex-1 gap-2 overflow-hidden">

        {/* ── 왼쪽: 원본 첨부파일 ── */}
        <div className="flex w-[48%] shrink-0 flex-col overflow-hidden rounded-lg border border-[#e2e8f0] shadow-sm" style={{ background: "#f8fafc" }}>
          <div className="flex h-10 shrink-0 items-center gap-2 px-3" style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <span className="shrink-0 text-xs font-semibold text-slate-700">📎 원본 첨부파일</span>
            <div className="flex flex-1 items-center justify-end gap-0.5">
              {/* 페이지 이동 */}
              <button type="button" disabled={attachmentIndex <= 0} onClick={() => setAttachmentIndex(i => i - 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700 disabled:opacity-30">◀</button>
              <span className="min-w-[32px] text-center text-xs text-slate-400">
                {attachmentUrls.length > 0 ? `${attachmentIndex + 1}/${attachmentUrls.length}` : "0/0"}
              </span>
              <button type="button" disabled={attachmentIndex >= attachmentUrls.length - 1} onClick={() => setAttachmentIndex(i => i + 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700 disabled:opacity-30">▶</button>
              <div className="mx-1 h-3 w-px bg-[#cbd5e1]" />
              {/* 줌 */}
              <button type="button" onClick={() => setImageScale(s => Math.min(s + 0.25, 4.0))}
                className="flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700">+</button>
              <span className="min-w-[36px] text-center text-xs tabular-nums text-slate-500">
                {Math.round(imageScale * 100)}%
              </span>
              <button type="button" onClick={() => setImageScale(s => Math.max(s - 0.25, 0.25))}
                className="flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700">−</button>
              {/* 원본 크기 */}
              <button type="button" onClick={() => setImageScale(1.0)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700">
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="1" y="1" width="14" height="14" rx="1.5" />
                  <rect x="4" y="4" width="8" height="8" rx="1" />
                </svg>
              </button>
              <div className="mx-1 h-3 w-px bg-[#cbd5e1]" />
              {/* 대비 */}
              <button type="button"
                onClick={() => setImageContrast(c => c >= 2.0 ? 1.0 : c + 0.5)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700"
                title="대비 높이기"
                style={imageContrast > 1.0 ? { background: "#4f6ef7", color: "#fff" } : {}}
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
                  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1a7 7 0 0 1 0 14V1z"/>
                </svg>
              </button>
              {/* 흑백 */}
              <button type="button"
                onClick={() => setIsBlackWhite(b => !b)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700"
                title="흑백 모드"
                style={isBlackWhite ? { background: "#4f6ef7", color: "#fff" } : {}}
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
                  <rect x="1" y="1" width="6" height="14" rx="1" fill="currentColor"/>
                  <rect x="9" y="1" width="6" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
              <div className="mx-1 h-3 w-px bg-[#cbd5e1]" />
              {/* 파일 추가 */}
              <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={isUploading}
                className="flex h-6 items-center gap-1 rounded px-2 text-xs text-slate-400 hover:bg-[#f1f5f9] hover:text-slate-700 disabled:opacity-50">
                {isUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                추가
              </button>
              <input ref={attachmentInputRef} type="file" accept="image/*,.pdf" multiple className="hidden"
                onChange={e => handleAttachmentUpload(e.target.files)} />
            </div>
          </div>

          {/* 첨부파일 영역 - 휠 줌 지원 */}
          <div
            className="relative flex flex-1 overflow-auto"
            onWheel={(e) => {
              e.preventDefault();
              setImageScale(s => Math.min(Math.max(s - e.deltaY * 0.001, 0.25), 4.0));
            }}
          >
            {signedUrls.length > 0 && signedUrls[attachmentIndex] ? (
              <div className="flex flex-1 items-center justify-center">
                {attachmentUrls[attachmentIndex]?.toLowerCase().includes(".pdf") ? (
                  <iframe src={signedUrls[attachmentIndex]} className="h-full w-full" title="처방전" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrls[attachmentIndex]}
                    alt="처방전"
                    style={{
                      transform: `scale(${imageScale})`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s ease",
                      filter: `grayscale(${isBlackWhite ? 1 : 0}) contrast(${imageContrast})`,
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex w-full max-w-[300px] flex-col items-center justify-center gap-5 rounded-2xl py-14 transition-colors hover:bg-[#f1f5f9] disabled:opacity-50"
                  style={{ border: "1.5px dashed #c7d2fe", background: "rgba(79,110,247,0.04)" }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                    {isUploading
                      ? <Loader2 className="size-8 animate-spin" style={{ color: "#4f6ef7" }} />
                      : <Upload className="size-8" style={{ color: "#4f6ef7" }} />
                    }
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: "#475569" }}>
                      {isUploading ? "업로드 중..." : "처방전 이미지 첨부"}
                    </p>
                    <p className="mt-1.5 text-xs" style={{ color: "#94a3b8" }}>클릭하여 파일을 선택하세요</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 입력 데이터 검수 ── */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">

          <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-5">
            <span className="text-sm font-semibold text-slate-800">📋 입력 데이터 검수</span>
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

          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* 기본 정보 */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">제약사</label>
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
                <label className="mb-1 block text-xs font-semibold text-slate-600">거래처 (병원)</label>
                <input value={hospital} onChange={(e) => setHospital(e.target.value)} className={fieldCls} placeholder="병의원명" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">처방일</label>
                <input type="month" value={prescriptionMonth} onChange={(e) => setPrescriptionMonth(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">정산일</label>
                <input type="month" value={settlementMonth} onChange={(e) => setSettlementMonth(e.target.value)} className={fieldCls} />
              </div>
            </div>

            {/* 업체명 */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">업체명 (담당자)</label>
              <input value="우리메디텍" readOnly className={fieldCls + " cursor-default opacity-70"} />
            </div>

            {/* 세부 입력 내역 */}
            <div className="mb-1 text-xs font-semibold text-[#475569]">세부 입력 내역</div>
            <div className="mb-2 overflow-hidden rounded border border-[#cbd5e1]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">제품명</th>
                    <th className="w-16 px-2 py-2 text-right font-semibold text-slate-600">단가</th>
                    <th className="w-14 px-2 py-2 text-right font-semibold text-slate-600">수량</th>
                    <th className="w-20 px-2 py-2 text-right font-semibold text-slate-600">금액</th>
                    <th className="w-24 px-2 py-2 text-center font-semibold text-slate-600">처방/조제/공급내역</th>
                    <th className="w-6 px-1 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      <td className="px-2 py-1.5">
                        <input
                          value={row.product_name}
                          onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                          className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400 focus:rounded focus:bg-white focus:px-1 focus:ring-1 focus:ring-[#4f6ef7]"
                          placeholder="제품명"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.unit_price || ""}
                          onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                          className="w-full bg-transparent text-right text-slate-800 outline-none focus:rounded focus:bg-white focus:ring-1 focus:ring-[#4f6ef7]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.quantity || ""}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                          className="w-full bg-transparent text-right text-slate-800 outline-none focus:rounded focus:bg-white focus:ring-1 focus:ring-[#4f6ef7]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                        {row.amount ? row.amount.toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.item_type}
                          onChange={(e) => updateItem(idx, { item_type: e.target.value as "처방" | "조제" | "공급" })}
                          className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-xs outline-none focus:border-[#4f6ef7]"
                        >
                          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button type="button" onClick={() => removeRow(idx)} className="text-[#94a3b8] hover:text-red-500">
                          <X className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-slate-600">합계</td>
                    <td className="px-2 py-2 text-right text-sm font-bold text-blue-600">
                      {total.toLocaleString("ko-KR")}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 행 추가 */}
            <button
              type="button"
              onClick={addRow}
              className="mb-4 flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 py-2 text-xs text-slate-500 hover:bg-slate-50"
            >
              <Plus className="size-3.5" />
              행 추가
            </button>

            {/* 비고 */}
            <div className="mb-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">비고</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={fieldCls}
                placeholder="검수 메모 (선택)"
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white shadow-md transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#4f6ef7" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3d5ce5")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4f6ef7")}
              >
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                ✔ 확정 저장
              </button>
              {nextId && (
                <button
                  type="button"
                  onClick={() => router.push(`/edi/inspect/${nextId}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-medium text-[#475569] hover:bg-[#f1f5f9]"
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
