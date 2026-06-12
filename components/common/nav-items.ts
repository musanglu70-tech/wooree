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
  Hospital,
  LayoutDashboard,
  Pill,
  Save,
  Scissors,
  Send,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
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
      { href: "/hospitals", label: "병의원 관리", icon: Hospital },
      { href: "/products", label: "의약품 관리", icon: Pill },
      { href: "/companies", label: "업체 관리", icon: Building2 },
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

export const ADMIN_BOTTOM_MENU: MenuItem = {
  href: "/users",
  label: "사용자 관리",
  icon: Users,
};

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
