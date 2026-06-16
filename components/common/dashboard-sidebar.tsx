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
      className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col md:flex"
      style={{ background: "#111827", borderRight: "1px solid #1f2937" }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid #1f2937" }}>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-[12px] font-black"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
        >
          우리
        </div>
        <div>
          <p className="text-[13px] font-bold text-white leading-snug">CSO(주)우리메디텍</p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "#60a5fa" }}>EDI 관리 시스템</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {MENU_GROUPS.map((group, groupIndex) => {
          /* 라벨 없는 그룹 (대시보드, 공지 등 최상위 메뉴) */
          if (!group.label) {
            return (
              <div key={`group-${groupIndex}`} className="mb-3 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-all",
                        isActive
                          ? "text-white"
                          : "text-[#9ca3af] hover:text-white hover:bg-white/5"
                      )}
                      style={isActive ? { background: "linear-gradient(90deg, #2563eb, #7c3aed)", boxShadow: "0 2px 8px rgba(37,99,235,0.35)" } : {}}
                    >
                      <Icon className="size-[17px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
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
                onClick={() => toggleGroup(group.label!)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-bold transition-all",
                  hasActive
                    ? "text-white bg-white/5"
                    : "text-[#9ca3af] hover:text-white hover:bg-white/5"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: hasActive ? "#3b82f6" : "#374151" }}
                />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn("size-4 shrink-0 transition-transform duration-200", isOpen && "-rotate-180")}
                  strokeWidth={2.5}
                  style={{ color: hasActive ? "#60a5fa" : "#4b5563" }}
                />
              </button>

              {/* 서브메뉴 */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "max-h-96 opacity-100 mt-0.5 mb-1" : "max-h-0 opacity-0"
                )}
              >
                <div className="ml-4 space-y-0.5 border-l-2 pl-3" style={{ borderColor: hasActive ? "#2563eb" : "#1f2937" }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                          isActive
                            ? "text-white"
                            : "text-[#9ca3af] hover:text-white hover:bg-white/5"
                        )}
                        style={isActive ? { background: "rgba(37,99,235,0.25)", color: "#93c5fd" } : {}}
                      >
                        <Icon
                          className="size-[15px] shrink-0"
                          strokeWidth={isActive ? 2.5 : 1.75}
                          style={{ color: isActive ? "#60a5fa" : "#6b7280" }}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* 하단 */}
      <div className="px-3 pb-4" style={{ borderTop: "1px solid #1f2937", paddingTop: "12px" }}>
        {isAdmin && (
          <Link
            href={ADMIN_BOTTOM_MENU.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-all mb-0.5",
              isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                ? "text-white"
                : "text-[#9ca3af] hover:text-white hover:bg-white/5"
            )}
            style={isActivePath(pathname, ADMIN_BOTTOM_MENU.href) ? { background: "linear-gradient(90deg, #2563eb, #7c3aed)" } : {}}
          >
            <ADMIN_BOTTOM_MENU.icon className="size-[17px] shrink-0" strokeWidth={2} style={{ color: "#60a5fa" }} />
            {ADMIN_BOTTOM_MENU.label}
          </Link>
        )}
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-[#6b7280] transition-all hover:bg-white/5 hover:text-[#9ca3af]"
        >
          <LogOut className="size-[17px] shrink-0" strokeWidth={2} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
