"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { PHARMAS, formatWon } from "@/lib/edi/constants";
import { cn } from "@/lib/utils";

type StatsTab = "pharma" | "client" | "product" | "detail";

const TABS: { id: StatsTab; label: string }[] = [
  { id: "pharma", label: "제약사별" },
  { id: "client", label: "거래처별" },
  { id: "product", label: "품목별" },
  { id: "detail", label: "세부내역" },
];

const PHARMA_STATS = [
  { pharma: "위더스제약", count: 42, quantity: 1280, amount: 18_450_000 },
  { pharma: "(주)테라벤이븐스", count: 28, quantity: 890, amount: 12_320_000 },
  { pharma: "대웅바이오(주)", count: 19, quantity: 540, amount: 8_760_000 },
  { pharma: "경동제약(주)", count: 15, quantity: 420, amount: 6_230_000 },
  { pharma: "한화제약(주)", count: 12, quantity: 310, amount: 4_890_000 },
];

const CLIENT_STATS = [
  { client: "현마음의원", count: 8, quantity: 240, amount: 3_280_000 },
  { client: "상진형내과의원", count: 6, quantity: 180, amount: 2_928_380 },
  { client: "서울대학교병원", count: 4, quantity: 520, amount: 48_520_000 },
  { client: "365베스트치과의원", count: 5, quantity: 150, amount: 1_955_028 },
  { client: "강승모내과의원(충주)", count: 7, quantity: 210, amount: 1_134_336 },
];

const PRODUCT_STATS = [
  {
    code: "643301120",
    name: "아모잘탄정 5/100mg",
    quantity: 320,
    amount: 4_560_000,
  },
  {
    code: "651900410",
    name: "리피토정 20mg",
    quantity: 280,
    amount: 3_920_000,
  },
  {
    code: "642100850",
    name: "네오시그마정",
    quantity: 195,
    amount: 2_145_000,
  },
  {
    code: "648900230",
    name: "셀미플정 50mg",
    quantity: 160,
    amount: 1_880_000,
  },
];

const DETAIL_ROWS = [
  {
    month: "2026-06",
    pharma: "위더스제약",
    client: "현마음의원",
    product: "아모잘탄정 5/100mg",
    quantity: 48,
    amount: 684_000,
  },
  {
    month: "2026-06",
    pharma: "(주)테라벤이븐스",
    client: "상진형내과의원",
    product: "리피토정 20mg",
    quantity: 36,
    amount: 504_000,
  },
  {
    month: "2026-05",
    pharma: "대웅바이오(주)",
    client: "제이산부인과의원(대전)",
    product: "네오시그마정",
    quantity: 24,
    amount: 264_000,
  },
  {
    month: "2026-05",
    pharma: "경동제약(주)",
    client: "강승모내과의원(충주)",
    product: "셀미플정 50mg",
    quantity: 30,
    amount: 352_500,
  },
  {
    month: "2026-04",
    pharma: "대화제약(주)",
    client: "서울대학교병원",
    product: "아모잘탄정 5/100mg",
    quantity: 120,
    amount: 1_710_000,
  },
];

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20";

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}년 ${mon}월`;
}

export function EdiStatsContent() {
  const [activeTab, setActiveTab] = useState<StatsTab>("pharma");
  const [filterMonth, setFilterMonth] = useState("2026-06");
  const [filterPharma, setFilterPharma] = useState("");
  const [filterClient, setFilterClient] = useState("");

  const summary = useMemo(() => {
    const count = PHARMA_STATS.reduce((s, r) => s + r.count, 0);
    const quantity = PHARMA_STATS.reduce((s, r) => s + r.quantity, 0);
    const amount = PHARMA_STATS.reduce((s, r) => s + r.amount, 0);
    return {
      count,
      quantity,
      amount,
      pharmaCount: PHARMA_STATS.length,
      clientCount: CLIENT_STATS.length,
    };
  }, []);

  const handleExport = () => {
    toast.info("엑셀보내기는 서버 연동 후 사용 가능합니다.");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              처방월
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              제약사
            </label>
            <select
              value={filterPharma}
              onChange={(e) => setFilterPharma(e.target.value)}
              className={inputClassName}
            >
              <option value="">전체</option>
              {PHARMAS.map((pharma) => (
                <option key={pharma} value={pharma}>
                  {pharma}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              거래처
            </label>
            <input
              type="text"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              placeholder="거래처 검색"
              className={inputClassName}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5]"
            >
              <Search className="size-4" />
              조회
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
            >
              <Download className="size-4" />
              엑셀
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "처방 건수", value: `${summary.count.toLocaleString("ko-KR")}건` },
          {
            label: "총 수량",
            value: summary.quantity.toLocaleString("ko-KR"),
          },
          { label: "처방 금액", value: formatWon(summary.amount) },
          {
            label: "제약사 수",
            value: `${summary.pharmaCount.toLocaleString("ko-KR")}개`,
          },
          {
            label: "거래처 수",
            value: `${summary.clientCount.toLocaleString("ko-KR")}개`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-[#4f6ef7] text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto p-1">
          {activeTab === "pharma" && (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 font-medium text-slate-600">제약사</th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    처방 건수
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    총 수량
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    처방금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {PHARMA_STATS.map((row, i) => (
                  <tr
                    key={row.pharma}
                    className={cn(
                      "border-b border-slate-100",
                      i % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.pharma}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {row.count}건
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {row.quantity.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatWon(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "client" && (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 font-medium text-slate-600">
                    거래처
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    처방 건수
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    총 수량
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    처방금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {CLIENT_STATS.map((row, i) => (
                  <tr
                    key={row.client}
                    className={cn(
                      "border-b border-slate-100",
                      i % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.client}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {row.count}건
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {row.quantity.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatWon(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "product" && (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 font-medium text-slate-600">
                    보험코드
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    제품명
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    수량
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    처방금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_STATS.map((row, i) => (
                  <tr
                    key={row.code}
                    className={cn(
                      "border-b border-slate-100",
                      i % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3 text-slate-700">{row.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {row.quantity.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatWon(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "detail" && (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 font-medium text-slate-600">
                    처방월
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    제약사
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    거래처
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    제품명
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    수량
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-600">
                    처방금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {DETAIL_ROWS.map((row, i) => (
                  <tr
                    key={`${row.month}-${row.client}-${row.product}`}
                    className={cn(
                      "border-b border-slate-100",
                      i % 2 === 1 && "bg-slate-50/40",
                    )}
                  >
                    <td className="px-5 py-3 text-slate-700">
                      {formatMonthLabel(row.month)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.pharma}</td>
                    <td className="px-5 py-3 text-slate-700">{row.client}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.product}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {row.quantity.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatWon(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
