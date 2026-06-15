import type { OcrPrescriptionItem, OcrPrescriptionResult } from "@/types/ocr";

const INSURANCE_CODE_REGEX = /(?<!\d)(\d{9}|[A-Z]\d{8})(?!\d)/i;

const HOSPITAL_SUFFIX_REGEX =
  /(?:가정의원|요양병원|한의원|정형외과|마취통증의학과|영상의학과|재활의학과|산부인과|이비인후과|신경과|비뇨기과|피부과|소아과|안과|내과|외과|치과|의원|병원|클리닉|센터)/;

const HOSPITAL_LINE_REGEX = new RegExp(HOSPITAL_SUFFIX_REGEX.source);

const UNIT_TOKEN_REGEX =
  /^\d+(?:캡슐|정|병|포|매|개|시트|통|앰플|바이알|패치|크림|겔|현|관|pill|tab|cap)/i;

const ITEM_SECTION_KEYWORDS =
  /^(?:보험|EDI|코드|제품|약품|품명|수량|금액|단가|합계|총계|처방|조제|일수|횟수|용법|비고|명칭|총사용량|총금액|청구코드|제약사별)/;

const TABLE_HEADER_REGEX = /청구코드|명칭|처방횟수|총사용량|총금액/;

const STAMP_HOSPITAL_REGEX =
  /([\uAC00-\uD7A3A-Za-z0-9]+(?:의원|병원|클리닉|한의원))\s*([가-힣]{2,4})?[:：]?/g;

interface ParsedTokens {
  name: string;
  unit: string;
  numbers: number[];
}

interface PharmaNumericFields {
  prescriptionCount: number;
  unitPrice: number;
  totalUsage: number;
  totalAmount: number;
}

