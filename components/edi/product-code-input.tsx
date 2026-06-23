"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export interface ProductSuggestion {
  insuranceCode: string;
  productName: string;
  unitPrice: number;
  commissionRate: number | null;
  extraCommissionRate: number | null;
}

interface ProductCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onSelect: (product: ProductSuggestion) => void;
  commissionRate?: number | null;
  extraCommissionRate?: number | null;
  needsReview?: boolean;
  className?: string;
}

function mapProductRow(row: Record<string, unknown>): ProductSuggestion {
  const commissionRate = row.commission_rate;
  const extraCommissionRate = row.extra_commission_rate;

  return {
    insuranceCode: toStr(row.insurance_code),
    productName: toStr(row.name),
    unitPrice: toNumber(row.unit_price),
    commissionRate:
      commissionRate == null || commissionRate === ""
        ? null
        : toNumber(commissionRate),
    extraCommissionRate:
      extraCommissionRate == null || extraCommissionRate === ""
        ? null
        : toNumber(extraCommissionRate),
  };
}

export function formatCommissionLabel(
  commissionRate?: number | null,
  extraCommissionRate?: number | null,
): string {
  const primary =
    commissionRate != null && Number.isFinite(commissionRate)
      ? `${commissionRate}%`
      : "";
  const extra =
    extraCommissionRate != null && Number.isFinite(extraCommissionRate)
      ? `${extraCommissionRate}%`
      : "";

  if (primary && extra) return `${primary} / ${extra}`;
  return primary || extra;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mapApiProduct(product: {
  insurance_code: string;
  name: string;
  unit_price: number;
  commission_rate: number | null;
  extra_commission_rate: number | null;
}): ProductSuggestion {
  return {
    insuranceCode: product.insurance_code,
    productName: product.name,
    unitPrice: product.unit_price,
    commissionRate: product.commission_rate,
    extraCommissionRate: product.extra_commission_rate,
  };
}

export function ProductCodeInput({
  value,
  onChange,
  onSelect,
  commissionRate,
  extraCommissionRate,
  needsReview,
  className,
}: ProductCodeInputProps) {
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const keyword = value.trim();
    if (keyword.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      supabase
        .from("products")
        .select(
          "insurance_code, name, unit_price, commission_rate, extra_commission_rate",
        )
        .ilike("insurance_code", `%${keyword}%`)
        .eq("is_active", true)
        .limit(8)
        .then(({ data, error }) => {
          if (!active || error) return;
          const items = ((data as Record<string, unknown>[]) ?? []).map(
            mapProductRow,
          );
          setSuggestions(items);
          setIsOpen(items.length > 0);
          setActiveIndex(0);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [supabase, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickSuggestion = (product: ProductSuggestion) => {
    onSelect(product);
    setIsOpen(false);
  };

  const tryExactMatch = async () => {
    const keyword = value.trim();
    if (!keyword) return;

    const response = await fetch(
      `/api/products/by-code?code=${encodeURIComponent(keyword)}`,
    );

    if (!response.ok) return;

    const body = (await response.json()) as {
      product?: {
        insurance_code: string;
        name: string;
        unit_price: number;
        commission_rate: number | null;
        extra_commission_rate: number | null;
      };
    };

    if (body.product) {
      onSelect(mapApiProduct(body.product));
    }
  };

  const rateLabel = formatCommissionLabel(commissionRate, extraCommissionRate);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <div
        className={cn(
          "relative flex min-w-0 flex-1 items-center rounded-md",
          needsReview && "bg-amber-100 ring-1 ring-amber-300",
        )}
      >
        {needsReview ? (
          <span
            className="pointer-events-none absolute left-1 text-amber-600"
            title="확인필요"
            aria-hidden
          >
            ⚠️
          </span>
        ) : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            void tryExactMatch();
          }}
        onKeyDown={(e) => {
          if (!isOpen || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pickSuggestion(suggestions[activeIndex]);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
          className={cn(
            className,
            rateLabel && "min-w-0 flex-1",
            needsReview && "pl-6",
          )}
        />
      </div>

      {rateLabel ? (
        <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-[#c8a882]">
          {rateLabel}
        </span>
      ) : null}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0