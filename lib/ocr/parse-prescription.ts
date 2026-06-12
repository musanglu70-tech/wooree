import type { OcrPrescriptionItem, OcrPrescriptionResult } from "@/types/ocr";

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

function extractHospitalName(text: string): string {
  const labeled = extractLabeledValue(text, [
    "병원명",
    "의료기관",
    "요양기관",
    "기관명",
  ]);
  if (labeled) return labeled;

  const line = text
    .split("\n")
    .map((value) => value.trim())
    .find(
      (value) =>
        /(?:의원|병원|클리닉|센터|내과|외과|치과|한의원)/.test(value) &&
        value.length <= 40,
    );

  return line ?? "";
}

function extractDoctorName(text: string): string {
  const labeled = extractLabeledValue(text, [
    "의사명",
    "담당의",
    "처방의",
    "의사",
  ]);
  if (labeled) return labeled.replace(/[^\uAC00-\uD7A3a-zA-Z\s]/g, "").trim();

  const match = text.match(
    /(?:의사|담당의|처방의)\s*[:：]?\s*([^\n\r]{2,20})/i,
  );
  return match?.[1]?.trim() ?? "";
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

function parseAmount(value: string): number {
  const num = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function parseItems(text: string): OcrPrescriptionItem[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const items: OcrPrescriptionItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const codeMatch = line.match(/\b(\d{9})\b/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    if (seen.has(code)) continue;

    const afterCode = line.slice(line.indexOf(code) + code.length).trim();
    const numbers = line.match(/\d[\d,]*/g)?.map(parseAmount) ?? [];
    const amount = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
    const quantity =
      numbers.length > 1 ? numbers[numbers.length - 2] : numbers[0] ?? 0;

    const name = afterCode
      .replace(/\d[\d,.\s]*$/g, "")
      .replace(/[^\uAC00-\uD7A3a-zA-Z0-9+\-()./%\s]/g, "")
      .trim();

    if (!name && amount === 0 && quantity === 0) continue;

    seen.add(code);
    items.push({
      code,
      name,
      quantity: quantity || 1,
      amount,
    });
  }

  return items;
}

export function parsePrescriptionText(text: string): OcrPrescriptionResult {
  const normalized = text.replace(/\r/g, "\n").trim();

  return {
    hospitalName: extractHospitalName(normalized),
    doctorName: extractDoctorName(normalized),
    prescriptionDate: extractPrescriptionDate(normalized),
    patientName: extractPatientName(normalized),
    rawText: normalized,
    items: parseItems(normalized),
  };
}
