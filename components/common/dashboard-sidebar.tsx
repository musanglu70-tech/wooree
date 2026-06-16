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
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.08)] bg-[#1a1f2e] md:flex">
      <div className="px-5 py-6">
        <p className="text-[16px] font-bold tracking-tight text-white">
          CSO(주)우리메디텍
        </p>
        <p className="mt-1 text-[12px] font-medium tracking-wide text-[#7eb8ff]">
          EDI 관리 시스템
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
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
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors duration-150",
                          isActive
                            ? "bg-[#4f6ef7] text-white"
                            : "text-[#c0cce0] hover:bg-[rgba(79,110,247,0.15)] hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive ? "text-white" : "text-[#7eb8ff]",
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{item.label}</span>
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
            <div key={group.label} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.label!)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150",
                  hasActive
                    ? "bg-[rgba(79,110,247,0.1)] text-white"
                    : "text-[#a0b4cc] hover:text-white",
                )}
              >
                <span className="text-[13px] font-bold tracking-wide">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-200",
                    isOpen ? "rotate-180" : "rotate-0",
                    hasActive ? "text-[#7eb8ff]" : "text-[#a0b4cc]",
                  )}
                  strokeWidth={2.5}
                />
              </button>

              <ul
                className={cn(
                  "mt-0.5 space-y-0.5 overflow-hidden border-l border-[rgba(79,110,247,0.25)] ml-3 pl-2 transition-all duration-200",
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors duration-150",
                          isActive
                            ? "bg-[#4f6ef7] text-white"
                            : "text-[#c0cce0] hover:bg-[rgba(79,110,247,0.15)] hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[17px] shrink-0",
                            isActive ? "text-white" : "text-[#7eb8ff]",
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
          );
        })}
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.08)] px-3 py-4">
        {isAdmin && (
          <Link
            href={ADMIN_BOTTOM_MENU.href}
            className={cn(
              "mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors duration-150",
              isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                ? "bg-[#4f6ef7] text-white"
                : "text-[#c0cce0] hover:bg-[rgba(79,110,247,0.15)] hover:text-white",
            )}
          >
            <ADMIN_BOTTOM_MENU.icon
              className={cn(
                "size-[18px] shrink-0",
                isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                  ? "text-white"
                  : "text-[#7eb8ff]",
              )}
              strokeWidth={1.75}
            />
            {ADMIN_BOTTOM_MENU.label}
          </Link>
        )}
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#c0cce0] transition-colors duration-150 hover:text-white"
        >
          <LogOut className="size-[18px] shrink-0 text-[#7eb8ff]" strokeWidth={1.75} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
