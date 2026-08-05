'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { verifyCaptcha } from '@/lib/captcha/verify';

export type SignupState = { ok: boolean; error?: string };

const signupSchema = z.object({
  company_name: z.string().min(2).max(120),
  legal_name: z.string().max(200).optional().nullable(),
  document: z.string().max(30).optional().nullable(),
  slug: z.string()
    .min(3).max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e traços.'),
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(30).optional().nullable()
});

/**
 * Self-serve tenant signup. Creates:
 *   - auth.users (with confirmed email)
 *   - organizations (with trial subscription 14 days)
 *   - profile (role='admin', owner)
 *   - subscription in trial state on Starter plan
 *
 * Rate-limited by IP to avoid abuse.
 */
export async function signupTenantAction(
  _prev: SignupState | undefined,
  formData: FormData
): Promise<SignupState> {
  try {
    const h = headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    assertRateLimit(`signup:${ip}`, { max: 5, windowMs: 60_000, label: 'Cadastros' });

    // CAPTCHA verification (Turnstile in prod, mock in dev)
    const captchaToken = formData.get('captcha_token')?.toString() ?? '';
    const captcha = await verifyCaptcha({
      token: captchaToken,
      remoteIp: ip,
      context: 'signup',
      identifier: formData.get('email')?.toString() ?? null
    });
    if (!captcha.ok) {
      return { ok: false, error: 'Verificação de segurança falhou. Recarregue e tente novamente.' };
    }

    const parsed = signupSchema.safeParse({
      company_name: formData.get('company_name'),
      legal_name: formData.get('legal_name'),
      document: formData.get('document'),
      slug: formData.get('slug')?.toString().toLowerCase(),
      full_name: formData.get('full_name'),
      email: formData.get('email')?.toString().toLowerCase(),
      password: formData.get('password'),
      phone: formData.get('phone')
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

    const admin = createSupabaseAdminClient();

    // Slug uniqueness
    const { data: slugTaken } = await admin.from('organizations').select('id').eq('slug', parsed.data.slug).maybeSingle();
    if (slugTaken) return { ok: false, error: 'Este slug já está em uso.' };

    // Starter plan lookup
    const { data: plan } = await admin
      .from('plans')
      .select('id')
      .eq('code', 'starter')
      .maybeSingle<{ id: string }>();

    // Create auth user (email confirmed by admin)
    const { data: authRes, error: authErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name }
    });
    if (authErr || !authRes.user) return { ok: false, error: authErr?.message ?? 'Falha ao criar usuário.' };
    const userId = authRes.user.id;

    // Create org
    const trialEnds = new Date();
    trialEnds.setUTCDate(trialEnds.getUTCDate() + 14);
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: parsed.data.company_name,
        legal_name: parsed.data.legal_name ?? null,
        document: parsed.data.document ?? null,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        slug: parsed.data.slug,
        plan_id: plan?.id ?? null,
        subscription_status: 'trial',
        trial_ends_at: trialEnds.toISOString(),
        owner_id: userId
      })
      .select('id')
      .single<{ id: string }>();
    if (orgErr || !org) {
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, error: orgErr?.message ?? 'Falha ao criar organização.' };
    }

    // Create profile as admin of the new org
    const { error: profErr } = await admin.from('profiles').insert({
      id: userId,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      organization_id: org.id,
      role: 'admin',
      status: 'active',
      must_change_password: false
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(userId);
      await admin.from('organizations').delete().eq('id', org.id);
      return { ok: false, error: profErr.message };
    }

    // Create trial subscription
    if (plan?.id) {
      const { data: sub } = await admin
        .from('subscriptions')
        .insert({
          organization_id: org.id,
          plan_id: plan.id,
          status: 'trial',
          billing_cycle: 'monthly',
          trial_ends_at: trialEnds.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnds.toISOString()
        })
        .select('id')
        .single<{ id: string }>();
      if (sub) {
        await admin.from('subscription_events').insert({
          subscription_id: sub.id,
          organization_id: org.id,
          event_type: 'created',
          to_plan_id: plan.id,
          metadata: { source: 'self_signup' }
        });
      }
    }

    // Onboarding progress row
    await admin.from('system_settings').insert({
      organization_id: org.id,
      key: 'onboarding_progress',
      value: {
        started_at: new Date().toISOString(),
        completed_steps: ['company'],
        current_step: 'branding'
      }
    });

    // Security event
    await admin.from('security_events').insert({
      organization_id: org.id,
      user_id: userId,
      event_type: 'signup_completed',
      ip,
      user_agent: h.get('user-agent') ?? null,
      metadata: { slug: parsed.data.slug }
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha no cadastro.' };
  }

  redirect('/login?welcome=1');
}
