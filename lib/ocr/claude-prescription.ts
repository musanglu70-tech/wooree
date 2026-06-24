import Anthropic from "@anthropic-ai/sdk";
import type { OcrPrescriptionItem, OcrPrescriptionResult } from "@/types/ocr";
import {
  type AnthropicImageMediaType,
  type OcrMediaType,
} from "@/lib/ocr/image-payload";

/** Haiku 우선 (빠름), 실패 시 Sonnet 폴백 */
const CLAUDE_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
] as const;

const EXTRACTION_PROMPT = `이 이미지는 의약품 처방전, 제약사별처방통계, 병원 EDI 화면 캡처입니다.
표에서 모든 품목 행을 빠짐없이 추출하세요.

반드시 유효한 JSON만 출력 (마크다운·설명 금지):
{
  "pharmaName": "제약사명 또는 null",
  "hospitalName": "병의원명 또는 null",
  "doctorName": "의사명 또는 null",
  "prescriptionMonth": "YYYY-MM 또는 null",
  "items": [
    {
      "code": "650200400",
      "name": "제품명",
      "unit": "1정",
      "prescriptionCount": 3,
      "unitPrice": 366,
      "totalUsage": 150,
      "totalAmount": 54900,
      "needsReview": false
    }
  ]
}

규칙:
- code: 9자리 숫자 또는 A+8자리 (청구코드/보험코드)
- 제약사별처방통계 하단 상세표(청구코드·명칭·처방횟수·단가·총사용량·총금액) 우선
- 숫자는 쉼표 없이 정수
- 항목을 하나도 못 찾으면 items: [] 로 반환`;

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

function buildMediaBlock(
  imageBase64: string,
  mimeType: OcrMediaType,
): Anthropic.Messages.ContentBlockParam {
  if (mimeType === "application/pdf") {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: imageBase64,
      },
    };
  }

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType as AnthropicImageMediaType,
      data: imageBase64,
    },
  };
}

function pickField(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value != null && value !== "") return value;
  }
  return undefined;
}

function repairJsonText(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/'/g, '"')
    .replace(/\bundefined\b/g, "null");
}

export function extractJsonFromText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return repairJsonText(fenced[1].trim());

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return repairJsonText(text.slice(start, end + 1));
  }

  return repairJsonText(text.trim());
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
        const code = toStringOrEmpty(
          pickField(row, [
            "code",
            "청구코드",
            "보험코드",
            "insuranceCode",
            "insurance_code",
          ]),
        ).toUpperCase();
        const name = toStringOrEmpty(
          pickField(row, ["name", "명칭", "제품명", "productName"]),
        );
        if (!code && !name) return null;

        return {
          code,
          name,
          unit: toStringOrEmpty(pickField(row, ["unit", "단위"])),
          prescriptionCount: toNumber(
            pickField(row, ["prescriptionCount", "처방횟수"]),
          ),
          unitPrice: toNumber(pickField(row, ["unitPrice", "단가"])),
          totalUsage: toNumber(
            pickField(row, ["totalUsage", "총사용량", "수량"]),
          ),
          totalAmount: toNumber(
            pickField(row, ["totalAmount", "총금액", "금액"]),
          ),
          needsReview: Boolean(row.needsReview),
        };
      })
      .filter((item): item is ClaudePrescriptionPayload["items"][number] =>
        Boolean(item),
      );

    return {
      pharmaName:
        toStringOrEmpty(
          pickField(parsed, ["pharmaName", "제약사명", "제약사", "pharma_name"]),
        ) || null,
      hospitalName:
        toStringOrEmpty(
          pickField(parsed, [
            "hospitalName",
            "병의원명",
            "병원명",
            "hospital_name",
          ]),
        ) || null,
      doctorName:
        toStringOrEmpty(
          pickField(parsed, ["doctorName", "의사명", "doctor_name"]),
        ) || null,
      prescriptionMonth:
        toStringOrEmpty(
          pickField(parsed, [
            "prescriptionMonth",
            "처방월",
            "prescription_month",
          ]),
        ) || null,
      items,
    };
  } catch (error) {
    console.error("[OCR] JSON 파싱 실패:", error);
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
  mimeType: OcrMediaType,
): Promise<{ payload: ClaudePrescriptionPayload | null; rawText: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY 미설정");
  }

  const client = new Anthropic({ apiKey });
  const mediaBlock = buildMediaBlock(imageBase64, mimeType);

  let response: Anthropic.Message | null = null;
  let lastError: unknown;

  for (const model of CLAUDE_MODELS) {
    try {
      console.log(`[OCR] Claude API 호출 — model: ${model}`);
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        system:
          "You extract structured prescription data from Korean medical documents. Respond with valid JSON only.",
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
        console.error(
          `[OCR] Claude API 오류 (${model}):`,
          JSON.stringify(
            {
              status: error.status,
              message: error.message,
              type: error.type,
              name: error.name,
              error: error.error,
            },
            null,
            2,
          ),
        );
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
    console.warn("[OCR] Claude 응답 텍스트 없음");
    return { payload: null, rawText: "" };
  }

  const payload = parseClaudePrescriptionPayload(rawText);
  if (!payload?.items.length) {
    console.warn("[OCR] 파싱 결과 items 없음 — rawText 앞 500자:", rawText.slice(0, 500));
  }

  return {
    payload,
    rawText,
  };
}
