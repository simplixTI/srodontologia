import { Skeleton, SkeletonGrid } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-32" />
          <div className="h-px flex-1 bg-gold/10" />
        </div>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </header>
      <Skeleton className="h-11 w-full" />
      <SkeletonGrid count={6} />
    </div>
  );
}
