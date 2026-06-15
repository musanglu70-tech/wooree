import { NextResponse } from "next/server";
import { buildCodeCandidates } from "@/lib/edi/product-by-code";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function mapProduct(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    insurance_code: String(row.insurance_code ?? ""),
    name: String(row.name ?? ""),
    unit_price: Number(row.unit_price) || 0,
    commission_rate:
      row.commission_rate == null || row.commission_rate === ""
        ? null
        : Number(row.commission_rate),
    extra_commission_rate:
      row.extra_commission_rate == null || row.extra_commission_rate === ""
        ? null
        : Number(row.extra_commission_rate),
  };
}

/** GET /api/products/by-code?code=650200400 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json(
      { message: "code query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const candidates = buildCodeCandidates(code);

    for (const candidate of candidates) {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, insurance_code, name, unit_price, commission_rate, extra_commission_rate",
        )
        .eq("insurance_code", candidate)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      if (data) {
        return NextResponse.json({
          product: mapProduct(data as Record<string, unknown>),
          code: candidate,
        });
      }
    }

    const { data: fuzzy, error: fuzzyError } = await supabase
      .from("products")
      .select(
        "id, insurance_code, name, unit_price, commission_rate, extra_commission_rate",
      )
      .ilike("insurance_code", code)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (fuzzyError) {
      return NextResponse.json({ message: fuzzyError.message }, { status: 500 });
    }

    if (!fuzzy) {
      return NextResponse.json({ product: null, code }, { status: 404 });
    }

    return NextResponse.json({
      product: mapProduct(fuzzy as Record<string, unknown>),
      code,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Product lookup failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
