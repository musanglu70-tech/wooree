import { NextResponse } from "next/server";
import { parsePrescriptionText } from "@/lib/ocr/parse-prescription";

interface OcrRequestBody {
  imageBase64?: string;
  mimeType?: string;
}

async function extractTextFromVision(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY가 설정되지 않았습니다.");
  }

  const isPdf = mimeType === "application/pdf";

  const endpoint = isPdf
    ? `https://vision.googleapis.com/v1/files:annotate?key=${apiKey}`
    : `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestBody = isPdf
    ? {
        requests: [
          {
            inputConfig: {
              content: imageBase64,
              mimeType: "application/pdf",
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }
    : {
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      ((data.error as { message?: string } | undefined)?.message ??
        "Google Vision API 호출에 실패했습니다.");
    throw new Error(message);
  }

  if (isPdf) {
    const responses = data.responses as Record<string, unknown>[] | undefined;
    const inner = responses?.[0]?.responses as Record<string, unknown>[] | undefined;
    const annotation = inner?.[0]?.fullTextAnnotation as
      | { text?: string }
      | undefined;
    return annotation?.text ?? "";
  }

  const responses = data.responses as Record<string, unknown>[] | undefined;
  const annotation = responses?.[0]?.fullTextAnnotation as
    | { text?: string }
    | undefined;
  if (annotation?.text) return annotation.text;

  const textAnnotations = responses?.[0]?.textAnnotations as
    | { description?: string }[]
    | undefined;
  return textAnnotations?.[0]?.description ?? "";
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

    const rawText = await extractTextFromVision(imageBase64, mimeType);

    if (!rawText.trim()) {
      return NextResponse.json(
        { message: "텍스트를 추출하지 못했습니다." },
        { status: 422 },
      );
    }

    const parsed = parsePrescriptionText(rawText);

    return NextResponse.json(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OCR 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
