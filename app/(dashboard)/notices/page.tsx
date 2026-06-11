import { NoticesContent } from "@/components/notices/notices-content";

export default function NoticesPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            공지 알림
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            시스템 공지 및 알림을 확인합니다.
          </p>
        </header>

        <NoticesContent />
      </div>
    </div>
  );
}
