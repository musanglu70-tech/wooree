export const PHARMAS = [
  "(주)테라벤이븐스",
  "건일바이오팜주식회사",
  "경동제약(주)",
  "대웅바이오(주)",
  "대화제약(주)",
  "동광제약(주)",
  "오스틴제약주식회사",
  "위더스제약",
  "한화제약(주)",
] as const;

export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
