"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface ProductSuggestion {
  insuranceCode: string;
  productName: string;
  unitPrice: number;
}

interface ProductCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onSelect: (product: ProductSuggestion) => void;
  className?: string;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function ProductCodeInput({
  value,
  onChange,
  onSelect,
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
        .select("insurance_code, name, unit_price")
        .ilike("insurance_code", `%${keyword}%`)
        .eq("is_active", true)
        .limit(8)
        .then(({ data, error }) => {
          if (!active || error) return;
          const items = ((data as Record<string, unknown>[]) ?? []).map(
            (row) => ({
              insuranceCode: toStr(row.insurance_code),
              productName: toStr(row.name),
              unitPrice: toNumber(row.unit_price),
            }),
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

    const { data } = await supabase
      .from("products")
      .select("insurance_code, name, unit_price")
      .eq("insurance_code", keyword)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      onSelect({
        insuranceCode: toStr(data.insurance_code),
        productName: toStr(data.name),
        unitPrice: toNumber(data.unit_price),
      });
    }
  };

  return (
    <div ref={containerRef} className="relative">
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
        className={className}
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((item, index) => (
            <li key={item.insuranceCode}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(item)}
                className={cn(
                  "flex w-full flex-col px-3 py-2 text-left text-xs transition-colors",
                  index === activeIndex
                    ? "bg-[rgba(79,110,247,0.08)] text-[#4f6ef7]"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <span className="font-mono font-medium">
                  {item.insuranceCode}
                </span>
                <span className="mt-0.5 text-slate-500">
                  {item.productName} ·{" "}
                  {item.unitPrice.toLocaleString("ko-KR")}원
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
