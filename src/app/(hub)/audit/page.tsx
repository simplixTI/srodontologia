import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  UserCircle2,
  Briefcase,
  FileSpreadsheet,
  Truck,
  MessageSquare,
  Building2,
  Users,
  type LucideIcon
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAuditLogs, type AuditLog } from '@/features/audit/queries';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = { title: 'Auditoria · SR HUB' };
export const dynamic = 'force-dynamic';

const ENTITY_ICON: Record<string, LucideIcon> = {
  profiles: UserCircle2,
  cases: Briefcase,
  case_files: FileSpreadsheet,
  case_messages: MessageSquare,
  quotes: FileSpreadsheet,
  planning_versions: FileSpreadsheet,
  deliveries: Truck,
  clinics: Building2,
  dentists: UserCircle2,
  leads: Users
};

const ENTITY_LABEL: Record<string, string> = {
  profiles: 'Perfil',
  cases: 'Caso',
  case_files: 'Arquivo',
  case_messages: 'Mensagem',
  quotes: 'Orçamento',
  planning_versions: 'Planejamento',
  deliveries: 'Entrega',
  clinics: 'Clínica',
  dentists: 'Dentista',
  leads: 'Lead'
};

function actionInfo(action: string): {
  icon: LucideIcon;
  label: string;
  tone: string;
} {
  if (action.endsWith('.created')) {
    return { icon: Plus, label: 'Criado', tone: 'text-emerald-200 bg-emerald-400/10 border-emerald-400/25' };
  }
  if (action.endsWith('.status_changed')) {
    return { icon: ArrowRight, label: 'Status', tone: 'text-sky-200 bg-sky-400/10 border-sky-400/25' };
  }
  if (action.endsWith('.updated')) {
    return { icon: Pencil, label: 'Editado', tone: 'text-amber-200 bg-amber-400/10 border-amber-400/25' };
  }
  if (action.endsWith('.deleted')) {
    return { icon: Trash2, label: 'Removido', tone: 'text-rose-200 bg-rose-400/10 border-rose-400/25' };
  }
  return { icon: Shield, label: action, tone: 'text-white/60 bg-white/[0.02] border-white/10' };
}

export default async function AuditPage() {
  // Server-side role guard (RLS also blocks non-admins)
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>();
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const logs = await listAuditLogs({ limit: 200 });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Auditoria' }
        ]}
      />

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Sistema · Auditoria
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          Auditoria
        </h1>
        <p className="max-w-2xl text-white/60">
          Registro imutável de operações críticas — quem, quando, sobre o quê.
          Últimos <strong className="text-white">{logs.length}</strong>{' '}
          eventos.
        </p>
      </header>

      {logs.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-gold/10 bg-white/[0.02] p-14 text-center">
          <Shield className="h-6 w-6 text-gold-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl text-white">
            Nenhum evento registrado
          </h2>
          <p className="mt-3 text-sm text-white/60">
            Assim que houver operações internas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const entity = log.entity_type ?? 'unknown';
  const Icon = ENTITY_ICON[entity] ?? Shield;
  const entityLabel = ENTITY_LABEL[entity] ?? entity;
  const info = actionInfo(log.action);
  const ActionIcon = info.icon;

  // Extract a friendly title from new_data / previous_data
  const data = (log.new_data ?? log.previous_data ?? {}) as Record<string, unknown>;
  const summary =
    (data.title as string) ??
    (data.case_number as string) ??
    (data.full_name as string) ??
    (data.trade_name as string) ??
    (data.quote_number as string) ??
    (log.entity_id?.slice(0, 8) ?? '—');

  // For status changes, show old→new
  let statusChange: string | null = null;
  if (log.action === 'cases.status_changed') {
    const prev = (log.previous_data as Record<string, unknown> | null)?.internal_status;
    const next = (log.new_data as Record<string, unknown> | null)?.internal_status;
    if (prev && next) statusChange = `${prev} → ${next}`;
  }

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-gold/20 bg-black/40">
        <Icon className="h-4 w-4 text-gold-100" strokeWidth={1.5} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
          <span>{entityLabel}</span>
          <span>·</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${info.tone}`}>
            <ActionIcon className="h-2.5 w-2.5" strokeWidth={1.5} />
            {info.label}
          </span>
        </div>
        <div className="mt-1 truncate text-sm text-white">
          {summary}
          {statusChange && <span className="ml-2 text-white/60">· {statusChange}</span>}
        </div>
        <div className="mt-1 text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
          {log.user?.full_name ?? 'Sistema'}
          {log.user?.email && <span className="ml-1 text-white/25">· {log.user.email}</span>}
        </div>
      </div>

      <div className="text-right">
        <div className="text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
          {new Date(log.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          })}
        </div>
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/35">
          {new Date(log.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </li>
  );
}
