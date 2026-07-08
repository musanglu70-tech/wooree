import { MyPageContent } from "@/components/mypage/mypage-content";

export default function MyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            마이페이지
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            회사 정보와 첨부서류, 대표 서명을 관리합니다.
          </p>
        </header>
        <MyPageContent />
      </div>
    </div>
  );
}
