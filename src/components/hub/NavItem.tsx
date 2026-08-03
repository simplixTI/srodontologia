'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
  disabled?: boolean;
};

export function NavItem({ href, icon: Icon, label, collapsed, disabled }: Props) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + '/');

  const inner = (
    <>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-gold-100' : 'text-white/50 group-hover:text-white'
        )}
        strokeWidth={1.5}
      />
      {!collapsed && (
        <span
          className={cn(
            'truncate text-[0.78rem] tracking-wide transition-colors',
            active ? 'text-white' : 'text-white/70 group-hover:text-white'
          )}
        >
          {label}
        </span>
      )}
      {!collapsed && disabled && (
        <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.28em] text-white/40">
          em breve
        </span>
      )}
    </>
  );

  const className = cn(
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
    collapsed && 'justify-center px-2',
    active
      ? 'bg-gradient-to-r from-gold/15 to-transparent ring-1 ring-inset ring-gold/20'
      : 'hover:bg-white/[0.03]',
    disabled && 'pointer-events-none opacity-50'
  );

  if (disabled) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <Link href={href} className={className}>
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-gold-gradient" />
      )}
      {inner}
    </Link>
  );
}