function normalizeDate(value: string): string {
  const match = value.match(
    /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/,
  );
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractLabeledValue(text: string, labels: string[]): string {
  const lines = text.split("\n").map((line) => line.trim());

  for (const line of lines) {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:：]?\\s*(.+)$`, "i");
      const match = line.match(regex);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return "";
}

function cleanHospitalName(raw: string): {
  hospitalName: string;
  trailingDoctor: string;
} {
  const cleaned = raw.replace(/[:：]\s*$/, "").trim();
  if (!cleaned) return { hospitalName: "", trailingDoctor: "" };

  const suffixMatch = cleaned.match(HOSPITAL_SUFFIX_REGEX);
  if (!suffixMatch || suffixMatch.index == null) {
    return { hospitalName: cleaned, trailingDoctor: "" };
  }

  const endPos = suffixMatch.index + suffixMatch[0].length;
  const hospitalName = cleaned.slice(0, endPos).trim();
  const trailing = cleaned.slice(endPos).trim().replace(/[:：]/g, "");
  const doctorMatch = trailing.match(/^([가-힣]{2,4})/);

  return {
    hospitalName,
    trailingDoctor: doctorMatch?.[1] ?? "",
  };
}

function extractHospitalName(text: string): {
  hospitalName: string;
  trailingDoctor: string;
} {
  const labeled = extractLabeledValue(text, [
    "병원명",
    "의료기관",
    "요양기관",
    "기관명",
  ]);
  if (labeled) return cleanHospitalName(labeled);

  const stampMatches = [...text.matchAll(STAMP_HOSPITAL_REGEX)];
  if (stampMatches.length > 0) {
    const bestMatch =
      stampMatches.find((match) => /\d/.test(match[1])) ?? stampMatches.at(-1);
    if (bestMatch) {
      return cleanHospitalName(
        `${bestMatch[1]}${bestMatch[2] ? ` ${bestMatch[2]}` : ""}`,
      );
    }
  }

  const line = text
    .split("\n")
    .map((value) => value.trim())
    .find(
      (value) => HOSPITAL_LINE_REGEX.test(value) && value.length <= 60,
    );

  return line ? cleanHospitalName(line) : { hospitalName: "", trailingDoctor: "" };
}

function extractDoctorName(text: string, trailingDoctor = ""): string {
  const labeled = extractLabeledValue(text, [
    "의사명",
    "담당의",
    "처방의",
    "의사",
    "원장",
  ]);
  if (labeled) {
    return labeled.replace(/[^\uAC00-\uD7A3a-zA-Z\s]/g, "").trim();
  }

  const match = text.match(
    /(?:의사|담당의|처방의|원장)\s*[:：]?\s*([가-힣]{2,4})/i,
  );
  if (match?.[1]) return match[1].trim();

  return trailingDoctor;
}

function extractPatientName(text: string): string {
  const labeled = extractLabeledValue(text, ["환자명", "환자", "성명", "수진자"]);
  if (labeled) return labeled.replace(/[^\uAC00-\uD7A3a-zA-Z\s]/g, "").trim();

  const match = text.match(/(?:환자|성명)\s*[:：]?\s*([^\n\r]{2,20})/i);
  return match?.[1]?.trim() ?? "";
}

function extractPharmaCompanyName(text: string): string {
  const explicitMatch = text.match(/제약사\s*[:：]\s*([^\n\r]+)/i);
  if (explicitMatch?.[1]) return explicitMatch[1].trim();

  const labeled = extractLabeledValue(text, [
    "제약사명",
    "공급업체",
    "제조사",
  ]);
  if (labeled) return labeled.trim();

  return "";
}

function extractBusinessNumber(text: string): string {
  const labeled = extractLabeledValue(text, ["사업자", "사업자번호", "사업자등록번호"]);
  if (labeled) {
    const match = labeled.match(/\d{3}-\d{2}-\d{4,6}/);
    if (match) return match[0];
  }

  const match = text.match(/\b(\d{3}-\d{2}-\d{4,6})\b/);
  return match?.[1] ?? "";
}

function extractPrescriptionDate(text: string): string {
  const inquiry = extractLabeledValue(text, [
    "조회일",
    "조회 일",
    "청구월",
    "정산월",
    "처방월",
  ]);
  if (inquiry) {
    const monthMatch = inquiry.match(/(\d{4})-(\d{2})-\d{2}/);
    if (monthMatch) {
      return `${monthMatch[1]}-${monthMatch[2]}-01`;
    }
    const normalized = normalizeDate(inquiry);
    if (normalized) return normalized;
  }

  const labeled = extractLabeledValue(text, [
    "처방일",
    "처방일자",
    "조제일",
    "발행일",
  ]);
  if (labeled) {
    const normalized = normalizeDate(labeled);
    if (normalized) return normalized;
  }

  const rangeMatch = text.match(
    /(\d{4})-(\d{2})-\d{2}\s*[~～\-]\s*(\d{4})-(\d{2})-\d{2}/,
  );
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]}-01`;
  }

  const match = text.match(
    /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/,
  );
  if (!match) return "";

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseNumericToken(token: string): number | null {
  const cleaned = token.replace(/[,원]/g, "").trim();
  if (!/^\d+$/.test(cleaned)) return null;
  if (cleaned.length === 9) return null;

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function isUnitToken(token: string): boolean {
  return UNIT_TOKEN_REGEX.test(token);
}

function startsWithInsuranceCode(line: string): boolean {
  const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
  return /^(?:\d{9}|[A-Z]\d{8})(?:\s|$)/i.test(cleaned);
}

function isPharmaDetailHeader(line: string): boolean {
  if (!/청구코드|원구코드/.test(line)) return false;
  if (!/명칭/.test(line)) return false;
  return /처방횟수|총사용량|총금액|단가/.test(line);
}

function isPharmaCompanySummaryRow(line: string): boolean {
  const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
  return /^[\uAC00-\uD7A3]+(?:약품|제약)(?:\(주\))?\s+[\d,]+/.test(cleaned);
}

/** 제약사별처방통계 — 하단 상세표만 파싱 (상단 요약표 제외) */
function focusDetailTableText(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    if (isPharmaDetailHeader(lines[index])) {
      return lines.slice(index + 1).join("\n");
    }
  }

  return text;
}

function isTableHeaderLine(line: string): boolean {
  return isPharmaDetailHeader(line) || TABLE_HEADER_REGEX.test(line);
}

function isSummaryOnlyLine(line: string): boolean {
  const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
  if (startsWithInsuranceCode(cleaned)) return false;
  if (/[\uAC00-\uD7A3]/.test(cleaned)) return false;

  return /^[\d,\s.]+$/.test(cleaned);
}

function isVerticalItemPartLine(line: string): boolean {
  const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
  if (!cleaned) return false;
  if (startsWithInsuranceCode(cleaned)) return false;
  if (isTableHeaderLine(cleaned)) return false;
  if (ITEM_SECTION_KEYWORDS.test(cleaned)) return false;
  if (HOSPITAL_LINE_REGEX.test(cleaned)) return false;
  if (/[\uAC00-\uD7A3].*(?:의원|병원|클리닉)/.test(cleaned)) return false;
  if (/^\d{3}-\d{2}-\d/.test(cleaned)) return false;
  if (/^(?:보건업|충북|서울|경기|주소)/.test(cleaned)) return false;

  if (isUnitToken(cleaned)) return true;
  if (/^[\d,.\s]+$/.test(cleaned)) return true;

  return false;
}

function mergeItemSegment(
  lines: string[],
  startIndex: number,
  code: string,
): { segment: string; nextIndex: number } {
  let segment = lines[startIndex].slice(lines[startIndex].indexOf(code));
  let nextIndex = startIndex + 1;
  let numericPartCount = 0;

  while (nextIndex < lines.length && nextIndex <= startIndex + 12) {
    const nextLine = lines[nextIndex].replace(/^\d+[\.\)]\s*/, "").trim();
    if (!nextLine) {
      nextIndex += 1;
      continue;
    }

    const canContinue =
      isVerticalItemPartLine(nextLine) || isItemContinuationLine(nextLine);
    if (!canContinue) break;

    if (isVerticalItemPartLine(nextLine) && /^[\d,.\s]+$/.test(nextLine)) {
      numericPartCount += 1;
    }

    segment += ` ${nextLine}`;
    nextIndex += 1;

    if (numericPartCount >= 4) break;
  }

  return { segment, nextIndex };
}

