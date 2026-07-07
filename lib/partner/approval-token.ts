import crypto from "crypto";

function secret(): string {
  return (
    process.env.APPROVAL_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "wooree-dev-secret"
  );
}

/** companyId + action 에 대한 서명 토큰 (이메일 승인 링크 인증용) */
export function makeApprovalToken(companyId: string, action: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${companyId}:${action}`)
    .digest("hex");
}

export function verifyApprovalToken(
  companyId: string,
  action: string,
  token: string,
): boolean {
  const expected = makeApprovalToken(companyId, action);
  if (!token || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}
