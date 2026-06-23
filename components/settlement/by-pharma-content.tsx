"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Download, FolderOpen, Mail, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  SendEmailModal,
  type SettlementEmailTarget,
} from "@/components/settlement/send-email-modal";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const STORAGE_BUCKET = "settlement-files";

interface PharmaCompany {
  id: string;
  name: string;
}

interface SettlementFile {
  id: string;
  fileName: string;
  filePath: string;
  pharma: string;
  month: string;
  uploadedAt: string;
  status: string;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRow(row: Record<string, unknown>): SettlementFile {
  const pharma = row.pharma_companies as { name?: string } | null;
  const month = toStr(row.settlement_month);

  return {
    id: toStr(row.id),
    fileName: toStr(row.file_name),
    filePath: toStr(row.file_path),
    pharma: toStr(pharma?.name),
    month: month.length >= 7 ? month.slice(0, 7) : month,
    uploadedAt: toStr(row.uploaded_at).slice(0, 16).replace("T", " "),
    status: toStr(row.status),
  };
}

function formatMonthLabel(month: string) {
  if (!month) return "-";
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? name.slice(dotIndex) : "";
  const base = (dotIndex >= 0 ? name.slice(0, dotIndex) : name)
    .replace(/[^\w-]/g, "_")
    .slice(0, 80);
  return `${base || "file"}${ext}`;
}

function monthToSettlementDate(month: string): string {
  return month ? `${month}-01` : "";
}

function StatusBadge({ status }: { status: string }) {
  if (!status) {
    return <span className="text-slate-400">-</span>;
  }

  const label =
    status === "pending"
      ? "대기"
      : status === "reviewed"
        ? "검토완료"
        : status === "archived"
          ? "보관"
          : status;

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      {label}
    </span>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

export function ByPharmaContent() {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SettlementFile[]>([]);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadPharmaId, setUploadPharmaId] = useState("");
  const [uploadMonth, setUploadMonth] = useState(
    () => new Date().toISOString().slice(0, 7),
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [emailTarget, setEmailTarget] = useState<SettlementEmailTarget | null>(
    null,
  );
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const loadFiles = useMemo(
    () => async () => {
      const { data, error } = await supabase
        .from("settlement_files")
        .select("*, pharma_companies(name)")
        .order("uploaded_at", { ascending: false });

      if (error) {
        toast.error("정산자료를 불러오지 못했습니다: " + error.message);
        setFiles([]);
      } else {
        setFiles(
          ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
        );
      }
      setIsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    async function init() {
      const { data, error } = await supabase
        .from("pharma_companies")
        .select("id, name")
        .order("name", { ascending: true });

      if (active && !error) {
        setPharmaCompanies((data as PharmaCompany[]) ?? []);
      }

      await loadFiles();
    }

    void init();

    return () => {
      active = false;
    };
  }, [supabase, loadFiles]);

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setPendingFile(file);
  };

  const handleUpload = async () => {
    if (!uploadPharmaId) {
      toast.error("제약사를 선택해주세요.");
      return;
    }
    if (!uploadMonth) {
      toast.error("정산월을 선택해주세요.");
      return;
    }
    if (!pendingFile) {
      toast.error("업로드할 파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);

    const filePath = `${uploadPharmaId}/${uploadMonth}/${Date.now()}_${sanitizeFileName(pendingFile.name)}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, pendingFile, { upsert: false });

      if (uploadError) {
        toast.error("파일 업로드 실패: " + uploadError.message);
        return;
      }

      const { error: insertError } = await supabase
        .from("settlement_files")
        .insert({
          file_name: pendingFile.name,
          file_path: filePath,
          pharma_company_id: uploadPharmaId,
          settlement_month: monthToSettlementDate(uploadMonth),
          status: "pending",
          uploaded_at: new Date().toISOString(),
        });

      if (insertError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        toast.error("파일 정보 저장 실패: " + insertError.message);
        return;
      }

      toast.success("업로드되었습니다.");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadFiles();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: SettlementFile) => {
    if (!file.filePath) {
      toast.error("파일 경로 정보가 없습니다.");
      return;
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(file.filePath, 60);

    if (error || !data?.signedUrl) {
      toast.error(
        "다운로드 링크 생성 실패: " + (error?.message ?? "알 수 없는 오류"),
      );
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const openEmailModal = (file: SettlementFile) => {
    setEmailTarget({
      id: file.id,
      fileName: file.fileName,
      pharma: file.pharma,
      month: file.month,
    });
    setIsEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    if (isSendingEmail) return;
    setIsEmailModalOpen(false);
    setEmailTarget(null);
  };

  const handleSendEmail = async (to: string) => {
    if (!emailTarget) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          settlementFileId: emailTarget.id,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        success?: boolean;
      };

      if (!response.ok) {
        toast.error(body.details ?? body.error ?? "이메일 발송에 실패했습니다.");
        return;
      }

      toast.success(`${to}로 정산 안내 메일을 발송했습니다.`);
      setIsEmailModalOpen(false);
      setEmailTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "이메일 발송 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          정산자료 업로드
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              제약사 <span className="text-red-500">*</span>
            </label>
            <select
              value={uploadPharmaId}
              onChange={(e) => setUploadPharmaId(e.target.value)}
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
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              정산월 <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={uploadMonth}
              onChange={(e) => setUploadMonth(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              파일 <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className={cn(
                inputClassName,
                "cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700",
              )}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="size-4" />
              {isUploading ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </div>
        {pendingFile && (
          <p className="mt-3 text-xs text-slate-500">
            선택된 파일: {pendingFile.name}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          전체 {files.length.toLocaleString("ko-KR")}건
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium text-slate-600">파일명</th>
                <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                <th className="px-5 py-3 font-medium text-slate-600">정산월</th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  업로드일
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">
                  액션
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
              ) : files.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    등록된 정산자료가 없습니다.
                  </td>
                </tr>
              ) : (
                files.map((file, index) => (
                  <tr
                    key={file.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        <FolderOpen className="size-4 text-slate-400" />
                        {file.fileName || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-slate-400" />
                        {file.pharma || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {formatMonthLabel(file.month)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {file.uploadedAt || "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={file.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEmailModal(file)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Mail className="size-3.5" />
                          이메일 발송
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
                        >
                          <Download className="size-3.5" />
                          다운로드
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SendEmailModal
        open={isEmailModalOpen}
        target={emailTarget}
        isSending={isSendingEmail}
        onClose={closeEmailModal}
        onSubmit={handleSendEmail}
      />
    </div>
  );
}
