import { Suspense } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { StatsCardsSkeleton } from "@/components/dashboard/stats-cards-skeleton";
import { cn } from "@/lib/utils";

interface PrescriptionRow {
  month: string;
  pharma: string;
  company: string;
  client: string;
  amount: number;
}

const PRESCRIPTION_ROWS: PrescriptionRow[] = [
  {
    month: "2026년 06월",
    pharma: "한미약품",
    company: "우리메디텍",
    client: "서울대학교병원",
    amount: 48_520_000,
  },
  {
    month: "2026년 06월",
    pharma: "유한양행",
    company: "우리메디텍",
    client: "강남세브란스병원",
    amount: 32_180_000,
  },
  {
    month: "2026년 05월",
    pharma: "대웅제약",
    company: "우리메디텍",
    client: "분당서울대병원",
    amount: 27_450_000,
  },
  {
    month: "2026년 05월",
    pharma: "종근당",
    company: "우리메디텍",
    client: "삼성서울병원",
    amount: 41_230_000,
  },
  {
    month: "2026년 04월",
    pharma: "녹십자",
    company: "우리메디텍",
    client: "아산병원",
    amount: 36_890_000,
  },
  {
    month: "2026년 04월",
    pharma: "HK이노엔",
    company: "우리메디텍",
    client: "세란병원",
    amount: 18_760_000,
  },
];

function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            대시보드
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            CSO(주)우리메디텍 EDI 관리 현황을 한눈에 확인하세요.
          </p>
        </header>

        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsCards />
        </Suspense>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              월별 처방 현황
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              최근 처방 데이터 기준 (목업)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 font-medium text-slate-600">
                    처방월
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-600">
                    제약사
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-600">업체</th>
                  <th className="px-6 py-3 font-medium text-slate-600">
                    거래처
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-slate-600">
                    처방금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRESCRIPTION_ROWS.map((row, index) => (
                  <tr
                    key={`${row.month}-${row.pharma}-${row.client}`}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-6 py-3.5 text-slate-700">{row.month}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {row.pharma}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {row.company}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">{row.client}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-900">
                      {formatWon(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
