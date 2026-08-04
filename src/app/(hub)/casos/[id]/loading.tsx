import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Skeleton className="h-3 w-56" />

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-24" />
          <div className="h-px flex-1 bg-gold/10" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-2/3" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </header>

      {/* Health Score placeholder */}
      <Skeleton className="h-32 w-full rounded-3xl" />

      {/* Tabs placeholder */}
      <div className="flex gap-1 border-b border-gold/10 pb-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded" />
        ))}
      </div>

      {/* Content placeholder */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
