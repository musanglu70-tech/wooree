import {
  mapClaudePayloadToResult,
  parseClaudePrescriptionPayload,
  type ClaudePrescriptionPayload,
} from "@/lib/ocr/claude-prescription";
import { parsePrescriptionText } from "@/lib/ocr/parse-prescription";
import type { OcrPrescriptionResult } from "@/types/ocr";

export function resolveOcrResult(
  payload: ClaudePrescriptionPayload | null,
  rawText: string,
): OcrPrescriptionResult | null {
  if (payload?.items.length) {
    return mapClaudePayloadToResult(payload, rawText);
  }

  const regexParsed = parsePrescriptionText(rawText);
  if (regexParsed.items.length > 0) {
    return {
      ...regexParsed,
      hospitalName: payload?.hospitalName ?? regexParsed.hospitalName,
      doctorName: payload?.doctorName ?? regexParsed.doctorName,
      pharmaCompanyName: payload?.pharmaName ?? regexParsed.pharmaCompanyName,
      prescriptionDate:
        payload?.prescriptionMonth
          ? mapClaudePayloadToResult(
              { ...payload, items: [] },
              rawText,
            ).prescriptionDate
          : regexParsed.prescriptionDate,
      rawText: rawText || regexParsed.rawText,
    };
  }

  if (payload) {
    const reparsed = parseClaudePrescriptionPayload(rawText);
    if (reparsed?.items.length) {
      return mapClaudePayloadToResult(reparsed, rawText);
    }
  }

  return null;
}
