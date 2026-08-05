'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { LogoLockup } from '@/components/ui/Logo';
import { logoutAction } from '@/features/auth/actions/logout';

type Props = {
  fullName: string;
  email: string;
};

export function PortalHeader({ fullName, email }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-gold/10 bg-black/70 px-4 backdrop-blur md:h-20 md:px-6">
      <Link href="/portal" className="inline-flex">
        <LogoLockup width={92} />
      </Link>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-gold/15 py-1 pl-1 pr-3 transition hover:border-gold/40"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-gradient text-[0.7rem] font-medium text-black">
            {initials || 'D'}
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-[0.72rem] text-white">{fullName}</span>
            <span className="block text-[0.55rem] uppercase tracking-[0.22em] text-white/40">
              Dentista
            </span>
          </span>
          <ChevronDown className="h-3 w-3 text-white/50" strokeWidth={1.5} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gold/15 bg-black/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
            <div className="border-b border-gold/10 p-4">
              <div className="text-sm text-white">{fullName}</div>
              <div className="mt-0.5 truncate text-xs text-white/50">{email}</div>
            </div>
            <div className="p-2">
              <Link
                href="/portal/perfil"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.04] hover:text-white"
              >
                <UserRound className="h-4 w-4 text-white/50" strokeWidth={1.5} />
                Meu perfil
              </Link>
              <Link
                href="/change-password"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.04] hover:text-white"
              >
                <UserRound className="h-4 w-4 text-white/50" strokeWidth={1.5} />
                Alterar senha
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <LogOut className="h-4 w-4 text-white/50" strokeWidth={1.5} />
                  Sair
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
