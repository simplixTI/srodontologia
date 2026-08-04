import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-32" />
          <div className="h-px flex-1 bg-gold/10" />
        </div>
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
            <Skeleton className="mb-3 h-5 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
