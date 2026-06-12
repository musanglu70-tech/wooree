"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { useUserProfile, type UserRole } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "관리자" },
  { value: "user", label: "일반" },
  { value: "viewer", label: "조회" },
];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "관리자",
  user: "일반",
  viewer: "조회",
};

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeRole(value: unknown): UserRole {
  const role = toStr(value);
  if (role === "admin" || role === "viewer") return role;
  return "user";
}

function normalizeRow(row: Record<string, unknown>): ProfileRow {
  return {
    id: toStr(row.id),
    email: toStr(row.email),
    name: toStr(row.name ?? row.full_name),
    role: normalizeRole(row.role),
    createdAt: toStr(row.created_at).slice(0, 10),
  };
}

export function UsersContent() {
  const supabase = useMemo(() => createClient(), []);
  const { isAdmin, isLoading: isProfileLoading } = useUserProfile();

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useMemo(
    () => async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("사용자 목록을 불러오지 못했습니다: " + error.message);
        setUsers([]);
      } else {
        setUsers(
          ((data as Record<string, unknown>[]) ?? []).map(normalizeRow),
        );
      }
      setIsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    if (!isProfileLoading && isAdmin) {
      loadUsers();
    } else if (!isProfileLoading) {
      setIsLoading(false);
    }
  }, [isProfileLoading, isAdmin, loadUsers]);

  const handleRoleChange = async (user: ProfileRow, role: UserRole) => {
    if (user.role === role) return;

    setUpdatingId(user.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", user.id);

      if (error) {
        toast.error("역할 변경 실패: " + error.message);
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role } : u)),
      );
      toast.success(
        `'${user.email || user.name}'의 역할이 ${ROLE_LABEL[role]}(으)로 변경되었습니다.`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500 shadow-sm">
        불러오는 중...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500 shadow-sm">
        관리자만 접근할 수 있습니다.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          사용자 목록{" "}
          <span className="font-normal text-slate-500">
            ({users.length}명)
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 font-medium text-slate-600">이메일</th>
              <th className="px-5 py-3 font-medium text-slate-600">이름</th>
              <th className="px-5 py-3 font-medium text-slate-600">역할</th>
              <th className="px-5 py-3 font-medium text-slate-600">가입일</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  불러오는 중...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr
                  key={user.id}
                  className={cn(
                    "border-b border-slate-100 last:border-b-0",
                    index % 2 === 1 && "bg-slate-50/40",
                  )}
                >
                  <td className="px-5 py-3.5 text-slate-700">
                    {user.email || "-"}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {user.name || "-"}
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={(e) =>
                        handleRoleChange(user, e.target.value as UserRole)
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20 disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {user.createdAt || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
