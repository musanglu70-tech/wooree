import { UsersContent } from "@/components/users/users-content";

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            사용자 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            시스템 사용자 목록 및 역할을 관리합니다.
          </p>
        </header>

        <UsersContent />
      </div>
    </div>
  );
}
