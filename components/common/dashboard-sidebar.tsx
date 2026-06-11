"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { MENU_GROUPS, isActivePath } from "@/components/common/nav-items";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#1a1f2e] md:flex">
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
