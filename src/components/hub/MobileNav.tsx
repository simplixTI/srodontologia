'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { LogoLockup } from '@/components/ui/Logo';
import { NAV_GROUPS } from './nav-groups';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll when drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/15 text-white/70 transition hover:border-gold/40 hover:text-gold-100 lg:hidden"
      >
        <Menu className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-[71] flex h-[100svh] w-[80vw] max-w-[300px] flex-col border-r border-gold/20 bg-black shadow-[0_0_60px_-10px_rgba(0,0,0,0.9)] transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-20 items-center justify-between border-b border-gold/10 px-4">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="inline-flex items-center"
          >
            <LogoLockup width={110} />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/15 text-white/70 transition hover:border-gold/40 hover:text-gold-100"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="space-y-1">
              <div className="px-3 pb-2 text-[0.55rem] uppercase tracking-[0.35em] text-white/30">
                {g.label}
              </div>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active =
                  pathname === it.href || pathname?.startsWith(it.href + '/');
                if (it.disabled) {
                  return (
                    <div
                      key={it.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-50"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-white/40"
                        strokeWidth={1.5}
                      />
                      <span className="text-[0.78rem] tracking-wide text-white/50">
                        {it.label}
                      </span>
                      <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.28em] text-white/40">
                        em breve
                      </span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                      active
                        ? 'bg-gradient-to-r from-gold/15 to-transparent ring-1 ring-inset ring-gold/20'
                        : 'hover:bg-white/[0.03]'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-gold-gradient" />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        active ? 'text-gold-100' : 'text-white/50 group-hover:text-white'
                      )}
                      strokeWidth={1.5}
                    />
                    <span
                      className={cn(
                        'text-[0.78rem] tracking-wide',
                        active ? 'text-white' : 'text-white/70 group-hover:text-white'
                      )}
                    >
                      {it.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-gold/10 p-4">
          <div className="text-[0.5rem] uppercase tracking-[0.35em] text-white/30">
            SR HUB · v0.1
          </div>
        </div>
      </aside>
    </>
  );
}
