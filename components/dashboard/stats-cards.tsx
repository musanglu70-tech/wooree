import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Files,
  Pill,
} from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard/get-dashboard-stats";
import type { VDashboardStats } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface StatCardConfig {
  label: string;
  key: keyof VDashboardStats;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
}

const STAT_CARD_CONFIG: StatCardConfig[] = [
  {
    label: "미확인 알림",
    key: "unread_notices",
    icon: Bell,
    iconClassName: "text-amber-600",
    iconBgClassName: "bg-amber-50",
  },
  {
    label: "확인 완료",
    key: "confirmed_notices",
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
    iconBgClassName: "bg-emerald-50",
  },
  {
    label: "등록 병의원",
    key: "registered_hospitals",
    icon: Building2,
    iconClassName: "text-blue-600",
    iconBgClassName: "bg-blue-50",
  },
  {
    label: "등록 제약사",
    key: "registered_pharma",
    icon: Pill,
    iconClassName: "text-violet-600",
    iconBgClassName: "bg-violet-50",
  },
  {
    label: "총 EDI 건수",
    key: "total_edi_count",
    icon: Files,
    iconClassName: "text-slate-600",
    iconBgClassName: "bg-slate-100",
  },
  {
    label: "이번달 EDI",
    key: "monthly_edi_count",
    icon: CalendarDays,
    iconClassName: "text-[#4f6ef7]",
    iconBgClassName: "bg-[rgba(79,110,247,0.1)]",
  },
];

export async function StatsCards() {
  const stats = await getDashboardStats();

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {STAT_CARD_CONFIG.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];

        return (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div
              className={cn(
                "mb-4 flex size-10 items-center justify-center rounded-lg",
                card.iconBgClassName,
              )}
            >
              <Icon
                className={cn("size-5", card.iconClassName)}
                strokeWidth={1.75}
              />
            </div>
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight",
                value > 0 ? "text-emerald-600" : "text-red-500",
              )}
            >
              {value.toLocaleString("ko-KR")}
            </p>
            <p className="mt-1 text-sm text-slate-500">{card.label}</p>
          </div>
        );
      })}
    </section>
  );
}
