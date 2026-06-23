"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ADMIN_BOTTOM_MENU,
  MENU_GROUPS,
  isActivePath,
} from "@/components/common/nav-items";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin } = useUserProfile();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const group of MENU_GROUPS) {
      if (!group.label) continue;
      const isActive = group.items.some((item) =>
        isActivePath(pathname, item.href),
      );
      init[group.label] = isActive;
    }
    return init;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of MENU_GROUPS) {
        if (!group.label) continue;
        const isActive = group.items.some((item) =>
          isActivePath(pathname, item.href),
        );
        if (isActive) next[group.label] = true;
      }
      return next;
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className="sticky top-0 hidden h-screen w-[200px] shrink-0 flex-col md:flex"
      style={{ background: "#1c1108", borderRight: "1px solid #3d3020" }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: "1px solid #3d3020" }}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
          style={{ background: "linear-gradient(135deg, #c4973d, #8b6920)", color: "#fff" }}
        >
          우리
        </div>
        <div>
          <p className="text-[11px] font-bold leading-snug" style={{ color: "#e8c97a" }}>CSO(주)우리메디텍</p>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: "#7a6040" }}>EDI 관리 시스템</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {MENU_GROUPS.map((group, groupIndex) => {
          /* 라벨 없는 그룹 (대시보드 등 최상위 메뉴) */
          if (!group.label) {
            return (
              <div key={`group-${groupIndex}`} className="mb-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all",
                        isActive
                          ? "text-[#e8c97a]"
                          : "text-[#7a6040] hover:text-[#c8a96e] hover:bg-[#fdf8f0]/5"
                      )}
                      style={isActive ? { background: "#3d3020" } : {}}
                    >
                      <Icon className="size-[15px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          }

          const isOpen = openGroups[group.label] ?? false;
          const hasActive = group.items.some((item) => isActivePath(pathname, item.href));

          return (
            <div key={group.label}>
              {/* 그룹 헤더 버튼 */}
              <button
                type="button"
                onClick={(