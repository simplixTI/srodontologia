import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getClock } from '@/lib/time/clock';
import { logger } from '@/lib/observability/logger';

/**
 * Provisiona um novo tenant (laboratório) do zero via Super Admin ou
 * CLI protegida. Cada passo é registrado em tenant_provisioning_runs
 * para audit + retry parcial.
 *
 * Semântica: idempotente por slug. Se algum passo falha, marca run como
 * 'failed' com detalhe do passo e permite retry.
 */

export type ProvisionInput = {
  organizationName: string;
  slug: string;                 // subdomain — a-z0-9-
  ownerEmail: string;
  ownerName: string;
  planCode: 'starter' | 'professional' | 'business' | 'enterprise';
  releaseChannel?: 'internal' | 'pilot' | 'beta' | 'production';
  trialDays?: number;           // default 14
  operatorId?: string | null;
};

export type ProvisionStep = {
  name: string;
  status: 'pending' | 'ok' | 'skipped' | 'failed';
  at: string;
  error?: string;
};

export type ProvisionOutcome = {
  runId: string;
  status: 'succeeded' | 'failed';
  organizationId?: string;
  ownerUserId?: string;
  steps: ProvisionStep[];
  error?: string;
};

export async function provisionTenant(input: ProvisionInput): Promise<ProvisionOutcome> {
  const admin = createSupabaseAdminClient();
  const steps: ProvisionStep[] = [];
  const clock = getClock();

  // Validate + normalise
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,50}$/.test(slug)) {
    return failEarly(admin, input, 'slug inválido (a-z0-9-, 3-51 chars)');
  }
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!/.+@.+\..+/.test(ownerEmail)) return failEarly(admin, input, 'e-mail do owner inválido');

  // Register run
  const { data: run, error: runErr } = await admin
    .from('tenant_provisioning_runs')
    .insert({
      operator_id: input.operatorId ?? null,
      status: 'started',
      input: { organizationName: input.organizationName, slug, ownerEmail, planCode: input.planCode }
    })
    .select('id')
    .single<{ id: string }>();
  if (runErr || !run) throw new Error(`provisioning_run insert failed: ${runErr?.message}`);

  const record = (name: string, status: ProvisionStep['status'], error?: string) => {
    steps.push({ name, status, at: clock.now().toISOString(), error });
  };

  try {
    // Slug uniqueness
    const { data: taken } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>();
    if (taken) throw stepError('check_slug', 'slug já em uso');
    record('check_slug', 'ok');

    // Plan lookup
    const { data: plan } = await admin.from('plans').select('id, code').eq('code', input.planCode).maybeSingle<{ id: string; code: string }>();
    if (!plan) throw stepError('lookup_plan', `plano ${input.planCode} não encontrado`);
    record('lookup_plan', 'ok');

    // Organization insert
    const trialDays = Math.max(1, Math.min(60, input.trialDays ?? 14));
    const trialEndsAt = new Date(clock.nowMs() + trialDays * 86_400_000).toISOString();

    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: input.organizationName,
        slug,
        plan_id: plan.id,
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        last_activity_at: clock.now().toISOString()
      })
      .select('id')
      .single<{ id: string }>();
    if (orgErr || !org) throw stepError('create_org', orgErr?.message ?? 'insert failed');
    record('create_org', 'ok');

    // Owner user (idempotent — reuse if exists)
    let ownerUserId: string | undefined;
    const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === ownerEmail);
    if (existing) {
      ownerUserId = existing.id;
      record('create_owner_auth', 'skipped', 'user already exists');
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ownerEmail,
        email_confirm: true,
        user_metadata: { full_name: input.ownerName, provisioned_via: 'tenant-provisioning' }
      });
      if (createErr || !created?.user) throw stepError('create_owner_auth', createErr?.message ?? 'createUser failed');
      ownerUserId = created.user.id;
      record('create_owner_auth', 'ok');
    }

    // Profile row (upsert)
    await admin.from('profiles').upsert({
      id: ownerUserId,
      organization_id: org.id,
      role: 'super_admin',
      status: 'active',
      email: ownerEmail,
      full_name: input.ownerName,
      must_change_password: true
    }, { onConflict: 'id' });
    record('upsert_owner_profile', 'ok');

    // Organization owner_id + subscription
    await admin.from('organizations').update({ owner_id: ownerUserId }).eq('id', org.id);
    await admin.from('subscriptions').insert({
      organization_id: org.id,
      plan_id: plan.id,
      status: 'trial',
      billing_cycle: 'monthly',
      trial_ends_at: trialEndsAt,
      current_period_start: clock.now().toISOString(),
      current_period_end: trialEndsAt
    });
    record('create_subscription', 'ok');

    // Release channel
    await admin.from('tenant_release_channels').upsert({
      organization_id: org.id,
      channel: input.releaseChannel ?? 'production',
      notes: null
    }, { onConflict: 'organization_id' });
    record('set_release_channel', 'ok');

    // Team invitation email placeholder (queued via outbox for onboarding)
    await admin.from('email_outbox').insert({
      organization_id: org.id,
      to_email: ownerEmail,
      from_email: process.env.EMAIL_FROM ?? 'no-reply@srdigital.com.br',
      template: 'welcome',
      data: { organization_name: input.organizationName, trial_days: trialDays },
      subject: `Bem-vindo à ${input.organizationName}`,
      scheduled_at: clock.now().toISOString()
    });
    record('queue_welcome_email', 'ok');

    await admin.from('tenant_provisioning_runs').update({
      status: 'succeeded',
      organization_id: org.id,
      steps,
      result: { organization_id: org.id, owner_user_id: ownerUserId, trial_ends_at: trialEndsAt },
      completed_at: clock.now().toISOString()
    }).eq('id', run.id);

    return { runId: run.id, status: 'succeeded', organizationId: org.id, ownerUserId, steps };
  } catch (err) {
    const stepName = (err as StepError).step ?? 'unknown';
    const message = err instanceof Error ? err.message : 'unknown';
    logger.warn('tenant provisioning failed', { runId: run.id, stepName, message });
    record(stepName, 'failed', message);
    await admin.from('tenant_provisioning_runs').update({
      status: 'failed',
      steps,
      error: message,
      completed_at: clock.now().toISOString()
    }).eq('id', run.id);
    return { runId: run.id, status: 'failed', steps, error: message };
  }
}

type StepError = Error & { step?: string };
function stepError(step: string, message: string): StepError {
  const e = new Error(message) as StepError;
  e.step = step;
  return e;
}

async function failEarly(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: ProvisionInput,
  message: string
): Promise<ProvisionOutcome> {
  const { data: run } = await admin
    .from('tenant_provisioning_runs')
    .insert({
      operator_id: input.operatorId ?? null,
      status: 'failed',
      input: { organizationName: input.organizationName, slug: input.slug, ownerEmail: input.ownerEmail, planCode: input.planCode },
      error: message,
      completed_at: getClock().now().toISOString()
    })
    .select('id')
    .single<{ id: string }>();
  return {
    runId: run?.id ?? 'unknown',
    status: 'failed',
    steps: [{ name: 'validate_input', status: 'failed', at: getClock().now().toISOString(), error: message }],
    error: message
  };
}
