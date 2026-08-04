import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <Skeleton className="h-3 w-56" />
      <header className="flex flex-col gap-2">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
