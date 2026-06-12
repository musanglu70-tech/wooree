"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export type UserRole = "admin" | "user" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRole(value: unknown): UserRole {
  const role = toStr(value);
  if (role === "admin" || role === "viewer") return role;
  return "user";
}

export function useUserProfile() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (data) {
        const row = data as Record<string, unknown>;
        setProfile({
          id: toStr(row.id),
          email: toStr(row.email ?? user.email),
          name: toStr(row.name ?? row.full_name),
          role: normalizeRole(row.role),
        });
      } else {
        setProfile({
          id: user.id,
          email: user.email ?? "",
          name: "",
          role: "user",
        });
      }

      setIsLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [supabase]);

  return { profile, isLoading, isAdmin: profile?.role === "admin" };
}
