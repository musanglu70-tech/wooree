"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected";

interface Partner {
  id: string;
  name: string;
  businessNumber: string;
  representative: string;
  contactPhone: string;
  contactEmail: string;
  bankName: string;
  accountNumber: string;
  address: string;
  status: Status;
  createdAt: string;
}

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function normalize(row: Record<string, unknown>): Partner {
  const status = toStr(row.status) as Status;
  return {
    id: toStr(row.id),
    name: toStr(row.name),
    businessNumber: toStr(row.business_number),
    representative: toStr(row.representative),
    contactPhone: toStr(row.contact_phone ?? row.phone),
    contactEmail: toStr(row.contact_email ?? row.email),
    bankName: toStr(row.bank_name),
    accountNumber: toStr(row.account_number),
    address: toStr(row.address),
    status: (["pending", "approved", "rejected"] as Status[]).includes(status)
      ? status
      : "approved",
    createdAt: toStr(row.created_at).slice(0, 10),
  };
}

const TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "승인 완료" },
  { key: "rejected", label: "반려" },
];

const STATUS_BADGE: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-emerald-50 text-emerald-600",
  rejected: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

export function PartnersContent() {
  const supabase = useMemo(() => createClient(), []);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    supabase
      .from("companies")
      .select(
        "id, name, business_number, representative, contact_phone, phone, contact_email, email, bank_name, account_number, address, status, created_at",
      )
      .not("auth_user_id", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("목록 불러오기 실패: " + error.message);
          setPartners([]);
        } else {
          setPartners(
            ((data as Record<string, unknown>[]) ?? []).map(normalize),
          );
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const filtered = partners.filter((p) => p.status === tab);
  const counts = {
    pending: partners.filter((p) => p.status === "pending").length,
    approved: partners.filter((p) => p.status === "approved").length,
    rejected: partners.filter((p) => p.status === "rejected").length,
  };

  const act = async (p: Partner, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm(`'${p.name}' 신청을 반려할까요?`))
      return;
    setBusyId(p.id);
    try {
      const res = await fetch("/api/partners/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: p.id, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "처리 실패");
        return;
      }
      toast.success(
        action === "approve"
          ? `승인되었습니다.${json.emailSent ? " (안내 메일 발송)" : ""}`
          : "반려되었습니다.",
      );
      load();
    } catch (e) {
      toast.error("요청 실패: " + (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-[#4f6ef7] text-white"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-70">
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-[#4f6ef7] hover:text-[#4f6ef7]"
        >
          <RefreshCw className="size-4" />
          새로고침
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">업체명</th>
                <th className="px-4 py-3 font-medium">사업자번호</th>
                <th className="px-4 py-3 font-medium">대표자</th>
                <th className="px-4 py-3 font-medium">담당자 연락처</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">정산 계좌</th>
                <th className="px-4 py-3 font-medium">신청일</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 text-center font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    해당 상태의 신청이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.businessNumber || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.representative || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.contactPhone || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.contactEmail || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.bankName ? `${p.bankName} ${p.accountNumber}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.createdAt || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          STATUS_BADGE[p.status],
                        )}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status !== "approved" && (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => act(p, "approve")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <Check className="size-3.5" />
                            승인
                          </button>
                        )}
                        {p.status !== "rejected" && (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => act(p, "reject")}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            <X className="size-3.5" />
                            반려
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
