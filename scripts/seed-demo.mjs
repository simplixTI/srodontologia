// Seed protegido de dados de demonstração.
// Uso: `SEED_DEMO_CONFIRM=yes node --env-file=.env.local scripts/seed-demo.mjs`
//
// NÃO roda sem a env `SEED_DEMO_CONFIRM=yes`.
// NÃO roda em produção (bloqueio explícito por `DEPLOY_ENV`).
// Cria dados marcados com prefixo `[DEMO]` para fácil identificação/limpeza.

import { createClient } from '@supabase/supabase-js';

if (process.env.SEED_DEMO_CONFIRM !== 'yes') {
  console.error('Refusing to run: set SEED_DEMO_CONFIRM=yes to proceed.');
  process.exit(1);
}
if (process.env.DEPLOY_ENV === 'production') {
  console.error('Refusing to seed in DEPLOY_ENV=production.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env.');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log('[seed-demo] starting…');

  // 1. Demo lab
  const { data: existingOrg } = await admin.from('organizations')
    .select('id').eq('slug', 'demo-lab').maybeSingle();
  let orgId = existingOrg?.id;
  if (!orgId) {
    const { data: newOrg, error } = await admin.from('organizations').insert({
      name: '[DEMO] Laboratório Demonstração',
      slug: 'demo-lab',
      email: 'demo@srdigital.local',
      subscription_status: 'active'
    }).select('id').single();
    if (error) { console.error(error); process.exit(1); }
    orgId = newOrg.id;
    console.log('[seed-demo] created demo org', orgId);
  }

  // 2. Demo clinic
  const { data: clinics } = await admin.from('clinics').select('id').eq('organization_id', orgId).limit(1);
  if (!clinics?.length) {
    const { error } = await admin.from('clinics').insert([
      { organization_id: orgId, trade_name: '[DEMO] Clínica Norte', legal_name: '[DEMO] Norte LTDA', city: 'São Paulo', state: 'SP' },
      { organization_id: orgId, trade_name: '[DEMO] Clínica Sul', legal_name: '[DEMO] Sul LTDA', city: 'Belo Horizonte', state: 'MG' }
    ]);
    if (error) console.error('clinics:', error.message);
  }

  // 3. Demo cases (minimal — patient names / clinical data intentionally NOT included)
  const { count: caseCount } = await admin.from('cases').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
  if ((caseCount ?? 0) < 3) {
    const { data: types } = await admin.from('case_types').select('id').limit(1);
    const typeId = types?.[0]?.id;
    const rows = ['Coroa cerâmica · elemento 26', 'Prótese sobre implante · anterior superior', 'Zircônia · ponte 3 elementos'].map((title) => ({
      organization_id: orgId,
      case_type_id: typeId,
      title: `[DEMO] ${title}`,
      internal_status: 'submitted',
      public_status: 'in_planning'
    }));
    const { error } = await admin.from('cases').insert(rows);
    if (error) console.error('cases:', error.message);
  }

  console.log('[seed-demo] done');
}

main().catch((e) => { console.error(e); process.exit(1); });
