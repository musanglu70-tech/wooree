"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/lib/edi/constants";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface PrescriptionDetail {
  id: string;
  pharmaName: string;
  hospitalName: string;
  businessNumber: string;
  prescriptionMonth: string;
  settlementMonth: string;
  status: string;
  memo: string;
}

interface PrescriptionItem {
  id: string;
  seq: number;
  insuranceCode: string;
  productName: string;
  unitPrice: number;
  quantityOriginal: number;
  quantityExternal: number;
  amount: number;
}

const STATUS_LABEL: Record<string, string> = {
  saved: "저장",
  confirmed: "확정",
  저장: "저장",
  확정: "확정",
};

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toMonthLabel(value: unknown): string {
  const str = toStr(value);
  if (str.length < 7) return str || "-";
  const [year, mon] = str.slice(0, 7).split("-");
  return mon ? `${year}년 ${mon}월` : str;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status ?? "-";
  const isConfirmed = status === "confirmed" || status === "확정";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        isConfirmed
          ? "bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]"
          : "bg-[#e2e8f0] text-[#475569]",
      )}
    >
      {label || "-"}
    </span>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#64748b]">{label}</p>
      <div className="mt-1 text-sm text-[#0f172a]">{children}</div>
    </div>
  );
}

export function EdiDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [headerResult, itemsResult] = await Promise.all([
        supabase
          .from("prescriptions")
          .select("*, pharma_companies(name)")
          .eq("id", id)
          .single(),
        supabase
          .from("prescription_items")
          .select("*")
          .eq("prescription_id", id)
          .order("seq", { ascending: true }),
      ]);

      if (!active) return;

      if (headerResult.error || !headerResult.data) {
        toast.error(
          "상세 정보를 불러오지 못했습니다: " +
            (headerResult.error?.message ?? "데이터가 없습니다."),
        );
        setDetail(null);
      } else {
        const row = headerResult.data as Record<string, unknown>;
        const pharma = row.pharma_companies as { name?: string } | null;
        setDetail({
          id: toStr(row.id),
          pharmaName: toStr(pharma?.name),
          hospitalName: toStr(row.hospital_name),
          businessNumber: toStr(row.business_number),
          prescriptionMonth: toStr(row.prescription_date),
          settlementMonth: toStr(row.settlement_date),
          status: toStr(row.status),
          memo: toStr(row.memo),
        });
      }

      if (itemsResult.error) {
        toast.error("처방 품목을 불러오지 못했습니다: " + itemsResult.error.message);
        setItems([]);
      } else {
        setItems(
          ((itemsResult.data as Record<string, unknown>[]) ?? []).map((row) => ({
            id: toStr(row.id),
            seq: toNumber(row.seq),
            insuranceCode: toStr(row.insurance_code),
            productName: toStr(row.product_name),
            unitPrice: toNumber(row.unit_price),
            quantityOriginal: toNumber(row.quantity_original),
            quantityExternal: toNumber(row.quantity_external),
            amount: toNumber(row.amount),
          })),
        );
      }

      setIsLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [supabase, id]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );

  const isConfirmed =
    detail?.status === "confirmed" || detail?.status === "확정";

  const handleConfirm = async () => {
    if (!detail) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status: "confirmed" })
        .eq("id", detail.id);

      if (error) {
        toast.error("확정 처리에 실패했습니다: " + error.message);
        return;
      }

      setDetail((prev) => (prev ? { ...prev, status: "confirmed" } : prev));
      toast.success("확정 처리되었습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (
      !window.confirm(
        "이 처방 데이터를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.",
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const { error: itemsError } = await supabase
        .from("prescription_items")
        .delete()
        .eq("prescription_id", detail.id);

      if (itemsError) {
        toast.error("삭제 실패: " + itemsError.message);
        return;
      }

      const { error: headerError } = await supabase
        .from("prescriptions")
        .delete()
        .eq("id", detail.id);

      if (headerError) {
        toast.error("삭제 실패: " + headerError.message);
        return;
      }

      toast.success("삭제되었습니다.");
      router.push("/edi/list");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-5 py-16 text-center text-sm text-[#64748b] shadow-sm">
        불러오는 중...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/edi/list"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] transition-colors hover:text-[#4f6ef7]"
        >
          <ArrowLeft className="size-4" />
          저장 목록
        </Link>
        <div className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-5 py-16 text-center text-sm text-[#64748b] shadow-sm">
          처방 데이터를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/edi/list"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] transition-colors hover:text-[#4f6ef7]"
          >
            <ArrowLeft className="size-4" />
            저장 목록
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">
            처방 상세
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating || isConfirmed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d5ce5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" />
            {isConfirmed ? "확정됨" : isUpdating ? "처리 중..." : "확정"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-[#ffffff] px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>

      {/* 기본정보 */}
      <section className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[#0f172a]">기본정보</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="제약사">{detail.pharmaName || "-"}</InfoField>
          <InfoField label="병의원명">{detail.hospitalName || "-"}</InfoField>
          <InfoField label="사업자번호">{detail.businessNumber || "-"}</InfoField>
          <InfoField label="처방월">
            {toMonthLabel(detail.prescriptionMonth)}
          </InfoField>
          <InfoField label="정산월">
            {toMonthLabel(detail.settlementMonth)}
          </InfoField>
          <InfoField label="상태">
            <StatusBadge status={detail.status} />
          </InfoField>
          <div className="sm:col-span-2 lg:col-span-3">
            <InfoField label="메모">{detail.memo || "-"}</InfoField>
          </div>
        </div>
      </section>

      {/* 처방 품목 */}
      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
        <div className="border-b border-[#e2e8f0] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#0f172a]">
            처방 품목{" "}
            <span className="font-normal text-[#64748b]">
              ({items.length}건)
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-5 py-3 font-medium text-[#475569]">순번</th>
                <th className="px-5 py-3 font-medium text-[#475569]">
                  보험코드
                </th>
                <th className="px-5 py-3 font-medium text-[#475569]">제품명</th>
                <th className="px-5 py-3 text-right font-medium text-[#475569]">
                  단가
                </th>
                <th className="px-5 py-3 text-right font-medium text-[#475569]">
                  원내수량
                </th>
                <th className="px-5 py-3 text-right font-medium text-[#475569]">
                  원외수량
                </th>
                <th className="px-5 py-3 text-right font-medium text-[#475569]">
                  처방금액
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#64748b]"
                  >
                    처방 품목이 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={cn(
                      "border-b border-[#f1f5f9] last:border-b-0",
                      index % 2 === 1 && "bg-[#f8fafc]/40",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[#475569]">{item.seq}</td>
                    <td className="px-5 py-3.5 text-[#475569]">
                      {item.insuranceCode || "-"}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#0f172a]">
                      {item.productName || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#475569]">
                      {item.unitPrice.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#475569]">
                      {item.quantityOriginal.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#475569]">
                      {item.quantityExternal.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium tabular-nums text-[#0f172a]">
                      {formatWon(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                <td colSpan={6} className="px-5 py-3.5 text-right text-[#475569]">
                  합계금액
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[#4f6ef7]">
                  {formatWon(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
