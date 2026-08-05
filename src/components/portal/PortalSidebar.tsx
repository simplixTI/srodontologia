'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PORTAL_NAV } from './portal-nav';

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-gold/10 lg:bg-black/50">
      <nav className="flex flex-col gap-1 px-3 py-6">
        {PORTAL_NAV.map((item) => {
          const active = item.href === '/portal'
            ? pathname === '/portal'
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2.5 text-sm text-gold-100'
                  : 'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-white/60 transition hover:border-gold/10 hover:bg-white/[0.02] hover:text-white'
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
