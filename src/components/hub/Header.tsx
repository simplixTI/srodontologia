'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, LogOut, User } from 'lucide-react';
import { logoutAction } from '@/features/auth/actions/logout';
import { ROLE_LABELS } from '@/lib/permissions/roles';
import type { UserRole } from '@/types/database';

type Props = {
  user: {
    full_name: string;
    email: string;
    role: UserRole;
    avatar_url: string | null;
  };
};

export function Header({ user }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const initials = user.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gold/10 bg-black/70 px-6 backdrop-blur">
      {/* Search (placeholder) */}
      <div className="flex flex-1 items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-gold/10 bg-white/[0.02] px-4 py-2 text-sm text-white/40 md:flex md:min-w-[340px]">
          <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Buscar casos, dentistas, orçamentos...</span>
          <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[0.55rem] tracking-widest text-white/40">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/15 text-white/70 transition hover:border-gold/40 hover:text-gold-100"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold-300" />
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 rounded-full border border-gold/15 py-1 pl-1 pr-3 transition hover:border-gold/40"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-gradient text-[0.7rem] font-medium text-black">
              {initials || 'SR'}
            </span>
            <div className="hidden text-left md:block">
              <div className="text-[0.75rem] text-white">{user.full_name}</div>
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-white/50" strokeWidth={1.5} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gold/15 bg-black/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
              <div className="border-b border-gold/10 p-4">
                <div className="text-sm text-white">{user.full_name}</div>
                <div className="mt-0.5 truncate text-xs text-white/50">
                  {user.email}
                </div>
              </div>
              <div className="p-2">
                <MenuLink icon={User} label="Minha conta" href="/change-password" />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <LogOut className="h-4 w-4 text-white/50" strokeWidth={1.5} />
                    Sair da sessão
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  icon: Icon,
  label,
  href
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.04] hover:text-white"
    >
      <Icon className="h-4 w-4 text-white/50" strokeWidth={1.5} />
      {label}
    </a>
  );
}
