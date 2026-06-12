"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FilePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MENU_GROUPS, ADMIN_BOTTOM_MENU, isActivePath } from "@/components/common/nav-items";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";

interface BottomItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const BOTTOM_ITEMS: BottomItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/edi/new", label: "신규 입력", icon: FilePlus },
  { href: "/edi/list", label: "저장 목록", icon: Save },
];

const ACTIVE_COLOR = "text-[#3b2e2e]";
const INACTIVE_COLOR = "text-[#9b8e7e]";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { isAdmin } = useUserProfile();

  return (
    <>
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e7ddd0] bg-white px-4 md:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#3b2e2e]">
            CSO(주)우리메디텍
          </p>
          <p className="truncate text-[11px] text-[#9b8e7e]">EDI 관리 시스템</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.refresh()}
            aria-label="새로고침"
            className="flex size-9 items-center justify-center rounded-lg text-[#3b2e2e] transition-colors hover:bg-[#f5f0eb]"
          >
            <RotateCcw className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            className="flex size-9 items-center justify-center rounded-lg text-[#3b2e2e] transition-colors hover:bg-[#f5f0eb]"
          >
            <Menu className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* 하단 네비게이션 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-[#e7ddd0] bg-white md:hidden">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active ? ACTIVE_COLOR : INACTIVE_COLOR,
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/products"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
            isActivePath(pathname, "/products") ? ACTIVE_COLOR : INACTIVE_COLOR,
          )}
        >
          <Pill className="size-5" strokeWidth={isActivePath(pathname, "/products") ? 2.25 : 1.75} />
          의약품
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
            open ? ACTIVE_COLOR : INACTIVE_COLOR,
          )}
        >
          <Menu className="size-5" strokeWidth={1.75} />
          메뉴
        </button>
      </nav>

      {/* 메뉴 드로어 */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute right-0 top-0 flex h-full w-[280px] max-w-[85%] flex-col bg-[#1a1f2e] shadow-xl">
            <div className="flex items-start justify-between px-5 py-5">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-tight text-white">
                  CSO(주)우리메디텍
                </p>
                <p className="mt-1 text-[11px] font-medium tracking-wide text-[#8892a4]">
                  EDI 관리 시스템
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8892a4] transition-colors hover:text-white"
              >
                <X className="size-5" />
              </button>
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
                      const active = isActivePath(pathname, item.href);
                      const isSubMenu = group.label !== null;

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors duration-150",
                              isSubMenu ? "pl-6 pr-3" : "px-3",
                              active
                                ? "bg-[#4f6ef7] text-white"
                                : "text-[#8892a4] hover:bg-[rgba(79,110,247,0.12)] hover:text-[#c5cdd9]",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4 shrink-0",
                                active ? "text-white" : "text-[#8892a4]",
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

            <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-4">
              {isAdmin && (
                <Link
                  href={ADMIN_BOTTOM_MENU.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                    isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                      ? "bg-[#4f6ef7] text-white"
                      : "text-[#8892a4] hover:bg-[rgba(79,110,247,0.12)] hover:text-[#c5cdd9]",
                  )}
                >
                  <ADMIN_BOTTOM_MENU.icon
                    className={cn(
                      "size-4 shrink-0",
                      isActivePath(pathname, ADMIN_BOTTOM_MENU.href)
                        ? "text-white"
                        : "text-[#8892a4]",
                    )}
                    strokeWidth={1.75}
                  />
                  {ADMIN_BOTTOM_MENU.label}
                </Link>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-[13px] font-medium text-[#8892a4] transition-colors duration-150 hover:text-white"
              >
                <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
