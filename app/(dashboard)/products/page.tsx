import { ProductsContent } from "@/components/products/products-content";

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            의약품 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            보험코드·제품명·단가 등 의약품 정보를 관리합니다.
          </p>
        </header>

        <ProductsContent />
      </div>
    </div>
  );
}
