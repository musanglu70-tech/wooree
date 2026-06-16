function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeDashboardStats(row, confirmedNotices = 0) {
  return {
    unread_notices: toNumber(row.unconfirmed_notices ?? row.unread_notices),
    confirmed_notices: toNumber(row.confirmed_notices ?? confirmedNotices),
    registered_hospitals: toNumber(row.registered_hospitals),
    registered_pharma: toNumber(row.registered_pharma),
    total_edi_count: toNumber(row.total_edi_count),
    monthly_edi_count: toNumber(row.this_month_edi ?? row.monthly_edi_count),
    monthly_edi_amount: toNumber(
      row.this_month_edi_amount ?? row.monthly_edi_amount,
    ),
    unsettled_count: toNumber(row.unsettled_count),
  };
}

const row = {
  unconfirmed_notices: 2,
  confirmed_notices: 5,
  registered_hospitals: 10,
  registered_pharma: 3,
  total_edi_count: 42,
  this_month_edi: 7,
  this_month_edi_amount: 54900,
  unsettled_count: 4,
};

const stats = normalizeDashboardStats(row);
if (stats.monthly_edi_count !== 7) throw new Error("monthly_edi_count");
if (stats.monthly_edi_amount !== 54900) throw new Error("monthly_edi_amount");
if (stats.unsettled_count !== 4) throw new Error("unsettled_count");

console.log("OK", stats);
