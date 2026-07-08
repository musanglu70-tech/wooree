import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
] as const;

export interface AnalysisInputRow {
  pharmaName: string;
  companyName: string;
  conditionType: string;
  commissionRate: number;
  ediAmount: number;
  settlementAmount: number;
  expectedCommission: number;
  differenceAmount: number;
  matchStatus: string;
}

export interface AnalysisFlag {
  pharma: string;
  severity: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
}

export interface AnalysisResult {
  summary: string;
  flags: AnalysisFlag[];
}

const SYSTEM = `당신은 제약사 수수료 정산을 검증하는 전문 회계 에이전트입니다.
아래 정산 대조 데이터(EDI 처방액, 정산액, 예상 수수료, 차액, 상태)를 분석해
"이상 정산"을 찾아내세요. 특히 다음을 중점 검토합니다:
- 차액이 큰 항목(예상 수수료와 실제 정산액 불일치)
- 정산액이 0(정산자료 미도착) 또는 비정상적으로 낮은 항목
- 수수료율 대비 정산이 과다/과소한 항목
- 동일 제약사에서 반복되는 패턴

반드시 아래 JSON 형식으로만 답하세요(설명 금지):
{"summary":"전체 요약 2~3문장(한국어)","flags":[{"pharma":"제약사명","severity":"high|medium|low","reason":"이상 사유","suggestion":"조치 제안"}]}
정상이면 flags는 빈 배열로 두세요.`;

function toKrw(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

export async function analyzeSettlement(
  rows: AnalysisInputRow[],
): Promise<AnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY 미설정");
  }
  if (rows.length === 0) {
    return { summary: "분석할 정산 데이터가 없습니다.", flags: [] };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const table = rows
    .map(
      (r, i) =>
        `${i + 1}. ${r.pharmaName} | 조건:${r.conditionType} | 수수료율:${r.commissionRate}% | EDI처방액:${toKrw(r.ediAmount)} | 정산액:${toKrw(r.settlementAmount)} | 예상수수료:${toKrw(r.expectedCommission)} | 차액:${toKrw(r.differenceAmount)} | 상태:${r.matchStatus}`,
    )
    .join("\n");

  let lastError: unknown;
  for (const model of CLAUDE_MODELS) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: "user", content: `정산 대조 데이터:\n${table}` }],
      });
      const text = res.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
        return {
          summary: parsed.summary ?? "",
          flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        };
      }
      return { summary: text || "분석 결과를 해석하지 못했습니다.", flags: [] };
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.APIError && error.status === 404) continue;
      throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Claude 분석 호출 실패");
}
