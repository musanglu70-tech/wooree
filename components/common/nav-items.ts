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
  User,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 본사(관리자) 전용 — 사업자(테넌트)에겐 숨김 */
  adminOnly?: boolean;
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
      { href: "/mypage", label: "마이페이지", icon: User },
    ],
  },
  {
    label: "EDI",
    items: [
      { href: "/edi/new", label: "신규 입력", icon: FilePlus },
      { href: "/edi/list", label: "저장 목록", icon: Save },
      { href: "/edi/stats", label: "처방 통계", icon: BarChart3 },
      { href: "/edi/inspect", label: "검수 관리", icon: ClipboardCheck, adminOnly: true },
      { href: "/hospitals", label: "병의원 관리", icon: Hospital, adminOnly: true },
      { href: "/products", label: "의약품 관리", icon: Pill, adminOnly: true },
      { href: "/companies", label: "업체 관리", icon: Building2, adminOnly: true },
      { href: "/partners", label: "사업자 승인", icon: UserCheck, adminOnly: true },
    ],
  },
  {
    label: "정산관리",
    items: [
      { href: "/settlement/by-pharma", label: "제약사별 정산자료", icon: Building2, adminOnly: true },
      { href: "/settlement/agent", label: "AI 정산 에이전트", icon: Bot, adminOnly: true },
      { href: "/settlement/separate", label: "정산자료 분리", icon: Scissors, adminOnly: true },
      { href: "/settlement/compare", label: "처방 vs 정산", icon: GitCompare, adminOnly: true },
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
      { href: "/reports/declaration", label: "재위탁 신고서", icon: FileOutput, adminOnly: true },
      { href: "/reports/send", label: "재위탁 신고 발송", icon: Send, adminOnly: true },
    ],
  },
];

/** 역할에 맞는 메뉴만 반환 (사업자는 본사 전용 항목·빈 그룹 제거) */
export function getMenuGroups(isAdmin: boolean): MenuGroup[] {
  if (isAdmin) return MENU_GROUPS;
  return MENU_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.adminOnly),
  })).filter((g) => g.items.length > 0);
}

export const ADMIN_BOTTOM_MENU: MenuItem = {
  href: "/users",
  label: "사용자 관리",
  icon: Users,
};

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
