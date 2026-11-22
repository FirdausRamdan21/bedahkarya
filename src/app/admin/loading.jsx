export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-28 animate-pulse rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]" />
    </div>
  );
}
