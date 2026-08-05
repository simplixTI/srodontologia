import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Tenant health check. Produz um score determinístico com critérios
 * explícitos — nada de "healthiness pontuação misteriosa". Cada dimensão
 * marca ok/warning/error e contribui pontos fixos.
 */

export type HealthDimension = {
  key: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
  points: number;   // pontos ganhos (0 se status != ok)
  maxPoints: number;
};

export type TenantHealth = {
  organizationId: string;
  organizationName: string;
  scorePercent: number;      // 0..100
  dimensions: HealthDimension[];
  summary: 'green' | 'yellow' | 'red';
};

const DIMS = [
  { key: 'active_owner',     maxPoints: 10 },
  { key: 'active_plan',      maxPoints: 15 },
  { key: 'clinics_configured', maxPoints: 10 },
  { key: 'dentists_created', maxPoints: 10 },
  { key: 'first_case',       maxPoints: 20 },
  { key: 'branding_set',     maxPoints: 5  },
  { key: 'email_working',    maxPoints: 10 },
  { key: 'no_open_alerts',   maxPoints: 10 },
  { key: 'no_dead_letter',   maxPoints: 10 }
] as const;

export async function computeTenantHealth(organizationId: string): Promise<TenantHealth | null> {
  const admin = createSupabaseAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, owner_id, plan_id, subscription_status, branding')
    .eq('id', organizationId)
    .maybeSingle<{ id: string; name: string; owner_id: string | null; plan_id: string | null; subscription_status: string; branding: Record<string, unknown> }>();
  if (!org) return null;

  const dims: HealthDimension[] = [];

  // active_owner
  dims.push({
    key: 'active_owner',
    label: 'Owner ativo',
    status: org.owner_id ? 'ok' : 'error',
    detail: org.owner_id ? 'Definido' : 'Sem owner configurado',
    points: org.owner_id ? 10 : 0,
    maxPoints: 10
  });

  // active_plan
  const activeSub = org.subscription_status === 'active' || org.subscription_status === 'trial';
  dims.push({
    key: 'active_plan',
    label: 'Plano ativo/trial',
    status: activeSub ? 'ok' : 'error',
    detail: `Status: ${org.subscription_status}`,
    points: activeSub ? 15 : 0,
    maxPoints: 15
  });

  // Counts
  const [clinicsC, dentistsC, casesC, alertsC, dlqC] = await Promise.all([
    countRows(admin, 'clinics', organizationId),
    countRows(admin, 'dentists', organizationId),
    countRows(admin, 'cases', organizationId),
    countUnresolvedAlerts(admin, organizationId),
    countDeadLetterJobs(admin, organizationId)
  ]);

  dims.push({
    key: 'clinics_configured',
    label: 'Clínicas cadastradas',
    status: clinicsC > 0 ? 'ok' : 'warning',
    detail: `${clinicsC} clínica(s)`,
    points: clinicsC > 0 ? 10 : 0,
    maxPoints: 10
  });

  dims.push({
    key: 'dentists_created',
    label: 'Dentistas cadastrados',
    status: dentistsC > 0 ? 'ok' : 'warning',
    detail: `${dentistsC} dentista(s)`,
    points: dentistsC > 0 ? 10 : 0,
    maxPoints: 10
  });

  dims.push({
    key: 'first_case',
    label: 'Primeiro caso',
    status: casesC > 0 ? 'ok' : 'warning',
    detail: `${casesC} caso(s) criado(s)`,
    points: casesC > 0 ? 20 : 0,
    maxPoints: 20
  });

  const hasBranding = !!(org.branding && Object.keys(org.branding).length > 0);
  dims.push({
    key: 'branding_set',
    label: 'Branding configurado',
    status: hasBranding ? 'ok' : 'warning',
    detail: hasBranding ? 'Personalizado' : 'Usando defaults',
    points: hasBranding ? 5 : 0,
    maxPoints: 5
  });

  // email_working: recent email_events with delivered
  const { data: emailOk } = await admin.from('email_events').select('id').eq('organization_id', organizationId).eq('event_type', 'delivered').limit(1);
  const emailWorks = (emailOk?.length ?? 0) > 0 || !process.env.EMAIL_API_KEY; // sem provider → não conta contra
  dims.push({
    key: 'email_working',
    label: 'E-mail entregando',
    status: emailWorks ? 'ok' : 'warning',
    detail: emailWorks ? 'Pelo menos 1 delivery registrado' : 'Nenhum delivery ainda',
    points: emailWorks ? 10 : 0,
    maxPoints: 10
  });

  dims.push({
    key: 'no_open_alerts',
    label: 'Sem alertas críticos abertos',
    status: alertsC === 0 ? 'ok' : 'error',
    detail: `${alertsC} alerta(s) críticos não resolvidos`,
    points: alertsC === 0 ? 10 : 0,
    maxPoints: 10
  });

  dims.push({
    key: 'no_dead_letter',
    label: 'Sem jobs em dead letter',
    status: dlqC === 0 ? 'ok' : 'error',
    detail: `${dlqC} job(s) em dead letter`,
    points: dlqC === 0 ? 10 : 0,
    maxPoints: 10
  });

  const total = dims.reduce((a, d) => a + d.points, 0);
  const max = DIMS.reduce((a, d) => a + d.maxPoints, 0);
  const scorePercent = Math.round((total / max) * 100);
  const summary = scorePercent >= 80 ? 'green' : scorePercent >= 50 ? 'yellow' : 'red';

  return { organizationId, organizationName: org.name, scorePercent, dimensions: dims, summary };
}

async function countRows(admin: ReturnType<typeof createSupabaseAdminClient>, table: string, orgId: string): Promise<number> {
  const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
  return count ?? 0;
}
async function countUnresolvedAlerts(admin: ReturnType<typeof createSupabaseAdminClient>, orgId: string): Promise<number> {
  const { count } = await admin
    .from('operational_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('resolved_at', null)
    .in('severity', ['error', 'critical']);
  return count ?? 0;
}
async function countDeadLetterJobs(admin: ReturnType<typeof createSupabaseAdminClient>, orgId: string): Promise<number> {
  const { count } = await admin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'dead_letter');
  return count ?? 0;
}
