import { UsersContent } from "@/components/users/users-content";

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-[#f5ece0] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2c1f0e]">
            사용자 관리
          </h1>
          <p className="mt-1 text-sm text-[#9a7c4e]">
            시스템 사용자 목록 및 역할을 관리합니다.
          </p>
        </header>

        <UsersContent />
      </div>
    </div>
  );
}
