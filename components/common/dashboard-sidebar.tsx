"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
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
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col bg-[#0f1117] md:flex">
      {/* Logo area */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f6ef7] text-white text-[11px] font-bold shrink-0">
          우리
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white leading-tight">CSO(주)우리메디텍</p>
          <p className="text-[10px] text-[#4f6ef7] font-medium mt-0.5">EDI 관리 시스템</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {MENU_GROUPS.map((group, groupIndex) => {
          if (!group.label) {
            return (
              <ul key={`group-${groupIndex}`} className="space-y-0.5 mb-3">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-[#4f6ef7] text-white shadow-lg shadow-[#4f6ef7]/20"
                            : "text-[#94a3b8] hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="size-[16px] shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            );
          }

          const isOpen = openGroups[group.label] ?? false;
          const hasActive = group.items.some((item) =>
            isActivePath(pathname, item.href),
          );

          return (
            <div key={group.label} className="mb-1.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.label!)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all duration-150",
                  hasActive
                    ? "text-white"
                    : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/5",
                )}
              >
                <div className="flex items-center gap-2">
                  {hasActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4f6ef7] shrink-0" />
                  )}
                  <span className={cn(
                    "text-[12px] font-semibold tracking-wide",
                    !hasActive && "ml-[14px]",
                  )}>
                    {group.label}
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    isOpen && "rotate-90",
                    hasActive ? "text-[#4f6ef7]" : "text-[#475569]",
                  )}
                  strokeWidth={2.5}
                />
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "max-h-96 opacity-100 mt-0.5" : "max-h-0 opacity-0",
                )}
              >
                <ul className="space-y-0.5 pl-3 border-l-2 border-white/5 ml-3">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                            isActive
                              ? "bg-[#4f6ef7] text-white shadow-lg shadow-[#4f6ef7]/20"
                              : "text-[#94a3b8] hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-[15px] shrink-0",
                              isActive ? "text-white" : "text-[#64748b]",
                            )}
                            strokeWidth={isActive ? 2 : 1.75}
                          />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60 shrink-0" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/5 px-2.5 py-3 space-y-0.5">
        {isAdmin && (
          <Link
            href={ADMIN_BOTTOM_MENU.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
              isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                ? "bg-[#4f6ef7] text-white"
                : "text-[#94a3b8] hover:bg-white/5 hover:text-white",
            )}
          >
            <ADMIN_BOTTOM_MENU.icon className="size-[16px] shrink-0" strokeWidth={1.75} />
            {ADMIN_BOTTOM_MENU.label}
          </Link>
        )}
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#64748b] transition-all duration-150 hover:bg-white/5 hover:text-[#94a3b8]"
        >
          <LogOut className="size-[16px] shrink-0" strokeWidth={1.75} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
