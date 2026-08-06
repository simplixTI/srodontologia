'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  Users,
  Package,
  CreditCard,
  Ticket,
  ShieldAlert,
  Activity,
  Layers,
  Cog,
  ScrollText,
  Sparkles,
  Bell,
  Globe,
  type LucideIcon
} from 'lucide-react';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  disabledHint?: string;
};

const ITEMS: NavItem[] = [
  { href: '/super-admin',                   icon: LayoutGrid,  label: 'Visão geral' },
  { href: '/super-admin/tenants',           icon: Building2,   label: 'Tenants' },
  {
    href: '/super-admin/dominios',
    icon: Globe,
    label: 'Domínios',
    disabled: true,
    disabledHint: 'Standby · portal usa /portal no domínio principal'
  },
  { href: '/super-admin/usuarios',          icon: Users,       label: 'Usuários' },
  { href: '/super-admin/planos',            icon: Package,     label: 'Planos' },
  { href: '/super-admin/assinaturas',       icon: Sparkles,    label: 'Assinaturas' },
  { href: '/super-admin/faturamento',       icon: CreditCard,  label: 'Faturamento' },
  { href: '/super-admin/features',          icon: Layers,      label: 'Feature Flags' },
  { href: '/super-admin/suporte',           icon: Ticket,      label: 'Suporte' },
  { href: '/super-admin/logs',              icon: ScrollText,  label: 'Logs de segurança' },
  { href: '/super-admin/alertas',           icon: Bell,        label: 'Alertas' },
  { href: '/super-admin/status',            icon: Activity,    label: 'Status' },
  { href: '/super-admin/jobs',              icon: ShieldAlert, label: 'Jobs' },
  { href: '/super-admin/configuracoes',     icon: Cog,         label: 'Configurações' }
];

export function SuperAdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      {ITEMS.map((it) => {
        const active = pathname === it.href || (it.href !== '/super-admin' && pathname.startsWith(it.href + '/'));
        const Icon = it.icon;

        if (it.disabled) {
          return (
            <div
              key={it.href}
              title={it.disabledHint ?? 'Recurso em standby'}
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/25"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="flex-1">{it.label}</span>
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.2em] text-white/40">
                standby
              </span>
            </div>
          );
        }

        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              active
                ? 'flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-100'
                : 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.03] hover:text-white'
            }
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
