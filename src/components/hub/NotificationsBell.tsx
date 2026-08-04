'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
import type { Notification } from '@/features/notifications/queries';
import { markNotificationReadAction, markAllReadAction } from '@/features/notifications/actions';

export function NotificationsBell({
  initialNotifications,
  initialUnread
}: {
  initialNotifications: Notification[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const markOne = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    startTransition(async () => {
      try { await markNotificationReadAction(id); } catch {}
    });
  };

  const markAll = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    startTransition(async () => {
      try { await markAllReadAction(); } catch {}
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/15 text-white/70 transition hover:border-gold/40 hover:text-gold-100"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold-gradient px-1 text-[0.55rem] font-bold text-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-gold/15 bg-black/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-gold/10 p-4">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.32em] text-gold-100">
                Notificações
              </div>
              <div className="mt-0.5 text-xs text-white/50">
                {unread === 0 ? 'Tudo em dia.' : `${unread} não lida${unread === 1 ? '' : 's'}`}
              </div>
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:text-gold-50"
              >
                <CheckCheck className="h-3 w-3" strokeWidth={1.5} />
                Marcar tudo
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-white/40">Nenhuma notificação.</p>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const inner = (
                    <>
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/20 bg-black/40 text-[0.55rem] uppercase tracking-[0.2em] text-gold-100">
                        {n.type.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={n.read_at ? 'text-sm text-white/60' : 'text-sm font-medium text-white'}>
                            {n.title}
                          </span>
                          {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />}
                        </div>
                        {n.message && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{n.message}</p>
                        )}
                        <div className="mt-1 text-[0.55rem] uppercase tracking-[0.25em] text-white/35">
                          {new Date(n.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </>
                  );

                  if (n.action_url) {
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.action_url}
                          onClick={() => { markOne(n.id); setOpen(false); }}
                          className="flex items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.03]"
                        >
                          {inner}
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={n.id}
                      onClick={() => markOne(n.id)}
                      className="flex cursor-pointer items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.03]"
                    >
                      {inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
