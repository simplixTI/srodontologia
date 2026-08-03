#!/usr/bin/env node
/**
 * scripts/create-admin.mjs
 *
 * Bootstraps the first SR HUB super_admin (Aline).
 *
 * Reads:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   INITIAL_ADMIN_EMAIL
 *   INITIAL_ADMIN_PASSWORD
 *   INITIAL_ADMIN_NAME
 *
 * Behavior:
 *   - Creates the auth user with email_confirm = true (skip verification for bootstrap)
 *   - Creates or updates the matching profiles row
 *   - Attaches the SR Digital organization (id fixed by migration 0011)
 *   - Sets role = 'super_admin', status = 'active', must_change_password = true
 *   - Idempotent: safe to re-run
 *   - Never prints the password
 *
 * Run:
 *   npm run hub:create-admin
 *
 * After the first successful run, DELETE the INITIAL_ADMIN_PASSWORD env var.
 */

import { createClient } from '@supabase/supabase-js';

const SR_DIGITAL_ORG_ID = '00000000-0000-0000-0000-000000000001';

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const url      = required('NEXT_PUBLIC_SUPABASE_URL');
  const key      = required('SUPABASE_SERVICE_ROLE_KEY');
  const email    = required('INITIAL_ADMIN_EMAIL').toLowerCase().trim();
  const password = required('INITIAL_ADMIN_PASSWORD');
  const name     = required('INITIAL_ADMIN_NAME');

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`→ Bootstrapping admin for ${email} (${name})`);

  // 1. Look up existing user by e-mail
  let userId = null;
  {
    let page = 1;
    // paginate through auth.users looking for a match
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) {
        console.error('✗ Failed to list users:', error.message);
        process.exit(1);
      }
      const match = data.users.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        userId = match.id;
        break;
      }
      if (data.users.length < 200) break;
      page += 1;
    }
  }

  // 2. Create user if missing
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });
    if (error) {
      console.error('✗ Failed to create auth user:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`  · auth user created (id ${userId})`);
  } else {
    console.log(`  · auth user already exists (id ${userId}) — leaving password untouched`);
  }

  // 3. Ensure the SR Digital organization row exists (migration 0011 already inserted it,
  //    but this makes the script robust when run against a non-seeded DB)
  {
    const { error } = await admin
      .from('organizations')
      .upsert(
        {
          id: SR_DIGITAL_ORG_ID,
          name: 'SR Digital',
          legal_name: 'SR Odontologia Digital'
        },
        { onConflict: 'id' }
      );
    if (error) {
      console.error('✗ Failed to upsert organization:', error.message);
      process.exit(1);
    }
  }

  // 4. Upsert the profile
  {
    const { error } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          organization_id: SR_DIGITAL_ORG_ID,
          full_name: name,
          email,
          role: 'super_admin',
          status: 'active',
          must_change_password: true
        },
        { onConflict: 'id' }
      );
    if (error) {
      console.error('✗ Failed to upsert profile:', error.message);
      process.exit(1);
    }
    console.log('  · profile upserted with role=super_admin, must_change_password=true');
  }

  console.log('');
  console.log('✓ Bootstrap complete.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Log in at /login with the initial credentials.');
  console.log('  2. The system will force a password change on first access.');
  console.log('  3. Remove INITIAL_ADMIN_PASSWORD from your environment.');
}

main().catch((e) => {
  console.error('✗ Unexpected failure:', e?.message ?? e);
  process.exit(1);
});
