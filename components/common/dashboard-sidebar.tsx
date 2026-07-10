"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ADMIN_BOTTOM_MENU,
  getMenuGroups,
  isActivePath,
} from "@/components/common/nav-items";
import { TenantSwitcher } from "@/components/common/tenant-switcher";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useUserProfile();
  const menuGroups = getMenuGroups(isAdmin);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const group of menuGroups) {
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
      for (const group of menuGroups) {
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
      style={{ background: "#0f0e17", borderRight: "1px solid #1e1b2e" }}
    >
      {/* 로고 */}
      <div
        className="flex items-center gap-2.5 px-4 py-4"
        style={{ borderBottom: "1px solid #1e1b2e" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
          style={{ background: "#4f6ef7", color: "#fff" }}
        >
          우리
        </div>
        <div>
          <p className="text-[11px] font-bold leading-snug" style={{ color: "#e2e8f0" }}>
            CSO(주)우리메디텍
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "#64748b" }}>
            EDI 관리 시스템
          </p>
        </div>
      </div>

      {/* 테넌트 전환 (관리자 전용) */}
      <TenantSwitcher />

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {menuGroups.map((group, groupIndex) => {
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
                          ? "text-white"
                          : "text-[#64748b] hover:bg-white/5 hover:text-[#94a3b8]",
                      )}
                      style={
                        isActive
                          ? { background: "#4f6ef7" }
                          : {}
                      }
                    >
                      <Icon
                        className="size-[15px] shrink-0"
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          }

          const isOpen = openGroups[group.label] ?? false;
          const hasActive = group.items.some((item) =>
            isActivePath(pathname, item.href),
          );

          return (
            <div key={group.label} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.label!)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  hasActive || isOpen
                    ? "text-white"
                    : "text-[#64748b] hover:bg-white/5 hover:text-[#94a3b8]",
                )}
                style={
                  hasActive || isOpen
                    ? { background: "#4f6ef7" }
                    : {}
                }
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: hasActive || isOpen ? "#c7d2fe" : "#334155" }}
                />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    isOpen && "-rotate-180",
                  )}
                  strokeWidth={2.5}
                  style={{ color: hasActive || isOpen ? "#c7d2fe" : "#334155" }}
                />
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "mb-1 mt-0.5 max-h-96 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div
                  className="ml-3 space-y-0.5 border-l pl-2.5"
                  style={{ borderColor: hasActive ? "#6366f1" : "#1e1b2e" }}
                >
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
                            ? "text-white"
                            : "text-[#64748b] hover:bg-white/5 hover:text-[#94a3b8]",
                        )}
                        style={isActive ? { background: "rgba(79,110,247,0.25)" } : {}}
                      >
                        <Icon
                          className="size-[13px] shrink-0"
                          strokeWidth={isActive ? 2.5 : 1.75}
                          style={{ color: isActive ? "#4f6ef7" : "#334155" }}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span
                            className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: "#4f6ef7" }}
                          />
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
      <div
        className="px-2 pb-3"
        style={{ borderTop: "1px solid #1e1b2e", paddingTop: "10px" }}
      >
        {isAdmin && (
          <Link
            href={ADMIN_BOTTOM_MENU.href}
            className={cn(
              "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all",
              isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                ? "text-white"
                : "text-[#64748b] hover:bg-white/5 hover:text-[#94a3b8]",
            )}
            style={
              isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                ? { background: "#4f6ef7" }
                : {}
            }
          >
            <ADMIN_BOTTOM_MENU.icon
              className="size-[15px] shrink-0"
              strokeWidth={2}
              style={{ color: "#4f6ef7" }}
            />
            {ADMIN_BOTTOM_MENU.label}
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all hover:bg-white/5"
          style={{ color: "#334155" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
        >
          <LogOut className="size-[15px] shrink-0" strokeWidth={2} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
