import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.28em]', className)}>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-white/25" strokeWidth={1.5} />}
            {c.href && !isLast ? (
              <Link href={c.href} className="text-white/50 transition hover:text-gold-100">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-white/80' : 'text-white/50'}>{c.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
