"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Scan,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { prepareImageForOcr } from "@/lib/edi/prepare-ocr-image";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { ProductCodeInput } from "@/components/edi/product-code-input";
import {
  countFilledPrescriptionRows,
  downloadPrescriptionUploadTemplate,
  parsePrescriptionExcel,
} from "@/lib/excel/prescription-import";
import { createRxRow, rowAmount, type RxRow, type RxType } from "@/types/edi";
import {
  buildOcrRunSummary,
  countFileNeedsReview,
  enrichRowsWithMaster,
  isRowNeedsReview,
  isRowZeroAmount,
} from "@/lib/edi/ocr-master-match";
import type { OcrPrescriptionResult } from "@/types/ocr";
import type { OcrRunSummary } from "@/types/ocr-summary";

interface PharmaCompany {
  id: string;
  name: string;
}

function monthToDate(month: string): string | null {
  return month ? `${month}-01` : null;
}

function findPharmaCompanyId(
  name: string,
  companies: PharmaCompany[],
): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  const normalize = (value: string) =>
    value
      .replace(/\s/g, "")
      .replace(/^\(?주\)?|\(유\)/gi, "")
      .toLowerCase();

  const target = normalize(trimmed);

  for (const company of companies) {
    const candidate = normalize(company.name);
    if (
      candidate === target ||
      candidate.includes(target) ||
      target.includes(candidate)
    ) {
      return company.id;
    }
  }

  return "";
}

function buildRowsFromOcrItems(
  items: OcrPrescriptionResult["items"],
): RxRow[] {
  if (items.length === 0) {
    return Array.from({ length: 5 }, createRxRow);
  }

  const mapped = items.map((item) => {
    const isPharmaFormat =
      item.prescriptionCount > 0 && item.totalUsage > 0;

    if (isPharmaFormat) {
      return {
        ...createRxRow(),
        code: item.code,
        name: item.name,
        unit: item.unit,
        prescriptionCount: String(item.prescriptionCount),
        price: String(item.unitPrice),
        totalUsage: String(item.totalUsage),
        totalAmount: String(item.totalAmount),
        inN: String(item.totalUsage),
        outN: "0",
        type: "처방" as RxType,
        needsReview: item.needsReview,
      };
    }

    const quantity = item.quantity || 1;
    const unitPrice =
      item.unitPrice > 0
        ? item.unitPrice
        : item.amount > 0
          ? Math.round(item.amount / quantity)
          : 0;

    return {
      ...createRxRow(),
      code: item.code,
      name: item.name,
      unit: item.unit,
      prescriptionCount: item.prescriptionCount
        ? String(item.prescriptionCount)
        : "0",
      price: String(unitPrice),
      totalUsage: String(item.totalUsage || quantity),
      totalAmount: String(item.totalAmount || item.amount),
      inN: String(quantity),
      outN: "0",
      type: "처방" as RxType,
      needsReview: item.needsReview,
    };
  });

  if (mapped.length === 0) {
    return Array.from({ length: 5 }, createRxRow);
  }
  return mapped;
}

const CARD =
  "rounded-xl border border-[#e8d9bc] bg-[#fdf8f0] p-5 shadow-sm";

const inputClassName =
  "w-full rounded-lg border border-[#d4c5a9] bg-[#fdf8f0] px-3 py-2 text-sm text-[#2c1f0e] outline-none transition-colors placeholder:text-[#b5a080] focus:border-[#c4973d] focus:ring-2 focus:ring-[#c4973d]/20";

