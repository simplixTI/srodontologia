import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <Skeleton className="h-3 w-40" />
      <header className="flex flex-col gap-3">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-12 w-96" />
      </header>
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    </div>
  );
}
