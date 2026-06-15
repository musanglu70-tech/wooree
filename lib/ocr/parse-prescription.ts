import type { OcrPrescriptionItem, OcrPrescriptionResult } from "@/types/ocr";

const INSURANCE_CODE_REGEX = /(?<!\d)(\d{9})(?!\d)/;

const HOSPITAL_SUFFIX_REGEX =
  /(?:가정의원|요양병원|한의원|정형외과|마취통증의학과|영상의학과|재활의학과|산부인과|이비인후과|신경과|비뇨기과|피부과|소아과|안과|내과|외과|치과|의원|병원|클리닉|센터)/;

const HOSPITAL_LINE_REGEX = new RegExp(HOSPITAL_SUFFIX_REGEX.source);

const ITEM_SECTION_KEYWORDS =
  /^(?:보험|EDI|코드|제품|약품|품명|수량|금액|단가|합계|총계|처방|조제|일수|횟수|용법|비고)/;

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

function extractPrescriptionDate(text: string): string {
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

function isItemContinuationLine(line: string): boolean {
  if (!line) return false;
  if (INSURANCE_CODE_REGEX.test(line)) return false;
  if (ITEM_SECTION_KEYWORDS.test(line)) return false;
  if (HOSPITAL_LINE_REGEX.test(line)) return false;
  if (/^(?:환자|성명|처방일|조제일|발행일|의사|담당)/.test(line)) return false;

  return /[\uAC00-\uD7A3a-zA-Z]/.test(line) || /\d/.test(line);
}

function parseItemSegment(segment: string, code: string): OcrPrescriptionItem | null {
  const normalized = segment
    .replace(INSURANCE_CODE_REGEX, " ")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  const tokens = normalized.split(" ").filter(Boolean);
  const nameTokens: string[] = [];
  const numbers: number[] = [];

  for (const token of tokens) {
    const numeric = parseNumericToken(token);
    if (numeric != null) {
      numbers.push(numeric);
      continue;
    }

    if (/[\uAC00-\uD7A3a-zA-Z]/.test(token)) {
      nameTokens.push(
        token.replace(/[^\uAC00-\uD7A3a-zA-Z0-9+\-()./%]/g, ""),
      );
    }
  }

  const name = nameTokens.join(" ").trim();
  const codeNumber = Number(code);

  let quantity = 1;
  let amount = 0;

  const usableNumbers = numbers.filter((num) => num !== codeNumber);

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

  if (!name && amount === 0 && quantity <= 1) return null;

  return {
    code,
    name,
    quantity,
    amount,
  };
}

function parseItems(text: string): OcrPrescriptionItem[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items: OcrPrescriptionItem[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/^\d+[\.\)]\s*/, "");
    const codeMatch = line.match(INSURANCE_CODE_REGEX);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    if (seen.has(code)) continue;

    let segment = line.slice(line.indexOf(code));
    let nextIndex = index + 1;

    while (nextIndex < lines.length && nextIndex <= index + 2) {
      const nextLine = lines[nextIndex];
      if (!isItemContinuationLine(nextLine)) break;

      segment += ` ${nextLine}`;
      nextIndex += 1;
    }

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
    rawText: normalized,
    items: parseItems(normalized),
  };
}
