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
  UserCircle2,
  CheckSquare,
  Shield,
  Search,
  Sparkles,
  ScanText,
  Palette,
  Rocket,
  CreditCard,
  UserPlus,
  Lock,
  Wrench,
  ShieldCheck,
  MessageSquare,
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

/**
 * Menu do ADMIN (escritório).
 *
 * Removido intencionalmente (agora exclusivo do SUPER_ADMIN / plataforma):
 *   • Domínio próprio      → /super-admin/dominios
 *   • Observabilidade      → /super-admin/status, /super-admin/jobs, /super-admin/logs
 *   • Integrações globais  → /super-admin/features, /super-admin/configuracoes
 *   • Automações técnicas  → /super-admin/features
 *
 * Mantido no ADMIN por ser operacional do escritório:
 *   • Assinatura           → apenas leitura do plano atual + limites
 *   • LGPD & privacidade   → titulares, consentimentos, exportação (operacional)
 *   • Auditoria            → logs do próprio tenant
 */
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
      { href: '/planejamento',       icon: ClipboardList, label: 'Planejamento' },
      { href: '/producao',           icon: Cog,           label: 'Produção' },
      { href: '/tecnicos',           icon: Wrench,        label: 'Técnicos' },
      { href: '/qualidade',          icon: ShieldCheck,   label: 'Qualidade' },
      { href: '/financeiro',         icon: DollarSign,    label: 'Financeiro' },
      { href: '/entregas/romaneios', icon: Truck,         label: 'Entregas' }
    ]
  },
  {
    label: 'Estúdio',
    items: [
      { href: '/agenda',     icon: Calendar,       label: 'Agenda' },
      { href: '/arquivos',   icon: FolderOpen,     label: 'Arquivos' },
      { href: '/relatorios', icon: BarChart3,      label: 'Relatórios' }
    ]
  },
  {
    label: 'Atendimento',
    items: [
      { href: '/assistente', icon: MessageSquare, label: 'Mensagens' },
      { href: '/busca',      icon: Search,        label: 'Busca' },
      { href: '/ocr',        icon: ScanText,      label: 'OCR' }
    ]
  },
  {
    label: 'Escritório',
    items: [
      { href: '/onboarding', icon: Rocket,     label: 'Onboarding' },
      { href: '/branding',   icon: Palette,    label: 'Identidade' },
      { href: '/equipe',     icon: UserPlus,   label: 'Equipe' },
      { href: '/billing',    icon: CreditCard, label: 'Assinatura' },
      { href: '/lgpd',       icon: Lock,       label: 'LGPD & privacidade' },
      { href: '/audit',      icon: Shield,     label: 'Auditoria' },
      { href: '/checklists', icon: CheckSquare, label: 'Checklists' },
      { href: '/suporte',    icon: Sparkles,   label: 'Suporte' }
    ]
  }
];
