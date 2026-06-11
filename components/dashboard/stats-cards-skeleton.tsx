export function StatsCardsSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-4 size-10 rounded-lg bg-slate-200" />
          <div className="h-8 w-20 rounded-md bg-slate-200" />
          <div className="mt-2 h-4 w-24 rounded-md bg-slate-100" />
        </div>
      ))}
    </section>
  );
}
