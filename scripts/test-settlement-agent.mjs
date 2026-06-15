import {
  buildCompareRow,
  calcItemAmount,
  sumEdiAmount,
} from "../lib/settlement/agent-compare.ts";

const items = [
  {
    unit_price: 366,
    quantity_original: 100,
    quantity_external: 50,
    amount: 54900,
  },
];

const inout = sumEdiAmount(items, "inout_combined");
if (inout !== 366 * 150) throw new Error(`inout expected ${366 * 150}, got ${inout}`);

const outonly = sumEdiAmount(items, "outonly");
if (outonly !== 366 * 50) throw new Error(`outonly expected ${366 * 50}, got ${outonly}`);

const rx = calcItemAmount(items[0], "prescription_amount");
if (rx !== 54900) throw new Error("prescription_amount");

const matched = buildCompareRow({
  ediAmount: 100000,
  settlementAmount: 100000,
  commissionRate: 12,
});
if (matched.matchStatus !== "matched") throw new Error("matched status");
if (matched.expectedCommission !== 12000) throw new Error("commission");

const pending = buildCompareRow({
  ediAmount: 100000,
  settlementAmount: 0,
  commissionRate: 12,
});
if (pending.matchStatus !== "pending") throw new Error("pending status");

console.log("OK");
