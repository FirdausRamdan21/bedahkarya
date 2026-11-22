export default function PublicLoading() {
  return (
    <div className="mx-auto w-full max-w-[540px] space-y-5">
      <div className="h-24 animate-pulse rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]" />
      {[1, 2].map((n) => (
        <div
          key={n}
          className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white dark:border-slate-700 dark:bg-[#1E293B]"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
          <div className="aspect-[4/5] w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
