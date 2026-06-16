const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";

export interface SettlementReportEmailParams {
  pharmaName: string;
  settlementMonth: string;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-");
  return mon ? `${year}년 ${mon}월` : month;
}

export function buildSettlementReportEmailHtml(
  params: SettlementReportEmailParams,
): string {
  const {
    pharmaName,
    settlementMonth,
    totalAmount,
    commissionRate,
    commissionAmount,
  } = params;

  const monthLabel = formatMonthLabel(settlementMonth);
  const totalLabel = totalAmount.toLocaleString("ko-KR");
  const commissionLabel = commissionAmount.toLocaleString("ko-KR");

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8" /></head>
<body style="font-family: Pretendard, -apple-system, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <div style="background: #4f6ef7; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px;">정산 안내</h1>
      <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.9;">CSO(주)우리메디텍</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">안녕하세요. 아래와 같이 정산 내역을 안내드립니다.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 120px;">제약사명</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${pharmaName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">정산월</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">${monthLabel}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">총금액</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${totalLabel}원</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">수수료율</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">${commissionRate}%</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b;">수수료금액</td>
          <td style="padding: 10px 0; font-weight: 700; color: #4f6ef7;">${commissionLabel}원</td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">본 메일은 발신 전용입니다.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function buildSettlementReportEmailText(
  params: SettlementReportEmailParams,
): string {
  const monthLabel = formatMonthLabel(params.settlementMonth);
  return [
    "[CSO(주)우리메디텍] 정산 안내",
    "",
    `제약사명: ${params.pharmaName}`,
    `정산월: ${monthLabel}`,
    `총금액: ${params.totalAmount.toLocaleString("ko-KR")}원`,
    `수수료율: ${params.commissionRate}%`,
    `수수료금액: ${params.commissionAmount.toLocaleString("ko-KR")}원`,
  ].join("\n");
}

export { FROM_EMAIL };
