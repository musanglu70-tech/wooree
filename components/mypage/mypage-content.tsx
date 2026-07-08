"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, GraduationCap, Building2, Upload, Eye, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

const BUCKET = "prescription-attachments";

type DocKey = "doc_cso_url" | "doc_edu_url" | "doc_biz_url";

interface Profile {
  company_name: string;
  ceo_name: string;
  business_number: string;
  office_address: string;
  cso_number: string;
  signature_url: string;
  doc_cso_url: string;
  doc_edu_url: string;
  doc_biz_url: string;
}

const EMPTY: Profile = {
  company_name: "",
  ceo_name: "",
  business_number: "",
  office_address: "",
  cso_number: "",
  signature_url: "",
  doc_cso_url: "",
  doc_edu_url: "",
  doc_biz_url: "",
};

const DOCS: { key: DocKey; label: string; icon: typeof FileText }[] = [
  { key: "doc_cso_url", label: "CSO 신고증", icon: FileText },
  { key: "doc_edu_url", label: "교육이수확인증", icon: GraduationCap },
  { key: "doc_biz_url", label: "사업자등록증", icon: Building2 },
];

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}

export function MyPageContent() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      const r = data as Record<string, unknown>;
      setForm({
        company_name: toStr(r.company_name),
        ceo_name: toStr(r.ceo_name),
        business_number: toStr(r.business_number),
        office_address: toStr(r.office_address),
        cso_number: toStr(r.cso_number),
        signature_url: toStr(r.signature_url),
        doc_cso_url: toStr(r.doc_cso_url),
        doc_edu_url: toStr(r.doc_edu_url),
        doc_biz_url: toStr(r.doc_biz_url),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveInfo = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        company_name: form.company_name.trim() || null,
        ceo_name: form.ceo_name.trim() || null,
        business_number: form.business_number.trim() || null,
        office_address: form.office_address.trim() || null,
        cso_number: form.cso_number.trim() || null,
      });
      if (error) toast.error("저장 실패: " + error.message);
      else toast.success("저장되었습니다.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (key: DocKey, file: File) => {
    if (!userId) return;
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `mypage/${userId}/${key}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error("업로드 실패: " + error.message);
      return;
    }
    const { error: upErr } = await supabase
      .from("profiles")
      .upsert({ id: userId, [key]: path });
    if (upErr) toast.error("저장 실패: " + upErr.message);
    else {
      toast.success("등록되었습니다.");
      set(key, path);
    }
  };

  const viewFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    if (error || !data) {
      toast.error("파일을 열 수 없습니다.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  // ── 서명 캔버스 ──
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => (drawing.current = false);
  const clearSig = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };
  const saveSig = async () => {
    const c = canvasRef.current;
    if (!c || !userId) return;
    const blob = await new Promise<Blob | null>((res) =>
      c.toBlob(res, "image/png"),
    );
    if (!blob) return;
    const path = `mypage/${userId}/signature_${Date.now()}.png`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: "image/png" });
    if (error) {
      toast.error("서명 저장 실패: " + error.message);
      return;
    }
    await supabase.from("profiles").upsert({ id: userId, signature_url: path });
    set("signature_url", path);
    toast.success("서명이 저장되었습니다.");
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-slate-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 회사 정보 */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-slate-900">
            회사 정보
          </h2>
          <div className="space-y-4">
            {[
              ["회사명", "company_name", "회사명"],
              ["대표자명", "ceo_name", "대표자명"],
              ["사업자번호", "business_number", "000-00-00000"],
              ["영업소 소재지", "office_address", "주소"],
              ["CSO 신고번호", "cso_number", "CSO 신고번호"],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  {label}
                </label>
                <input
                  value={form[key as keyof Profile]}
                  placeholder={ph}
                  onChange={(e) => set(key as keyof Profile, e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={saveInfo}
              disabled={saving}
              className="h-10 w-full rounded-lg bg-[#4f6ef7] text-sm font-semibold text-white hover:bg-[#3d5ce5] disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </section>

        {/* 첨부서류 */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-slate-900">
            첨부서류
          </h2>
          <div className="space-y-3">
            {DOCS.map(({ key, label, icon: Icon }) => {
              const path = form[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {label}
                      </p>
                      <p
                        className={
                          path
                            ? "text-xs font-medium text-emerald-600"
                            : "text-xs text-slate-400"
                        }
                      >
                        {path ? "등록됨" : "미등록"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {path && (
                      <button
                        type="button"
                        onClick={() => viewFile(path)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                      >
                        <Eye className="size-3.5" />
                        보기
                      </button>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#4f6ef7] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#3d5ce5]">
                      {path ? <Check className="size-3.5" /> : <Upload className="size-3.5" />}
                      {path ? "변경" : "등록"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadFile(key, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 서명 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          대표 서명 / 도장
        </h2>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">
          계약서를 완료 처리할 때 갑(위탁사) 서명란에 자동으로 들어갑니다.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <canvas
            ref={canvasRef}
            width={360}
            height={160}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            className="touch-none rounded-lg border border-slate-300 bg-slate-50"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={clearSig}
              className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:border-slate-300"
            >
              지우기
            </button>
            <button
              type="button"
              onClick={saveSig}
              className="h-9 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white hover:bg-[#3d5ce5]"
            >
              서명 저장
            </button>
            {form.signature_url && (
              <button
                type="button"
                onClick={() => viewFile(form.signature_url)}
                className="text-xs text-[#4f6ef7] hover:underline"
              >
                저장된 서명 보기
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
