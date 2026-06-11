"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  Bell,
  Bot,
  Building2,
  ClipboardCheck,
  FileOutput,
  FilePlus,
  FileText,
  FolderOpen,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Save,
  Scissors,
  Send,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "대시 보드", icon: LayoutDashboard },
      { href: "/notices", label: "공지 알림", icon: Bell },
    ],
  },
  {
    label: "EDI",
    items: [
      { href: "/edi/new", label: "신규 입력", icon: FilePlus },
      { href: "/edi/list", label: "저장 목록", icon: Save },
      { href: "/edi/inspect", label: "검수 관리", icon: ClipboardCheck },
      { href: "/edi/stats", label: "처방 통계", icon: BarChart3 },
    ],
  },
  {
    label: "정산관리",
    items: [
      {
        href: "/settlement/by-pharma",
        label: "제약사별 정산자료",
        icon: Building2,
      },
      {
        href: "/settlement/agent",
        label: "AI 정산 에이전트",
        icon: Bot,
      },
      { href: "/settlement/separate", label: "정산자료 분리", icon: Scissors },
      {
        href: "/settlement/compare",
        label: "처방 vs 정산",
        icon: GitCompare,
      },
    ],
  },
  {
    label: "전자계약",
    items: [
      { href: "/contract/form", label: "계약서 양식", icon: FileText },
      { href: "/contract/manage", label: "계약서 관리", icon: FolderOpen },
      { href: "/contract/storage", label: "계약서 보관", icon: Archive },
    ],
  },
  {
    label: "AI 재위탁 자동화",
    items: [{ href: "/automation/progress", label: "진행 현황", icon: Zap }],
  },
  {
    label: "재위탁보고",
    items: [
      { href: "/reports/declaration", label: "재위탁 신고서", icon: FileOutput },
      { href: "/reports/send", label: "재위탁 신고 발송", icon: Send },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#1a1f2e]">
      <div className="px-5 py-6">
        <p className="text-[15px] font-semibold tracking-tight text-white">
          CSO(주)우리메디텍
        </p>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-[#8892a4]">
          EDI 관리 시스템
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {MENU_GROUPS.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`}>
            {group.label && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wide text-[#5c6678]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(pathname, item.href);
                const isSubMenu = group.label !== null;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors duration-150",
                        isSubMenu ? "pl-6 pr-3" : "px-3",
                        isActive
                          ? "bg-[#4f6ef7] text-white"
                          : "text-[#8892a4] hover:bg-[rgba(79,110,247,0.12)] hover:text-[#c5cdd9]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          isActive ? "text-white" : "text-[#8892a4]",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-[13px] font-medium text-[#8892a4] transition-colors duration-150 hover:text-white"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
