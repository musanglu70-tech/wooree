export const MAX_OCR_IMAGE_BYTES = 5 * 1024 * 1024;

export type AnthropicImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export type OcrMediaType = AnthropicImageMediaType | "application/pdf";

/** data URL prefix 제거 후 순수 base64만 반환 */
export function stripDataUrlPrefix(base64Data: string): string {
  return base64Data
    .trim()
    .replace(/^data:image\/\w+;base64,/, "")
    .replace(/^data:application\/pdf;base64,/, "")
    .replace(/\s/g, "");
}

export function normalizeOcrMimeType(mimeType?: string): OcrMediaType {
  const normalized = mimeType?.trim().toLowerCase() || "image/jpeg";
  if (normalized === "image/jpg") return "image/jpeg";
  if (normalized === "application/pdf") return "application/pdf";
  if (
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/gif" ||
    normalized === "image/webp"
  ) {
    return normalized;
  }
  return "image/jpeg";
}

export function getBase64DecodedByteLength(base64: string): number {
  const clean = stripDataUrlPrefix(base64);
  if (!clean) return 0;

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

export function prepareOcrImagePayload(
  imageBase64: string,
  mimeType?: string,
): { base64: string; mimeType: OcrMediaType; byteLength: number } {
  const base64 = stripDataUrlPrefix(imageBase64);
  const normalizedMime = normalizeOcrMimeType(mimeType);
  const byteLength = getBase64DecodedByteLength(base64);

  if (!base64) {
    throw new Error("imageBase64가 비어 있습니다.");
  }

  if (
    normalizedMime !== "application/pdf" &&
    byteLength > MAX_OCR_IMAGE_BYTES
  ) {
    throw new Error(
      `이미지 크기가 5MB를 초과합니다 (${(byteLength / 1024 / 1024).toFixed(1)}MB). 더 작은 이미지를 사용해주세요.`,
    );
  }

  return { base64, mimeType: normalizedMime, byteLength };
}
