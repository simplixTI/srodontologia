'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PORTAL_NAV } from './portal-nav';

type Props = {
  unreadCount?: number;
};

export function PortalBottomNav({ unreadCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/10 bg-black/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <ul className="grid grid-cols-5 gap-0.5 px-1 pt-1.5">
        {PORTAL_NAV.map((item) => {
          const active = item.href === '/portal'
            ? pathname === '/portal'
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isAlerts = item.href === '/portal/notificacoes';
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  active
                    ? 'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.55rem] uppercase tracking-widest text-gold-100'
                    : 'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.55rem] uppercase tracking-widest text-white/50 transition hover:text-white/80'
                }
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {isAlerts && unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-gold-500 px-1 text-[0.55rem] font-medium text-black">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
