"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  FileSpreadsheet,
  LayoutGrid,
  LogOut,
  ReceiptText,
  CalendarRange,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal/home", label: "홈", icon: LayoutGrid },
  { href: "/portal/settlement", label: "정산서 조회", icon: ReceiptText },
  { href: "/portal/monthly", label: "월별 합계", icon: CalendarRange },
];

export function PortalHeader({
  companyName,
  email,
}: {
  companyName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/portal/home" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#0f766e] text-white">
            <FileSpreadsheet className="size-4" />
          </div>
          <span className="text-base font-bold text-slate-900">
            CSO Portal
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#e6f4f1] text-[#0f766e]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[#0f766e] text-xs font-bold text-white">
              {companyName.slice(0, 1) || "U"}
            </span>
            <span className="hidden max-w-[140px] truncate sm:inline">
              {companyName}
            </span>
            <ChevronDown className="size-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {companyName}
                  </p>
                  <p className="truncate text-xs text-slate-400">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
