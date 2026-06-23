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
                          : "text-[#7a6040] hover:text-[#c8a96e] hover:bg-white/5"
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
                onClick={() => toggleGroup(group.label!)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  (hasActive || isOpen)
                    ? "text-[#e8c97a]"
                    : "text-[#7a6040] hover:text-[#c8a96e] hover:bg-white/5"
                )}
                style={(hasActive || isOpen) ? { background: "#3d3020" } : {}}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: (hasActive || isOpen) ? "#c4973d" : "#4a3a28" }}
                />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn("size-3.5 shrink-0 transition-transform duration-200", isOpen && "-rotate-180")}
                  strokeWidth={2.5}
                  style={{ color: (hasActive || isOpen) ? "#c4973d" : "#4a3a28" }}
                />
              </button>

              {/* 서브메뉴 */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "max-h-96 opacity-100 mt-0.5 mb-1" : "max-h-0 opacity-0"
                )}
              >
                <div className="ml-3 space-y-0.5 border-l pl-2.5" style={{ borderColor: hasActive ? "#c4973d" : "#3d3020" }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all",
                          isActive
                            ? "text-[#e8c97a]"
                            : "text-[#7a6040] hover:text-[#c8a96e] hover:bg-white/5"
                        )}
                        style={isActive ? { background: "rgba(196,151,61,0.15)" } : {}}
                      >
                        <Icon
                          className="size-[13px] shrink-0"
                          strokeWidth={isActive ? 2.5 : 1.75}
                          style={{ color: isActive ? "#c4973d" : "#4a3a28" }}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#c4973d" }} />
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
      <div className="px-2 pb-3" style={{ borderTop: "1px solid #3d3020", paddingTop: "10px" }}>
        {isAdmin && (
          <Link
            href={ADMIN_BOTTOM_MENU.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all mb-0.5",
              isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                ? "text-[#e8c97a]"
                : "text-[#7a6040] hover:text-[#c8a96e] hover:bg-white/5"
            )}
            style={isActivePath(pathname, ADMIN_BOTTOM_MENU.href) ? { background: "#3d3020" } : {}}
          >
            <ADMIN_BOTTOM_MENU.icon className="size-[15px] shrink-0" strokeWidth={2} style={{ color: "#c4973d" }} />
            {ADMIN_BOTTOM_MENU.label}
          </Link>
        )}
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all hover:bg-white/5"
          style={{ color: "#4a3a28" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#7a6040")}
          onMouseLeave={e => (e.currentTarget.style.color = "#4a3a28")}
        >
          <LogOut className="size-[15px] shrink-0" strokeWidth={2} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
