import type { RxRow } from "@/types/edi";
import { rowAmount } from "@/types/edi";
import type {
  OcrFileResult,
  OcrMasterMatchStats,
  OcrRunSummary,
} from "@/types/ocr-summary";
import { fetchProductByCode } from "@/lib/edi/product-by-code";

export function isRowNeedsReview(row: RxRow): boolean {
  if (!row.code.trim()) return false;
  return Boolean(row.needsReview);
}

export function isRowZeroAmount(row: RxRow): boolean {
  if (!row.code.trim()) return false;
  return rowAmount(row) === 0;
}

export async function enrichRowsWithMaster(
  rows: RxRow[],
  options: { hasPharma: boolean },
): Promise<{ rows: RxRow[]; master: OcrMasterMatchStats }> {
  const enriched: RxRow[] = [];
  let matchedNames = 0;
  let matchedPrices = 0;
  let reNumberTotal = 0;

  for (const row of rows) {
    const code = row.code.trim();
    if (!code || code === "643301120") {
      enriched.push({ ...row, needsReview: false, masterMatched: false });
      continue;
    }

    reNumberTotal += 1;

    const product = await fetchProductByCode(code);

    if (!product) {
      enriched.push({
        ...row,
        needsReview: true,
        masterMatched: false,
      });
      continue;
    }

    const hadName = Boolean(row.name.trim());
    const hadPrice = Number(row.price) > 0;
    const nextName = hadName ? row.name : product.name;
    const nextPrice =
      hadPrice ? row.price : String(product.unit_price ?? 0);

    if (!hadName && product.name) matchedNames += 1;
    if (!hadPrice && Number(product.unit_price) > 0) matchedPrices += 1;

    enriched.push({
      ...row,
      name: nextName,
      price: nextPrice,
      commissionRate: options.hasPharma
        ? product.commission_rate
        : row.commissionRate,
      extraCommissionRate: options.hasPharma
        ? product.extra_commission_rate
        : row.extraCommissionRate,
      masterMatched: true,
      needsReview: false,
    });
  }

  const finalMaster: OcrMasterMatchStats = {
    matchedNames,
    matchedPrices,
    reNumberTotal,
    reNumberResolved: enriched.filter(
      (row) => row.code.trim() && row.code !== "643301120" && row.masterMatched,
    ).length,
    reNumberNeedsReview: enriched.filter(
      (row) =>
        row.code.trim() &&
        row.code !== "643301120" &&
        (isRowNeedsReview(row) || isRowZeroAmount(row)),
    ).length,
  };

  return {
    rows: enriched,
    master: finalMaster,
  };
}

export function buildOcrRunSummary(params: {
  fileResults: OcrFileResult[];
  pharmaMissing: boolean;
  master: OcrMasterMatchStats;
}): OcrRunSummary {
  const { fileResults, pharmaMissing, master } = params;
  const fileCount = fileResults.length;
  const totalExtracted = fileResults.reduce((sum, file) => sum + file.extracted, 0);
  const lines: string[] = [];

  lines.push(
    `총 ${fileCount}장 처리 완료 · ${totalExtracted}건 추출 → 테이블에 자동 입력됨`,
  );

  if (pharmaMissing) {
    lines.push(
      "⚠️ 제약사명 미입력 — 마스터 매칭·단가 자동완성 불가",
    );
  } else {
    lines.push(
      `🔗 마스터 매칭: 제품명→코드 ${master.matchedNames}건 · 단가 ${master.matchedPrices}건`,
    );
    lines.push(
      `📋 재번도 ${master.reNumberTotal}건 → 해결 ${master.reNumberResolved}건, 확인필요 ${master.reNumberNeedsReview}건`,
    );
  }

  for (const file of fileResults) {
    const reviewSuffix =
      file.needsReview > 0 ? ` (⚠️ 확인필요 ${file.needsReview}건)` : "";
    lines.push(
      `✅ [${file.index}] ${file.fileName} → ${file.extracted}건 추출${reviewSuffix}`,
    );
  }

  return {
    fileCount,
    totalExtracted,
    pharmaMissing,
    files: fileResults,
    master,
    lines,
  };
}

export function countFileNeedsReview(rows: RxRow[]): number {
  return rows.filter((row) => isRowNeedsReview(row) || isRowZeroAmount(row)).length;
}
