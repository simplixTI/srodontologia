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
  CheckSquare,
  Shield,
  type LucideIcon
} from 'lucide-react';

export type NavItemDef = {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
};

export type NavGroupDef = {
  label: string;
  items: NavItemDef[];
};

export const NAV_GROUPS: NavGroupDef[] = [
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
