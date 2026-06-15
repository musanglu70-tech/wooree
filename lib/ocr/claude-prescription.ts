import Anthropic from "@anthropic-ai/sdk";
import type { OcrPrescriptionItem, OcrPrescriptionResult } from "@/types/ocr";

/** Sonnet 우선, 실패 시 Haiku로 폴백 (2026-06 기준 활성 모델) */
const CLAUDE_MODELS = [
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
] as const;

function sanitizeBase64(data: string): string {
  const trimmed = data.trim();
  const commaIndex = trimmed.indexOf(",");
  const raw =
    trimmed.startsWith("data:") && commaIndex >= 0
      ? trimmed.slice(commaIndex + 1)
      : trimmed;
  return raw.replace(/\s/g, "");
}

const EXTRACTION_PROMPT = `다음 의약품 관련 문서 이미지에서 데이터를 추출해주세요.
처방전, 제약사 청구서, 병원 프로그램 화면 등 어떤 형식이든 인식하세요.

반드시 아래 JSON 형식으로만 응답:
{
  "pharmaName": string | null,
  "hospitalName": string | null,
  "doctorName": string | null,
  "prescriptionMonth": string | null,
  "items": [{
    "code": string,
    "name": string,
    "unit": string,
    "prescriptionCount": number,
    "unitPrice": number,
    "totalUsage": number,
    "totalAmount": number,
    "needsReview": boolean
  }]
}

규칙:
- 보험코드(청구코드)는 9자리 숫자 또는 A로 시작하는 9자리 영숫자
- prescriptionMonth는 YYYY-MM 형식
- 숫자 필드는 쉼표 없이 숫자만
- 인식 불확실한 항목은 needsReview: true
- JSON 외 다른 텍스트는 출력하지 마세요`;

export interface ClaudePrescriptionPayload {
  pharmaName: string | null;
  hospitalName: string | null;
  doctorName: string | null;
  prescriptionMonth: string | null;
  items: {
    code: string;
    name: string;
    unit: string;
    prescriptionCount: number;
    unitPrice: number;
    totalUsage: number;
    totalAmount: number;
    needsReview: boolean;
  }[];
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  return normalized || "image/jpeg";
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function buildMediaBlock(
  imageBase64: string,
  mimeType: string,
): Anthropic.Messages.ContentBlockParam {
  const mediaType = normalizeMimeType(mimeType);

  if (mediaType === "application/pdf") {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: imageBase64,
      },
    };
  }

  if (!isImageMimeType(mediaType)) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${mimeType}`);
  }

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp",
      data: imageBase64,
    },
  };
}

export function extractJsonFromText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,원\s]/g, "").trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function toStringOrEmpty(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizePrescriptionMonth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const monthMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    return `${monthMatch[1]}-${monthMatch[2].padStart(2, "0")}-01`;
  }

  const dateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
  }

  return trimmed;
}

export function parseClaudePrescriptionPayload(
  text: string,
): ClaudePrescriptionPayload | null {
  try {
    const parsed = JSON.parse(extractJsonFromText(text)) as Record<
      string,
      unknown
    >;
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

    const items = rawItems
      .map((entry) => {
        const row = entry as Record<string, unknown>;
        const code = toStringOrEmpty(row.code).toUpperCase();
        const name = toStringOrEmpty(row.name);
        if (!code && !name) return null;

        return {
          code,
          name,
          unit: toStringOrEmpty(row.unit),
          prescriptionCount: toNumber(row.prescriptionCount),
          unitPrice: toNumber(row.unitPrice),
          totalUsage: toNumber(row.totalUsage),
          totalAmount: toNumber(row.totalAmount),
          needsReview: Boolean(row.needsReview),
        };
      })
      .filter((item): item is ClaudePrescriptionPayload["items"][number] =>
        Boolean(item),
      );

    return {
      pharmaName: toStringOrEmpty(parsed.pharmaName) || null,
      hospitalName: toStringOrEmpty(parsed.hospitalName) || null,
      doctorName: toStringOrEmpty(parsed.doctorName) || null,
      prescriptionMonth: toStringOrEmpty(parsed.prescriptionMonth) || null,
      items,
    };
  } catch {
    return null;
  }
}

function mapClaudeItem(
  item: ClaudePrescriptionPayload["items"][number],
): OcrPrescriptionItem {
  const totalUsage = item.totalUsage > 0 ? item.totalUsage : 0;
  const totalAmount = item.totalAmount;
  const unitPrice = item.unitPrice;
  const quantity = totalUsage > 0 ? totalUsage : 1;

  return {
    code: item.code,
    name: item.name,
    unit: item.unit,
    prescriptionCount: item.prescriptionCount,
    unitPrice,
    totalUsage,
    totalAmount,
    quantity,
    amount: totalAmount,
    needsReview: item.needsReview,
  };
}

export function mapClaudePayloadToResult(
  payload: ClaudePrescriptionPayload,
  rawText: string,
): OcrPrescriptionResult {
  return {
    hospitalName: payload.hospitalName ?? "",
    doctorName: payload.doctorName ?? "",
    prescriptionDate: payload.prescriptionMonth
      ? normalizePrescriptionMonth(payload.prescriptionMonth)
      : "",
    patientName: "",
    pharmaCompanyName: payload.pharmaName ?? "",
    businessNumber: "",
    rawText,
    items: payload.items.map(mapClaudeItem),
  };
}

export async function extractPrescriptionWithClaude(
  imageBase64: string,
  mimeType: string,
): Promise<{ payload: ClaudePrescriptionPayload | null; rawText: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY 미설정");
  }

  const client = new Anthropic({ apiKey });
  const cleanBase64 = sanitizeBase64(imageBase64);
  const mediaBlock = buildMediaBlock(cleanBase64, mimeType);

  let response: Anthropic.Message | null = null;
  let lastError: unknown;

  for (const model of CLAUDE_MODELS) {
    try {
      console.log(`[OCR] Claude API 호출 — model: ${model}`);
      response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              mediaBlock,
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });
      console.log(`[OCR] Claude API 성공 — model: ${model}`);
      break;
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.APIError) {
        console.error(`[OCR] Claude API 오류 (${model}):`, {
          status: error.status,
          message: error.message,
          type: error.type,
        });
        if (error.status === 404) continue;
        if (error.status === 400 && /model/i.test(error.message)) continue;
      } else {
        console.error(`[OCR] Claude API 오류 (${model}):`, error);
      }
      throw error;
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Claude API 호출에 실패했습니다.");
  }

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!rawText) {
    return { payload: null, rawText: "" };
  }

  return {
    payload: parseClaudePrescriptionPayload(rawText),
    rawText,
  };
}