function isItemContinuationLine(line: string): boolean {
  if (!line) return false;
  if (INSURANCE_CODE_REGEX.test(line)) return false;
  if (ITEM_SECTION_KEYWORDS.test(line)) return false;
  if (HOSPITAL_LINE_REGEX.test(line)) return false;
  if (/^(?:환자|성명|처방일|조제일|발행일|의사|담당|제약사)/.test(line)) return false;

  return /[\uAC00-\uD7A3a-zA-Z]/.test(line) || /\d/.test(line);
}

function tokenizeItemSegment(segment: string, code: string): ParsedTokens {
  const normalized = segment
    .replace(INSURANCE_CODE_REGEX, " ")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = normalized.split(" ").filter(Boolean);
  const nameTokens: string[] = [];
  let unit = "";
  const numbers: number[] = [];
  const codeNumber = Number(code);

  for (const token of tokens) {
    const numeric = parseNumericToken(token);
    if (numeric != null && numeric !== codeNumber) {
      numbers.push(numeric);
      continue;
    }

    if (numbers.length === 0 && isUnitToken(token)) {
      unit = token;
      continue;
    }

    if (numbers.length === 0 && /[\uAC00-\uD7A3a-zA-Z0-9]/.test(token)) {
      nameTokens.push(
        token.replace(/[^\uAC00-\uD7A3a-zA-Z0-9+\-()./%]/g, ""),
      );
    }
  }

  return {
    name: nameTokens.join(" ").trim(),
    unit,
    numbers,
  };
}

function matchesPharmaAmount(fields: PharmaNumericFields): boolean {
  if (fields.totalAmount === 0) {
    return fields.prescriptionCount > 0 && fields.totalUsage > 0;
  }
  return fields.unitPrice * fields.totalUsage === fields.totalAmount;
}

