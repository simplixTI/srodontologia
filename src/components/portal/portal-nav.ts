import {
  Home,
  FolderOpen,
  FileText,
  Bell,
  User,
  Sparkles,
  type LucideIcon
} from 'lucide-react';

export type PortalNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export const PORTAL_NAV: PortalNavItem[] = [
  { href: '/portal',             icon: Home,       label: 'Início' },
  { href: '/portal/casos',       icon: FolderOpen, label: 'Casos' },
  { href: '/portal/documentos',  icon: FileText,   label: 'Documentos' },
  { href: '/portal/assistente',  icon: Sparkles,   label: 'Assistente' },
  { href: '/portal/notificacoes', icon: Bell,      label: 'Alertas' },
  { href: '/portal/perfil',      icon: User,       label: 'Perfil' }
];
