export interface VDashboardStats {
  unread_notices: number;
  confirmed_notices: number;
  registered_hospitals: number;
  registered_pharma: number;
  total_edi_count: number;
  monthly_edi_count: number;
  monthly_edi_amount: number;
  unsettled_count: number;
}

export interface PharmaDashboardStat {
  pharmaCompanyId: string;
  pharmaName: string;
  monthlyCount: number;
  monthlyAmount: number;
  unsettledCount: number;
}

export const DEFAULT_DASHBOARD_STATS: VDashboardStats = {
  unread_notices: 0,
  confirmed_notices: 0,
  registered_hospitals: 0,
  registered_pharma: 0,
  total_edi_count: 0,
  monthly_edi_count: 0,
  monthly_edi_amount: 0,
  unsettled_count: 0,
};
