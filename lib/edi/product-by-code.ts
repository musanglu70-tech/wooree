import type { ProductByCode } from "@/types/ocr-summary";

export function buildCodeCandidates(code: string): string[] {
  const normalized = code.trim().toUpperCase();
  const candidates = [normalized];

  if (/^\d{8}$/.test(normalized)) {
    candidates.push(`${normalized}0`, `0${normalized}`);
  }
  if (/^\d{9}$/.test(normalized) && normalized.endsWith("0")) {
    candidates.push(normalized.slice(0, 8));
  }

  return [...new Set(candidates)];
}

export async function fetchProductByCode(
  code: string,
): Promise<ProductByCode | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const response = await fetch(
    `/api/products/by-code?code=${encodeURIComponent(trimmed)}`,
  );

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const body = (await response.json()) as { product?: ProductByCode };
  return body.product ?? null;
}
