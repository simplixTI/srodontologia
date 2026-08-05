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
  Bell
} from 'lucide-react';

const ITEMS = [
  { href: '/super-admin',                   icon: LayoutGrid,  label: 'Visão geral' },
  { href: '/super-admin/tenants',           icon: Building2,   label: 'Tenants' },
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
