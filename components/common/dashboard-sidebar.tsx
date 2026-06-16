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
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col md:flex"
      style={{ background: "linear-gradient(180deg, #0f1623 0%, #0d1117 100%)" }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-[12px] font-black tracking-tight shadow-lg"
            style={{ background: "linear-gradient(135deg, #4f6ef7 0%, #7c3aed 100%)" }}>
            우리
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white leading-tight">CSO(주)우리메디텍</p>
            <p className="text-[10px] font-semibold mt-0.5"
              style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              EDI 관리 시스템
            </p>
          </div>
        </div>
        <div className="mt-4 h-px w-full" style={{ background: "linear-gradient(90deg, rgba(79,110,247,0.5), transparent)" }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {MENU_GROUPS.map((group, groupIndex) => {
          if (!group.label) {
            return (
              <div key={`group-${groupIndex}`} className="mb-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "text-white shadow-md"
                          : "text-[#6b7fa3] hover:text-white hover:bg-white/5",
                      )}
                      style={isActive ? { background: "linear-gradient(135deg, #4f6ef7, #6d28d9)" } : {}}>
                      <Icon className={cn("size-[16px] shrink-0", isActive ? "text-white" : "text-[#4f6ef7]")} strokeWidth={isActive ? 2.5 : 1.75} />
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
            <div key={group.label} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.label!)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-150",
                  hasActive
                    ? "bg-white/5 text-white"
                    : "text-[#4a5e7a] hover:bg-white/5 hover:text-[#8fa8cc]",
                )}>
                {/* Color dot for each group */}
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 transition-all", hasActive ? "opacity-100" : "opacity-40")}
                  style={{ background: hasActive ? "linear-gradient(135deg, #4f6ef7, #7c3aed)" : "#4a5e7a" }} />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight
                  className={cn("size-3.5 shrink-0 transition-transform duration-200 ease-out", isOpen && "rotate-90")}
                  strokeWidth={2.5}
                  style={{ color: hasActive ? "#60a5fa" : "#334155" }}
                />
              </button>

              <div className={cn(
                "overflow-hidden transition-all duration-200 ease-out",
                isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
              )}>
                <div className="ml-3 mt-0.5 space-y-0.5 border-l pl-2"
                  style={{ borderColor: "rgba(79,110,247,0.2)" }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);
                    return (
                      <Link key={item.href} href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "text-white shadow-sm"
                            : "text-[#6b7fa3] hover:bg-white/5 hover:text-white",
                        )}
                        style={isActive ? { background: "linear-gradient(135deg, rgba(79,110,247,0.8), rgba(109,40,217,0.8))" } : {}}>
                        <Icon
                          className={cn("size-[15px] shrink-0", isActive ? "text-white" : "text-[#334d6e]")}
                          strokeWidth={isActive ? 2.5 : 1.75}
                        />
                        <span className="truncate">{item.label}</span>
                        {isActive && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <div className="mb-2 h-px" style={{ background: "linear-gradient(90deg, rgba(79,110,247,0.3), transparent)" }} />
        <div className="space-y-0.5">
          {isAdmin && (
            <Link href={ADMIN_BOTTOM_MENU.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                  ? "text-white"
                  : "text-[#6b7fa3] hover:bg-white/5 hover:text-white",
              )}
              style={isActivePath(pathname, ADMIN_BOTTOM_MENU.href) ? { background: "linear-gradient(135deg, #4f6ef7, #6d28d9)" } : {}}>
              <ADMIN_BOTTOM_MENU.icon className="size-[15px] shrink-0 text-[#4f6ef7]" strokeWidth={1.75} />
              {ADMIN_BOTTOM_MENU.label}
            </Link>
          )}
          <button type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#4a5e7a] transition-all hover:bg-white/5 hover:text-[#6b7fa3]">
            <LogOut className="size-[15px] shrink-0" strokeWidth={1.75} />
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
}
