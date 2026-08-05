#!/usr/bin/env node
/**
 * CLI de provisionamento do primeiro (e futuros) tenants. Usa service_role.
 * Requer confirmação explícita antes de escrever.
 *
 * Uso:
 *   node scripts/provision-tenant.mjs \
 *     --org "Lab Exemplo" --slug lab-exemplo \
 *     --owner-email dono@lab.com --owner-name "Nome Dono" \
 *     --plan business [--trial-days 14] [--channel pilot]
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.org || !args.slug || !args['owner-email'] || !args['owner-name'] || !args.plan) {
  console.log(`
Provisiona um tenant no HUB. Todos os flags são obrigatórios exceto trial-days/channel.

  --org "Lab X"           Nome de exibição da organização
  --slug lab-x            Slug (a-z0-9-, 3-51 chars)
  --owner-email x@y.com   E-mail do owner (super_admin do tenant)
  --owner-name "Nome"     Nome completo do owner
  --plan starter|professional|business|enterprise
  --trial-days 14         (opcional, default 14, max 60)
  --channel production    (opcional: internal|pilot|beta|production)
  --yes                   (opcional) Pula confirmação interativa
`);
  process.exit(args.help ? 0 : 1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('\nProvisionamento — preview\n' + '─'.repeat(60));
console.log(`  Organização:  ${args.org}`);
console.log(`  Slug:         ${args.slug}`);
console.log(`  Owner:        ${args['owner-name']} <${args['owner-email']}>`);
console.log(`  Plano:        ${args.plan}`);
console.log(`  Trial dias:   ${args['trial-days'] ?? 14}`);
console.log(`  Canal:        ${args.channel ?? 'production'}`);
console.log('─'.repeat(60));

if (!args.yes) {
  const rl = readline.createInterface({ input, output });
  const ans = await rl.question('\nConfirmar provisionamento? (digite "SIM"): ');
  rl.close();
  if (ans.trim() !== 'SIM') {
    console.log('Cancelado.');
    process.exit(0);
  }
}

// Chamamos a função server-side via um fetch simulado no admin — mais simples:
// inline o insert direto aqui (paralelo ao src/lib/provisioning/tenant.ts).
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Verifica plano
const { data: plan } = await admin.from('plans').select('id, code').eq('code', args.plan).maybeSingle();
if (!plan) { console.error(`Plano não encontrado: ${args.plan}`); process.exit(1); }

// Verifica slug
const { data: taken } = await admin.from('organizations').select('id').eq('slug', args.slug).maybeSingle();
if (taken) { console.error(`Slug já em uso: ${args.slug}`); process.exit(1); }

const trialDays = Math.max(1, Math.min(60, parseInt(args['trial-days'] ?? '14', 10)));
const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000).toISOString();
const nowIso = new Date().toISOString();

const { data: run } = await admin.from('tenant_provisioning_runs').insert({
  status: 'started',
  input: { org: args.org, slug: args.slug, ownerEmail: args['owner-email'], plan: args.plan }
}).select('id').single();

try {
  const { data: org, error: orgErr } = await admin.from('organizations').insert({
    name: args.org, slug: args.slug, plan_id: plan.id,
    subscription_status: 'trial', trial_ends_at: trialEndsAt, last_activity_at: nowIso
  }).select('id').single();
  if (orgErr || !org) throw new Error(`create_org: ${orgErr?.message}`);
  console.log(`  ✓ org ${org.id}`);

  // Owner user
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ownerEmail = args['owner-email'].toLowerCase();
  const existing = users?.users?.find((u) => u.email?.toLowerCase() === ownerEmail);
  let ownerId;
  if (existing) {
    ownerId = existing.id;
    console.log(`  ✓ owner auth (existente) ${ownerId}`);
  } else {
    const { data: c, error: cErr } = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
      user_metadata: { full_name: args['owner-name'] }
    });
    if (cErr || !c?.user) throw new Error(`create_owner_auth: ${cErr?.message}`);
    ownerId = c.user.id;
    console.log(`  ✓ owner auth (novo) ${ownerId}`);
  }

  await admin.from('profiles').upsert({
    id: ownerId, organization_id: org.id, role: 'super_admin',
    status: 'active', email: ownerEmail, full_name: args['owner-name'],
    must_change_password: true
  }, { onConflict: 'id' });
  console.log('  ✓ profile do owner');

  await admin.from('organizations').update({ owner_id: ownerId }).eq('id', org.id);

  await admin.from('subscriptions').insert({
    organization_id: org.id, plan_id: plan.id, status: 'trial', billing_cycle: 'monthly',
    trial_ends_at: trialEndsAt, current_period_start: nowIso, current_period_end: trialEndsAt
  });
  console.log('  ✓ subscription trial');

  await admin.from('tenant_release_channels').upsert({
    organization_id: org.id, channel: args.channel ?? 'production'
  }, { onConflict: 'organization_id' });
  console.log(`  ✓ release channel = ${args.channel ?? 'production'}`);

  await admin.from('tenant_provisioning_runs').update({
    status: 'succeeded', organization_id: org.id,
    result: { organization_id: org.id, owner_user_id: ownerId, trial_ends_at: trialEndsAt },
    completed_at: new Date().toISOString()
  }).eq('id', run.id);

  console.log('\n✅ Provisionamento concluído.');
  console.log(`   run_id: ${run.id}`);
  console.log(`   org_id: ${org.id}`);
  console.log(`   owner:  ${ownerId}`);
  console.log(`   trial:  até ${trialEndsAt}`);
} catch (err) {
  console.error(`\n❌ Falhou: ${err.message}`);
  await admin.from('tenant_provisioning_runs').update({
    status: 'failed', error: err.message, completed_at: new Date().toISOString()
  }).eq('id', run.id);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes') out.yes = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--')) { out[a.slice(2)] = argv[i + 1]; i++; }
  }
  return out;
}
