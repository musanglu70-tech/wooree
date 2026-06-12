"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Download, FolderOpen, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const STORAGE_BUCKET = "settlements";

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
    fileName: toStr(row.file_name ?? row.filename ?? row.name),
    filePath: toStr(row.file_path ?? row.path ?? row.storage_path),
    pharma: toStr(pharma?.name ?? row.pharma_company_name ?? row.pharma_name),
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

function StatusBadge({ status }: { status: string }) {
  if (!status) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      {status}
    </span>
  );
}

export function ByPharmaContent() {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SettlementFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

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
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const filePath = `${new Date().toISOString().slice(0, 7)}/${Date.now()}_${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        toast.error("파일 업로드 실패: " + uploadError.message);
        return;
      }

      const { error: insertError } = await supabase
        .from("settlement_files")
        .insert({
          file_name: file.name,
          file_path: filePath,
        });

      if (insertError) {
        toast.error("파일 정보 저장 실패: " + insertError.message);
        return;
      }

      toast.success("업로드되었습니다.");
      await loadFiles();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          전체 {files.length.toLocaleString("ko-KR")}건
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="size-4" />
          {isUploading ? "업로드 중..." : "직접 업로드"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
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
                      <div className="flex items-center justify-center">
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
    </div>
  );
}
