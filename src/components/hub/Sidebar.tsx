'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PanelLeft } from 'lucide-react';
import { NavItem } from './NavItem';
import { LogoLockup } from '@/components/ui/Logo';
import { NAV_GROUPS } from './nav-groups';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-[100svh] shrink-0 flex-col border-r border-gold/10 bg-black/70 backdrop-blur transition-[width] duration-500 lg:flex',
        collapsed ? 'w-[76px]' : 'w-[260px]'
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-gold/10 px-4">
        <Link href="/dashboard" className="inline-flex items-center overflow-hidden">
          {collapsed ? (
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-gold/25 bg-black text-[0.65rem] tracking-[0.25em] text-gold-100">
              SR
            </div>
          ) : (
            <LogoLockup width={110} />
          )}
        </Link>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/15 text-white/70 transition hover:border-gold/40 hover:text-gold-100"
        >
          <PanelLeft
            className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')}
            strokeWidth={1.5}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-2 text-[0.55rem] uppercase tracking-[0.35em] text-white/30">
                {g.label}
              </div>
            )}
            {g.items.map((it) => (
              <NavItem key={it.href} {...it} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-gold/10 p-4">
        <div
          className={cn(
            'text-[0.5rem] uppercase tracking-[0.35em] text-white/30',
            collapsed && 'text-center'
          )}
        >
          {collapsed ? 'v0.1' : 'SR HUB · v0.1'}
        </div>
      </div>
    </aside>
  );
}
