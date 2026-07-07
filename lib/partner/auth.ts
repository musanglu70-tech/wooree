/**
 * 파트너(CSO 업체) 인증 유틸
 * 로그인/가입은 사업자번호 기반이지만 Supabase Auth 는 이메일이 필요하므로
 * 사업자번호를 합성 이메일로 매핑해서 사용한다.
 */

/** 사업자번호에서 숫자만 추출 (367-88-01711 → 3678801711) */
export function normalizeBusinessNumber(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** 사업자번호 → Supabase Auth 용 합성 이메일 */
export function partnerEmail(businessNumber: string): string {
  const digits = normalizeBusinessNumber(businessNumber);
  return `p${digits}@partner.wooree.com`;
}

/** 000-00-00000 형식으로 표시 */
export function formatBusinessNumber(raw: string): string {
  const d = normalizeBusinessNumber(raw).slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 10자리 사업자번호 유효성 (형식만) */
export function isValidBusinessNumber(raw: string): boolean {
  return normalizeBusinessNumber(raw).length === 10;
}

export const PARTNER_ROLE = "partner" as const;
