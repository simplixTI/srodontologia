#!/usr/bin/env node
/**
 * scripts/seed-roles.mjs
 *
 * Bootstraps the canonical SR HUB users:
 *   • BRUNO  — SUPER_ADMIN da plataforma (platform_role='super')
 *              Sem tenant operacional; existe apenas para administrar
 *              tenants, planos, domínios, infraestrutura.
 *   • ALINE  — ADMIN do escritório SR Odontologia (role='admin')
 *              Sem platform_role. Administra apenas o próprio tenant.
 *
 * Reads (obrigatórias):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BRUNO_EMAIL          (default: bruno@srdigital.com.br)
 *   BRUNO_PASSWORD       (obrigatória se BRUNO_EMAIL não existir ainda)
 *   ALINE_EMAIL          (default: aline@srodontologia.com.br)
 *   ALINE_PASSWORD       (obrigatória se ALINE_EMAIL não existir ainda)
 *
 * Behavior:
 *   • Idempotente: pode ser rodado múltiplas vezes.
 *   • Cria auth.users se ainda não existir (senha só usada quando cria).
 *   • Faz upsert em profiles com role/platform_role corretos.
 *   • Bruno recebe platform_role='super' e status='active'.
 *   • Aline recebe role='admin' no tenant SR Odontologia
 *     (id fixo 00000000-0000-0000-0000-000000000001, criado por migration 0011).
 *   • Nunca imprime senha em log.
 *
 * Run:
 *   node --env-file=.env.local scripts/seed-roles.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SR_DIGITAL_ORG_ID = '00000000-0000-0000-0000-000000000001';
const PLATFORM_ORG_ID   = '00000000-0000-0000-0000-000000000000';

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}
function optional(name, fallback) {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : fallback;
}

async function findUserIdByEmail(admin, email) {
  const target = email.toLowerCase().trim();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('✗ Failed to list users:', error.message);
      process.exit(1);
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(admin, { email, password, name, mustChangePassword }) {
  const existing = await findUserIdByEmail(admin, email);
  if (existing) {
    console.log(`  · ${email}: auth user already exists (id ${existing}) — password untouched`);
    return existing;
  }
  if (!password) {
    console.error(`✗ ${email} does not exist and no password was provided (set env var).`);
    process.exit(1);
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, must_change_password: mustChangePassword }
  });
  if (error) {
    console.error(`✗ Failed to create ${email}:`, error.message);
    process.exit(1);
  }
  console.log(`  · ${email}: created (id ${data.user.id})`);
  return data.user.id;
}

async function ensurePlatformOrg(admin) {
  // Bruno precisa de um organization_id (FK NOT NULL em profiles).
  // Usamos um "org de plataforma" dedicado para hospedar contas SaaS.
  const { error } = await admin
    .from('organizations')
    .upsert(
      {
        id: PLATFORM_ORG_ID,
        name: 'SR Digital · Plataforma',
        legal_name: 'SR Digital SaaS'
      },
      { onConflict: 'id' }
    );
  if (error) {
    console.error('✗ Failed to upsert platform org:', error.message);
    process.exit(1);
  }
}

async function ensureSrOdontologiaOrg(admin) {
  const { error } = await admin
    .from('organizations')
    .upsert(
      {
        id: SR_DIGITAL_ORG_ID,
        name: 'SR Odontologia',
        legal_name: 'SR Odontologia Digital'
      },
      { onConflict: 'id' }
    );
  if (error) {
    console.error('✗ Failed to upsert SR Odontologia org:', error.message);
    process.exit(1);
  }
}

async function upsertProfile(admin, {
  id, organizationId, fullName, email, role, platformRole, mustChangePassword
}) {
  const { error } = await admin
    .from('profiles')
    .upsert(
      {
        id,
        organization_id: organizationId,
        full_name: fullName,
        email,
        role,
        platform_role: platformRole,
        status: 'active',
        must_change_password: mustChangePassword
      },
      { onConflict: 'id' }
    );
  if (error) {
    console.error(`✗ Failed to upsert profile ${email}:`, error.message);
    process.exit(1);
  }
  console.log(`  · ${email}: profile upserted (role=${role}, platform_role=${platformRole ?? 'null'})`);
}

async function main() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const key = required('SUPABASE_SERVICE_ROLE_KEY');

  const brunoEmail = optional('BRUNO_EMAIL', 'bruno@srdigital.com.br').toLowerCase().trim();
  const alineEmail = optional('ALINE_EMAIL', 'aline@srodontologia.com.br').toLowerCase().trim();
  const brunoPassword = process.env.BRUNO_PASSWORD;
  const alinePassword = process.env.ALINE_PASSWORD;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('→ Ensuring platform + SR Odontologia orgs');
  await ensurePlatformOrg(admin);
  await ensureSrOdontologiaOrg(admin);

  console.log(`→ Bootstrapping BRUNO (SUPER_ADMIN da plataforma) — ${brunoEmail}`);
  const brunoId = await ensureUser(admin, {
    email: brunoEmail,
    password: brunoPassword,
    name: 'Bruno',
    mustChangePassword: true
  });
  await upsertProfile(admin, {
    id: brunoId,
    organizationId: PLATFORM_ORG_ID,
    fullName: 'Bruno',
    email: brunoEmail,
    role: 'admin',            // valor válido do enum; sem privilégio no tenant
    platformRole: 'super',    // aqui está o poder real
    mustChangePassword: true
  });

  console.log(`→ Bootstrapping ALINE (ADMIN do escritório) — ${alineEmail}`);
  const alineId = await ensureUser(admin, {
    email: alineEmail,
    password: alinePassword,
    name: 'Aline',
    mustChangePassword: true
  });
  await upsertProfile(admin, {
    id: alineId,
    organizationId: SR_DIGITAL_ORG_ID,
    fullName: 'Aline',
    email: alineEmail,
    role: 'admin',            // ADMIN do escritório
    platformRole: null,       // sem acesso à plataforma
    mustChangePassword: true
  });

  console.log('');
  console.log('✓ Bootstrap complete.');
  console.log('');
  console.log('Bruno → https://<super-admin-host>/super-admin');
  console.log('Aline → https://parceiro.srodontologia.com.br/dashboard');
  console.log('');
  console.log('Remova as senhas iniciais das variáveis de ambiente após o primeiro login.');
}

main().catch((e) => {
  console.error('✗ Unexpected failure:', e?.message ?? e);
  process.exit(1);
});
