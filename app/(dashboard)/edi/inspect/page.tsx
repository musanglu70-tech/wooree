"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { FileCheck, Loader2 } from "lucide-react";

export default function EdiInspectPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [hasNone, setHasNone] = useState(false);

  useEffect(() => {
    supabase
      .from("prescriptions")
      .select("id")
      .eq("status", "saved")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0