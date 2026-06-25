import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractPrescriptionWithClaude,
  mapClaudePayloadToResult,
} from "@/lib/ocr/claude-prescription";
import { prepareOcrImagePayload } from "@/lib/ocr/image-payload";
import { parsePrescriptionText } from "@/lib/ocr/parse-prescription";

export const maxDuration = 60;

interface OcrRequestBody {
  imageBase64?: string;
  mimeType?: string;
}

function ocrErrorResponse(details: string, status = 500) {
  return NextResponse.json({ error: "OCR 실패", details }, { status });
}

function logOcrError(error: unknown) {
  if (error instanceof Anthropic.APIError) {
    console.error(
      "[OCR] Anthropic API error:",
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
    return;
  }

  if (error instanceof Error) {
    console.error(
      "[OCR] error:",
      JSON.stringify(
        { message: error.message, name: error.name, stack: error.stack },
        null,
        2,
      ),
    );
    return;
  }

  console.error("[OCR] error:", JSON.stringify(error, null, 2));
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("[OCR] ANTHROPIC_API_KEY 미설정");
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY 미설정" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as OcrRequestBody;
    const rawBase64 = body.imageBase64?.trim();

    if (!rawBase64) {
      return NextResponse.json(
        { error: "OCR 실패", details: "imageBase64가 필요합니다." },
        { status: 400 },
      );
    }

    const { base64, mimeType, byteLength } = prepareOcrImagePayload(
      rawBase64,
      body.mimeType,
    );

    console.log(
      `[OCR] 요청 수신 — mimeType: ${mimeType}, size: ${(byteLength / 1024).toFixed(0)}KB`,
    );

    // 429 과부하 시 최대 2회 재시도 (1s, 2s 대기)
    let payload, rawText;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        ({ payload, rawText } = await extractPrescriptionWithClaude(base64, mimeType));
        break;
      } catch (err) {
        if (err instanceof Anthropic.APIError && err.status === 429 && attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    if (!payload || !rawText) throw new Error("OCR 처리 실패");

    if (payload && payload.items.length > 0) {
      return NextResponse.json(mapClaudePayloadToResult(payload, rawText));
    }

    if (rawText.trim()) {
      const fallbackParsed = parsePrescriptionText(rawText);
      if (fallbackParsed.items.length > 0) {
        return NextResponse.json({
          ...fallbackParsed,
          rawText: fallbackParsed.rawText || rawText,
        });
      }
    }

    return NextResponse.json(
      { error: "OCR 실패", details: "처방 데이터를 추출하지 못했습니다." },
      { status: 422 },
    );
  } catch (error) {
    logOcrError(error);

    const details =
      error instanceof Error
        ? error.message
        : "OCR 처리 중 오류가 발생했습니다.";

    const status =
      error instanceof Error && details.includes("5MB") ? 400 : 500;

    return ocrErrorResponse(details, status);
  }
}
