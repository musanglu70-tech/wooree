export interface ProductByCode {
  id: string;
  insurance_code: string;
  name: string;
  unit_price: number;
  commission_rate: number | null;
  extra_commission_rate: number | null;
}

export interface OcrFileResult {
  index: number;
  fileName: string;
  extracted: number;
  needsReview: number;
}

export interface OcrMasterMatchStats {
  matchedNames: number;
  matchedPrices: number;
  reNumberTotal: number;
  reNumberResolved: number;
  reNumberNeedsReview: number;
}

export interface OcrRunSummary {
  fileCount: number;
  totalExtracted: number;
  pharmaMissing: boolean;
  files: OcrFileResult[];
  master: OcrMasterMatchStats;
  lines: string[];
}
