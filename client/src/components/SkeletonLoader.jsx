export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800/80 p-3.5 flex flex-col justify-between shadow-soft shimmer-mask">
      <div className="w-full aspect-[4/3] bg-neutral-200 dark:bg-slate-800 rounded-2xl mb-3.5"></div>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-3 w-8 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
        </div>
        <div className="h-4 w-3/4 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
        <div className="h-3 w-1/3 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
        <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-5 w-16 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-9 w-16 bg-neutral-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
}

export function CategoryChipSkeleton() {
  return (
    <div className="flex-shrink-0 flex items-center space-x-2 bg-neutral-200/80 dark:bg-slate-800/80 rounded-full px-4 py-2 w-32 h-10 shimmer-mask"></div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 shimmer-mask">
      <div className="h-4 w-40 bg-neutral-200 dark:bg-slate-800 rounded-full mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-neutral-200 dark:bg-slate-800 rounded-3xl"></div>
        <div className="space-y-4">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-8 w-3/4 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-4 w-32 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-7 w-28 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-24 w-full bg-neutral-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-14 w-full bg-neutral-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-5 shadow-soft space-y-4 shimmer-mask">
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
        <div className="h-6 w-24 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-16 w-full bg-neutral-100 dark:bg-slate-800/60 rounded-2xl"></div>
      <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-slate-800">
        <div className="h-5 w-20 bg-neutral-200 dark:bg-slate-800 rounded-full"></div>
        <div className="h-9 w-28 bg-neutral-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    </div>
  );
}