function extractPharmaFields(numbers: number[]): PharmaNumericFields | null {
  if (numbers.length < 4) return null;

  const lastFour = numbers.slice(-4);
  const fields: PharmaNumericFields = {
    prescriptionCount: lastFour[0],
    unitPrice: lastFour[1],
    totalUsage: lastFour[2],
    totalAmount: lastFour[3],
  };

  if (matchesPharmaAmount(fields)) return fields;

  if (numbers.length === 4) return null;

  for (let index = 0; index <= numbers.length - 4; index += 1) {
    const candidate: PharmaNumericFields = {
      prescriptionCount: numbers[index],
      unitPrice: numbers[index + 1],
      totalUsage: numbers[index + 2],
      totalAmount: numbers[index + 3],
    };
    if (matchesPharmaAmount(candidate)) return candidate;
  }

  return null;
}

function buildLegacyItem(
  code: string,
  name: string,
  unit: string,
  numbers: number[],
): OcrPrescriptionItem | null {
  const codeNumber = Number(code);
  const usableNumbers = numbers.filter((num) => num !== codeNumber);

  let quantity = 1;
  let amount = 0;

  if (usableNumbers.length >= 2) {
    quantity = usableNumbers[usableNumbers.length - 2];
    amount = usableNumbers[usableNumbers.length - 1];
  } else if (usableNumbers.length === 1) {
    const value = usableNumbers[0];
    if (value >= 1000) amount = value;
    else quantity = value;
  }

  if (quantity <= 0) quantity = 1;
  if (amount === codeNumber) amount = 0;

  const unitPrice = quantity > 0 && amount > 0 ? Math.round(amount / quantity) : 0;

  if (!name && amount === 0 && quantity <= 1) return null;

  return {
    code,
    name,
    quantity,
    amount,
    unitPrice,
    totalUsage: quantity,
    totalAmount: amount,
    unit,
    prescriptionCount: 0,
  };
}

function buildPharmaItem(
  code: string,
  name: string,
  unit: string,
  fields: PharmaNumericFields,
): OcrPrescriptionItem | null {
  if (!name.trim()) return null;
  if (fields.prescriptionCount <= 0 && fields.totalUsage <= 0) return null;

  return {
    code,
    name,
    quantity: fields.totalUsage,
    amount: fields.totalAmount,
    unitPrice: fields.unitPrice,
    totalUsage: fields.totalUsage,
    totalAmount: fields.totalAmount,
    unit,
    prescriptionCount: fields.prescriptionCount,
  };
}

function parseItemSegment(segment: string, code: string): OcrPrescriptionItem | null {
  const { name, unit, numbers } = tokenizeItemSegment(segment, code);
  const pharmaFields = extractPharmaFields(numbers);

  if (pharmaFields) {
    return buildPharmaItem(code, name, unit, pharmaFields);
  }

  return buildLegacyItem(code, name, unit, numbers);
}

function parseItems(text: string): OcrPrescriptionItem[] {
  const focused = focusDetailTableText(text);
  const lines = focused
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items: OcrPrescriptionItem[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/^\d+[\.\)]\s*/, "");
    if (isTableHeaderLine(line)) continue;
    if (isSummaryOnlyLine(line)) continue;
    if (isPharmaCompanySummaryRow(line)) continue;
    if (!startsWithInsuranceCode(line)) continue;

    const codeMatch = line.match(INSURANCE_CODE_REGEX);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    if (seen.has(code)) continue;

    const { segment, nextIndex } = mergeItemSegment(lines, index, code);

    const item = parseItemSegment(segment, code);
    if (item) {
      seen.add(code);
      items.push(item);
    }

    if (nextIndex > index + 1) {
      index = nextIndex - 1;
    }
  }

  return items;
}

export function parsePrescriptionText(text: string): OcrPrescriptionResult {
  const normalized = text.replace(/\r/g, "\n").trim();
  const { hospitalName, trailingDoctor } = extractHospitalName(normalized);

  return {
    hospitalName,
    doctorName: extractDoctorName(normalized, trailingDoctor),
    prescriptionDate: extractPrescriptionDate(normalized),
    patientName: extractPatientName(normalized),
    pharmaCompanyName: extractPharmaCompanyName(normalized),
    businessNumber: extractBusinessNumber(normalized),
    rawText: normalized,
    items: parseItems(normalized),
  };
}