const tableInputClassName =
  "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs hover:border-[#d4c5a9] focus:border-[#c4973d] focus:bg-[#fdf8f0] focus:outline-none focus:ring-2 focus:ring-[#c4973d]/12";

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-[#7a5c2e]">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

export function EdiNewForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<RxRow[]>([]);
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>([]);
  const [excelPharma, setExcelPharma] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [ocrFiles, setOcrFiles] = useState<File[]>([]);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrSummary, setOcrSummary] = useState<OcrRunSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExcelUploading, setIsExcelUploading] = useState(false);
  const [isEmailImporting, setIsEmailImporting] = useState(false);
  const [emailImportMessage, setEmailImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const [pharmaCompanyId, setPharmaCompanyId] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [memo, setMemo] = useState("");
  const [prescriptionMonth, setPrescriptionMonth] = useState("2026-05");
  const [settlementMonth, setSettlementMonth] = useState("2026-06");

  useEffect(() => {
    setRows(Array.from({ length: 5 }, createRxRow));
  }, []);

  useEffect(() => {
    let active = true;

    supabase
      .from("pharma_companies")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("제약사 목록을 불러오지 못했습니다: " + error.message);
          return;
        }
        setPharmaCompanies((data as PharmaCompany[]) ?? []);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + rowAmount(row), 0),
    [rows],
  );

  const updateRow = (index: number, patch: Partial<RxRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, createRxRow()]);

  const deleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOcrFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setOcrFiles((prev) => [...prev, ...Array.from(files)]);
  }, []);

  const resetOcr = () => {
    setOcrFiles([]);
    setOcrSummary(null);
    if (ocrInputRef.current) ocrInputRef.current.value = "";
  };

  const applyOcrHeaderFields = (
    result: OcrPrescriptionResult,
    isFirst: boolean,
  ) => {
    if (!isFirst) return;

    if (result.hospitalName) {
      setHospitalName(result.hospitalName);
    }

    if (result.pharmaCompanyName) {
      const pharmaId = findPharmaCompanyId(
        result.pharmaCompanyName,
        pharmaCompanies,
      );
      if (pharmaId) {
        setPharmaCompanyId(pharmaId);
      } else {
        toast.info(
          `제약사 "${result.pharmaCompanyName}"를 목록에서 찾지 못했습니다. 직접 선택해주세요.`,
        );
      }
    }

    if (result.businessNumber) {
      setBusinessNumber(result.businessNumber);
    }

    if (result.prescriptionDate) {
      setPrescriptionMonth(result.prescriptionDate.slice(0, 7));
    }

    const memoParts: string[] = [];
    if (result.patientName) memoParts.push(`환자: ${result.patientName}`);
    if (result.doctorName) memoParts.push(`의사: ${result.doctorName}`);
    if (memoParts.length > 0) {
      setMemo(memoParts.join(" / "));
    }
  };

  const handleRunOcr = async () => {
    if (ocrFiles.length === 0) {
      toast.error("처방전 파일을 선택해주세요.");
      return;
    }

    setIsOcrLoading(true);
    setOcrSummary(null);

    try {
      const allRows: RxRow[] = [];
      const fileResults: OcrRunSummary["files"] = [];
      let resolvedPharmaId = pharmaCompanyId;

      for (let index = 0; index < ocrFiles.length; index += 1) {
        const file = ocrFiles[index];
        const { base64: imageBase64, mimeType } = await prepareImageForOcr(file);

        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            mimeType: mimeType || "image/jpeg",
          }),
        });

        const result = (await response.json()) as OcrPrescriptionResult & {
          message?: string;
          error?: string;
          details?: string;
        };

        if (!response.ok) {
          const errMsg =
            result.details ??
            result.message ??
            result.error ??
            "OCR 처리에 실패했습니다.";
          toast.error(`[${index + 1}] ${file.name}: ${errMsg}`);
          continue;
        }

        applyOcrHeaderFields(result, index === 0);

        if (index === 0 && result.pharmaCompanyName) {
          resolvedPharmaId =
            findPharmaCompanyId(result.pharmaCompanyName, pharmaCompanies) ||
            resolvedPharmaId;
        }

        const fileRows = buildRowsFromOcrItems(result.items);
        allRows.push(...fileRows);

        fileResults.push({
          index: index + 1,
          fileName: file.name,
          extracted: result.items.length,
          needsReview: 0,
        });
      }

      if (allRows.length === 0) {
        toast.error("추출된 처방 항목이 없습니다.");
        return;
      }

      const hasPharma = Boolean(resolvedPharmaId || pharmaCompanyId);
      const { rows: enrichedRows, master } = await enrichRowsWithMaster(
        allRows,
        { hasPharma },
      );

      let rowOffset = 0;
      const enrichedFileResults = fileResults.map((file) => {
        const slice = enrichedRows.slice(rowOffset, rowOffset + file.extracted);
        rowOffset += file.extracted;
        return {
          ...file,
          needsReview: countFileNeedsReview(slice),
        };
      });

      const summary = buildOcrRunSummary({
        fileResults: enrichedFileResults,
        pharmaMissing: !hasPharma,
        master,
      });

      setRows(enrichedRows);
      setOcrSummary(summary);
      toast.success(summary.lines[0]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "OCR 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setIsOcrLoading(false);
    }
  };

  const applyExcelRows = useCallback(
    (nextRows: RxRow[]) => {
      setRows(nextRows);
      if (excelPharma) {
        setPharmaCompanyId(excelPharma);
      }
      toast.success(`${nextRows.length}개 품목 업로드 완료`);
    },
    [excelPharma],
  );

  const handleDownloadTemplate = () => {
    downloadPrescriptionUploadTemplate();
  };

  const handleExcelUpload = async (file: File) => {
    setIsExcelUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsedRows = parsePrescriptionExcel(buffer);
      const filledCount = countFilledPrescriptionRows(rows);

      if (filledCount > 0) {
        const confirmed = window.confirm(
          `기존 입력된 ${filledCount}개 행이 있습니다. 덮어쓸까요?`,
        );
        if (!confirmed) return;
      }

      applyExcelRows(parsedRows);
    } catch {
      toast.error("올바른 형식의 파일이 아닙니다");
    } finally {
      setIsExcelUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExcelFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleExcelUpload(file);
  };

  const handleEmailImport = async () => {
    setIsEmailImporting(true);
    setEmailImportMessage(null);

    try {
      const res = await fetch("/api/email-import");
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        results?: Array<{
          messageId: string;
          sender: string;
          subject: string;
          attachment: string;
          status: "success" | "error" | "skipped";
          data?: {
            type: string;
            rows?: number;
            items?: RxRow[];
            pharmaCompanyName?: string;
            hospitalName?: string;
            businessNumber?: string;
            prescriptionDate?: string;
          };
          error?: string;
        }>;
      };

      if (!res.ok) {
        toast.error(data.error ?? "이메일 가져오기 실패");
        setEmailImportMessage(data.error ?? "오류가 발생했습니다.");
        return;
      }

      const results = data.results ?? [];
      const successes = results.filter((r) => r.status === "success");

      if (successes.length === 0) {
        const msg = data.message ?? "처리된 이메일이 없습니다.";
        toast.info(msg);
        setEmailImportMessage(msg);
        return;
      }

      // 첫 번째 성공 결과를 폼에 적용
      const first = successes[0];
      const firstData = first.data;

      if (firstData) {
        if (firstData.pharmaCompanyName) {
          const pharmaId = findPharmaCompanyId(firstData.pharmaCompanyName, pharmaCompanies);
          if (pharmaId) setPharmaCompanyId(pharmaId);
        }
        if (firstData.hospitalName) setHospitalName(firstData.hospitalName);
        if (firstData.businessNumber) setBusinessNumber(firstData.businessNumber);
        if (firstData.prescriptionDate) {
          setPrescriptionMonth(firstData.prescriptionDate.slice(0, 7));
        }
        if (firstData.items && firstData.items.length > 0) {
          setRows(firstData.items);
        }
      }

      const msg = data.message ?? `${successes.length}건 이메일에서 가져오기 완료`;
      toast.success(msg);
      setEmailImportMessage(msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "이메일 가져오기 중 오류 발생";
      toast.error(msg);
      setEmailImportMessage(msg);
    } finally {
      setIsEmailImporting(false);
    }
  };

  const handleSave = async () => {
    if (!pharmaCompanyId) {
      toast.error("제약사를 선택해주세요.");
      return;
    }
    if (!hospitalName.trim()) {
      toast.error("병의원명을 입력해주세요.");
      return;
    }
    if (!prescriptionMonth) {
      toast.error("처방월을 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("로그인이 필요합니다. 다시 로그인해주세요.");
        return;
      }

      // 첨부파일 먼저 임시 ID로 Storage에 업로드
      const attachmentUrls: string[] = [];
      if (ocrFiles.length > 0) {
        for (const file of ocrFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("prescription-attachments")
            .upload(path, file, { upsert: false });
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("prescription-attachments")
              .getPublicUrl(path);
            if (urlData?.publicUrl) attachmentUrls.push(urlData.publicUrl);
          }
        }
      }

      const { data: prescription, error: headerError } = await supabase
        .from("prescriptions")
        .insert({
          pharma_company_id: pharmaCompanyId,
          hospital_name: hospitalName.trim(),
          business_number: businessNumber.trim() || null,
          prescription_date: monthToDate(prescriptionMonth),
          settlement_date: monthToDate(settlementMonth),
          memo: memo.trim() || null,
          status: "saved",
          created_by: user.id,
          ...(attachmentUrls.length > 0 ? { attachment_urls: attachmentUrls } : {}),
        })
        .select("id")
        .single();

      if (headerError || !prescription) {
        toast.error(
          "저장 실패: " + (headerError?.message ?? "처방 헤더 저장에 실패했습니다."),
        );
        return;
      }

      const items = rows
        .filter(
          (row) =>
            row.name.trim() !== "" ||
            Number(row.price) > 0 ||
            Number(row.totalUsage) > 0 ||
            Number(row.totalAmount) > 0 ||
            Number(row.inN) > 0 ||
            Number(row.outN) > 0,
        )
        .map((row, index) => ({
          prescription_id: prescription.id,
          seq: index + 1,
          insurance_code: row.code,
          product_name: row.name,
          unit_price: Number(row.price) || 0,
          quantity_original: Number(row.inN) || 0,
          quantity_external: Number(row.outN) || 0,
          amount: rowAmount(row),
        }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("prescription_items")
          .insert(items);

        if (itemsError) {
          toast.error("저장 실패: " + itemsError.message);
          return;
        }
      }

      toast.success("저장되었습니다.");
      router.push("/edi/list");
    } finally {
      setIsSaving(false);
    }
  };

  const pharmaOptions = pharmaCompanies.map((pharma) => (
    <option key={pharma.id} value={pharma.id}>
      {pharma.name}
    </option>
  ));

  return (
    <div className="space-y-4">
      {/* 1. 처방전 AI 자동입력 */}
      <section className={CARD}>
        <h2 className="mb-1 text-sm font-semibold text-[#2c1f0e]">
          처방전 사진 업로드(AI 자동입력)
        </h2>
        <p className="mb-4 text-xs text-[#9a7c4e]">
          처방전 이미지 또는 PDF를 업로드하면 AI가 자동으로 정보를
          추출합니다.
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => !isOcrLoading && ocrInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") ocrInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleOcrFiles(e.dataTransfer.files);
          }}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            isDragOver
              ? "border-[#c4973d] bg-[rgba(196,151,61,0.06)]"
              : "border-[#e8d9bc] bg-[#f5ede0] hover:border-[#c4973d] hover:bg-[rgba(196,151,61,0.04)]",
            isOcrLoading && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="mx-auto mb-2 size-8 text-[#c4973d]" />
          <p className="text-sm text-[#5a3e1b]">
            클릭하거나 파일을 드래그하세요
          </p>
          <p className="mt-1 text-xs text-[#b5a080]">
            이미지(JPG, PNG), PDF 지원
          </p>
          {ocrFiles.length > 0 && (
            <p className="mt-3 text-xs font-medium text-[#c4973d]">
              {ocrFiles[0].name}
              {ocrFiles.length > 1 ? ` 외 ${ocrFiles.length - 1}개` : ""}
            </p>
          )}
        </div>
        <input
          ref={ocrInputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleOcrFiles(e.target.files)}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunOcr}
            disabled={isOcrLoading || ocrFiles.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOcrLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Scan className="size-3.5" />
            )}
            {isOcrLoading ? "OCR 처리 중..." : "업로드 및 OCR 실행"}
          </button>
          <button
            type="button"
            onClick={resetOcr}
            disabled={isOcrLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 py-2 text-xs font-medium text-[#5a3e1b] transition-colors hover:border-slate-300 disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" />
            초기화
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-[#e8d9bc] bg-[#f5ede0] px-4 py-3 text-xs text-[#7a5c2e]">
          {isOcrLoading ? (
            <span className="inline-flex items-center gap-2 text-[#9a7c4e]">
              <Loader2 className="size-3.5 animate-spin text-[#c4973d]" />
              처방전을 분석하고 있습니다...
            </span>
          ) : ocrSummary ? (
            <ul className="space-y-1">
              {ocrSummary.lines.map((line, index) => (
                <li
                  key={index}
                  className={cn(
                    line.startsWith("⚠️") && "font-medium text-amber-700",
                    line.startsWith("✅") && "text-[#5a3e1b]",
                    index === 0 && "font-semibold text-[#2c1f0e]",
                  )}
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[#9a7c4e]">
              OCR 결과가 여기에 표시됩니다. 추출된 데이터는 아래 폼에 자동
              입력됩니다.
            </span>
          )}
        </div>
      </section>

      {/* 2. 이메일에서 가져오기 */}
      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#2c1f0e]">
              이메일에서 가져오기
            </h2>
            <p className="mt-1 text-xs text-[#9a7c4e]">
              Gmail 받은편지함의 첨부파일(엑셀/이미지)을 자동으로 읽어 입력합니다
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleEmailImport()}
            disabled={isEmailImporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEmailImporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            {isEmailImporting ? "이메일 확인 중..." : "Gmail에서 가져오기"}
          </button>
        </div>
        {emailImportMessage && (
          <div className="mt-3 rounded-lg border border-[#e8d9bc] bg-[#f5ede0] px-4 py-3 text-xs text-[#7a5c2e]">
            {emailImportMessage}
          </div>
        )}
      </section>

      {/* 2. 엑셀 일괄 업로드 */}
      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#2c1f0e]">
              엑셀 일괄 업로드
            </h2>
            <p className="mt-1 text-xs text-[#9a7c4e]">
              여러 병의원을 엑셀 파일 한 장으로 한번에 저장
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9bc] bg-[#fdf8f0] px-3 py-2 text-xs font-medium text-[#5a3e1b] transition-colors hover:border-[#c4973d] hover:text-[#c4973d]"
            >
              <Download className="size-3.5" />
              양식 다운로드
            </button>
            <select
              value={excelPharma}
              onChange={(e) => setExcelPharma(e.target.value)}
              className={cn(inputClassName, "min-w-[160px] text-xs")}
            >
              <option value="">제약사 선택 (필수)</option>
              {pharmaOptions}
            </select>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExcelUploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExcelUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {isExcelUploading ? "업로드 중..." : "엑셀 업로드"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={handleExcelFileChange}
            />
          </div>
        </div>
      </section>

      {/* 3. 기본 정보 */}
      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-[#2c1f0e]">기본 정보</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel required>제약사명</FieldLabel>
            <select
              className={inputClassName}
              value={pharmaCompanyId}
              onChange={(e) => setPharmaCompanyId(e.target.value)}
            >
              <option value="">제약사명 선택</option>
              {pharmaOptions}
            </select>
          </div>
          <div>
            <FieldLabel>사업자번호</FieldLabel>
            <input
              className={inputClassName}
              placeholder="000-00-00000"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>비고</FieldLabel>
            <input
              className={inputClassName}
              placeholder="메모"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel required>병의원명</FieldLabel>
            <input
              className={inputClassName}
              placeholder="병의원명"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel required>처방월</FieldLabel>
            <input
              type="month"
              className={inputClassName}
              value={prescriptionMonth}
              onChange={(e) => setPrescriptionMonth(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>정산월</FieldLabel>
            <input
              type="month"
              className={inputClassName}
              value={settlementMonth}
              onChange={(e) => setSettlementMonth(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 4. 처방입력 테이블 */}
      <section className={CARD}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#2c1f0e]">처방입력</h2>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
          >
            <Plus className="size-3.5" />
            행 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e8d9bc] bg-[#f5ede0]">
                <th className="w-16 px-2 py-2.5" />
                <th className="px-2 py-2.5 text-left font-medium text-[#9a7c4e]">
                  순번
                </th>
                <th className="px-2 py-2.5 text-left font-medium text-[#9a7c4e]">
                  보험코드
                </th>
                <th className="px-2 py-2.5 text-left font-medium text-[#9a7c4e]">
                  제품명
                </th>
                <th className="px-2 py-2.5 text-left font-medium text-[#9a7c4e]">
                  단위
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  처방횟수
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  단가
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  총사용량
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  총금액
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  원내수량
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  원외수량
                </th>
                <th className="px-2 py-2.5 text-left font-medium text-[#9a7c4e]">
                  처방/조제
                </th>
                <th className="px-2 py-2.5 text-right font-medium text-[#9a7c4e]">
                  처방금액
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const amount = rowAmount(row);
                const zeroAmount = isRowZeroAmount(row);
                const needsReview = isRowNeedsReview(row);
                const zeroAmountCellClass = zeroAmount
                  ? "bg-red-100 ring-1 ring-red-200"
                  : "";

                return (
                  <tr
                    key={index}
                    className={cn(
                      "border-b border-[#f0e4d0] hover:bg-[#f0e6d0]/60",
                      zeroAmount && "bg-red-50/40",
                    )}
                  >
                    <td className="px-1 py-1">
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => deleteRow(index)}
                          className="flex size-[22px] items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                          aria-label="행 삭제"
                        >
                          <X className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={addRow}
                          className="flex size-[22px] items-center justify-center rounded-md text-[#c4973d] hover:bg-[rgba(196,151,61,0.1)]"
                          aria-label="행 추가"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[#7a5c2e]">{index + 1}</td>
                    <td className="px-1 py-1">
                      <ProductCodeInput
                        value={row.code}
                        needsReview={needsReview}
                        onChange={(code) =>
                          updateRow(index, {
                            code,
                            commissionRate: null,
                            extraCommissionRate: null,
                            needsReview: false,
                            masterMatched: false,
                          })
                        }
                        commissionRate={row.commissionRate}
                        extraCommissionRate={row.extraCommissionRate}
                        onSelect={(product) =>
                          updateRow(index, {
                            code: product.insuranceCode,
                            name: row.name || product.productName,
                            price:
                              Number(row.price) > 0
                                ? row.price
                                : String(product.unitPrice),
                            commissionRate: product.commissionRate,
                            extraCommissionRate: product.extraCommissionRate,
                            needsReview: false,
                            masterMatched: true,
                          })
                        }
                        className={tableInputClassName}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.name}
                        onChange={(e) =>
                          updateRow(index, { name: e.target.value })
                        }
                        placeholder="제품명"
                        className={cn(tableInputClassName, "min-w-[120px]")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.unit}
                        onChange={(e) =>
                          updateRow(index, { unit: e.target.value })
                        }
                        placeholder="1캡슐"
                        className={cn(tableInputClassName, "min-w-[56px]")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.prescriptionCount}
                        onChange={(e) =>
                          updateRow(index, {
                            prescriptionCount: e.target.value,
                          })
                        }
                        className={cn(tableInputClassName, "text-right tabular-nums")}
                      />
                    </td>
                    <td className={cn("px-1 py-1", zeroAmountCellClass)}>
                      <input
                        value={row.price}
                        onChange={(e) =>
                          updateRow(index, { price: e.target.value })
                        }
                        className={cn(tableInputClassName, "text-right tabular-nums")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.totalUsage}
                        onChange={(e) =>
                          updateRow(index, { totalUsage: e.target.value })
                        }
                        className={cn(tableInputClassName, "text-right tabular-nums")}
                      />
                    </td>
                    <td className={cn("px-1 py-1", zeroAmountCellClass)}>
                      <input
                        value={row.totalAmount}
                        onChange={(e) =>
                          updateRow(index, { totalAmount: e.target.value })
                        }
                        className={cn(tableInputClassName, "text-right tabular-nums")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.inN}
                        onChange={(e) =>
                          updateRow(index, { inN: e.target.value })
                        }
                        className={cn(tableInputClassName, "text-right tabular-nums")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.outN}
                        onChange={(e) =>
                          updateRow(index, { outN: e.target.value })
                        }
                        className={cn(tableInputClassName, "text-right tabular-nums")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.type}
                        onChange={(e) =>
                          updateRow(index, {
                            type: e.target.value as RxType,
                          })
                        }
                        className={tableInputClassName}
                      >
                        <option value="처방">처방</option>
                        <option value="조제">조제</option>
                      </select>
                    </td>
                    <td
                      className={cn(
                        "px-2 py-1.5 text-right font-semibold tabular-nums text-[#c4973d]",
                        zeroAmountCellClass,
                      )}
                    >
                      {amount ? formatWon(amount) : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#f5ede0] font-semibold">
                <td colSpan={