import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractPrescriptionWithClaude,
  mapClaudePayloadToResult,
} from "@/lib/ocr/claude-prescription";
import { parsePrescriptionText } from "@/lib/ocr/parse-prescription";

interface OcrRequestBody {
  imageBase64?: string;
  mimeType?: string;
}

function ocrErrorResponse(details: string, status = 500) {
  return NextResponse.json({ error: "OCR 실패", details }, { status });
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
    const imageBase64 = body.imageBase64?.trim();
    const mimeType = body.mimeType?.trim() || "image/jpeg";

    if (!imageBase64) {
      return NextResponse.json(
        { error: "OCR 실패", details: "imageBase64가 필요합니다." },
        { status: 400 },
      );
    }

    const { payload, rawText } = await extractPrescriptionWithClaude(
      imageBase64,
      mimeType,
    );

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
    console.error("[OCR] Claude Vision API error:", error);

    if (error instanceof Anthropic.APIError) {
      console.error("[OCR] Anthropic API details:", {
        status: error.status,
        message: error.message,
        type: error.type,
      });
    } else if (error instanceof Error) {
      console.error("[OCR] message:", error.message);
      console.error("[OCR] stack:", error.stack);
    }

    const details =
      error instanceof Error
        ? error.message
        : "OCR 처리 중 오류가 발생했습니다.";

    return ocrErrorResponse(details);
  }
}
