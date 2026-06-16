"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Files,
  Pill,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCardsSkeleton } from "@/components/dashboard/stats-cards-skeleton";
import { fetchDashboardStats } from "@/lib/dashboard/load-stats";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import {
  DEFAULT_DASHBOARD_STATS,
  type VDashboardStats,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface StatCardConfig {
  label: string;
  key: keyof VDashboardStats;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  format?: "number" | "won";
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
  {
    label: "이번달 EDI 금액",
    key: "monthly_edi_amount",
    icon: CircleDollarSign,
    iconClassName: "text-[#4f6ef7]",
    iconBgClassName: "bg-[rgba(79,110,247,0.1)]",
    format: "won",
  },
  {
    label: "미정산",
    key: "unsettled_count",
    icon: Wallet,
    iconClassName: "text-amber-700",
    iconBgClassName: "bg-amber-50",
  },
];

function formatValue(value: number, format?: "number" | "won") {
  if (format === "won") {
    return formatWon(value);
  }
  return value.toLocaleString("ko-KR");
}

export function StatsCards() {
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<VDashboardStats | null>(null);

  useEffect(() => {
    let active = true;

    fetchDashboardStats(supabase)
      .then((data) => {
        if (!active) return;
        setStats(data);
      })
      .catch(() => {
        if (!active) return;
        toast.error("대시보드 통계를 불러오지 못했습니다.");
        setStats(DEFAULT_DASHBOARD_STATS);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  if (!stats) {
    return <StatsCardsSkeleton />;
  }

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-4">
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
                "font-semibold tracking-tight text-slate-900",
                card.format === "won" ? "text-xl" : "text-2xl",
              )}
            >
              {formatValue(value, card.format)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{card.label}</p>
          </div>
        );
      })}
    </section>
  );
}
