export function StatsCardsSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm"
        >
          <div className="mb-4 size-10 rounded-lg bg-slate-200" />
          <div className="h-8 w-20 rounded-md bg-slate-200" />
          <div className="mt-2 h-4 w-24 rounded-md bg-[#e2e8f0]" />
        </div>
      ))}
    </section>
  );
}
