import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%]',
        className
      )}
      style={{
        animationDuration: '1.4s',
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.03) 100%)'
      }}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="mt-8 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
