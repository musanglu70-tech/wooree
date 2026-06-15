import { NextResponse } from "next/server";
import {
  extractPrescriptionWithClaude,
  mapClaudePayloadToResult,
} from "@/lib/ocr/claude-prescription";
import { parsePrescriptionText } from "@/lib/ocr/parse-prescription";

interface OcrRequestBody {
  imageBase64?: string;
  mimeType?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OcrRequestBody;
    const imageBase64 = body.imageBase64?.trim();
    const mimeType = body.mimeType?.trim() || "image/jpeg";

    if (!imageBase64) {
      return NextResponse.json(
        { message: "imageBase64가 필요합니다." },
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
      { message: "처방 데이터를 추출하지 못했습니다." },
      { status: 422 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OCR 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
