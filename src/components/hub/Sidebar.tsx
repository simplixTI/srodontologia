'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  Cog,
  DollarSign,
  Truck,
  Calendar,
  FolderOpen,
  BarChart3,
  Settings,
  UserCircle2,
  PanelLeft,
  CheckSquare,
  Shield
} from 'lucide-react';
import { NavItem } from './NavItem';
import { LogoLockup } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const groups = [
  {
    label: 'Operação',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/leads',     icon: Users,           label: 'CRM' },
      { href: '/dentistas', icon: UserCircle2,     label: 'Dentistas' },
      { href: '/clinicas',  icon: Building2,       label: 'Clínicas' },
      { href: '/casos',     icon: Briefcase,       label: 'Casos' }
    ]
  },
  {
    label: 'Fluxo',
    items: [
      { href: '/planejamento', icon: ClipboardList, label: 'Planejamento', disabled: true },
      { href: '/producao',     icon: Cog,           label: 'Produção',     disabled: true },
      { href: '/financeiro',   icon: DollarSign,    label: 'Financeiro',   disabled: true },
      { href: '/entregas',     icon: Truck,         label: 'Entregas',     disabled: true }
    ]
  },
  {
    label: 'Estúdio',
    items: [
      { href: '/agenda',     icon: Calendar,   label: 'Agenda',     disabled: true },
      { href: '/arquivos',   icon: FolderOpen, label: 'Arquivos',   disabled: true },
      { href: '/relatorios', icon: BarChart3,  label: 'Relatórios', disabled: true }
    ]
  },
  {
    label: 'Sistema',
    items: [
      { href: '/checklists',    icon: CheckSquare, label: 'Checklists' },
      { href: '/audit',         icon: Shield,      label: 'Auditoria' },
      { href: '/usuarios',      icon: Users,       label: 'Usuários',      disabled: true },
      { href: '/configuracoes', icon: Settings,    label: 'Configurações', disabled: true }
    ]
  }
];

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
        {groups.map((g) => (
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
          {collapsed ? 'v0.1' : 'SR HUB · v0.1 · Phase 1'}
        </div>
      </div>
    </aside>
  );
}
