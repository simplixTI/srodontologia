#!/usr/bin/env node
/**
 * scripts/invite-user.mjs
 *
 * Invites a new SR HUB user:
 *   1. Creates (or reuses) the auth user via Supabase Admin API
 *   2. Upserts the corresponding profile row with the requested role,
 *      status = 'active', must_change_password = true
 *   3. Sends a welcome email via Resend with the temporary password
 *
 * Usage:
 *   node --env-file=.env.local scripts/invite-user.mjs \
 *     --email=brucnascimento@gmail.com \
 *     --name="Bruno Nascimento" \
 *     --role=admin \
 *     --password='SrHub#2026-Bruno'
 *
 * Optional flags:
 *   --role=<super_admin|admin|commercial|technical_planning|production|
 *          finance|logistics|dentist>   (default: admin)
 *   --password=<string>                 (default: auto-generated strong random)
 *   --no-email                          (skip Resend send, useful for dry runs)
 *
 * The script is idempotent:
 *   - if the auth user already exists, its password is NOT overwritten
 *   - if the profile already exists, it is updated to the requested role
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { buildWelcomeEmail, sendEmail } from './lib/email.mjs';

const SR_DIGITAL_ORG_ID = '00000000-0000-0000-0000-000000000001';

const VALID_ROLES = [
  'super_admin',
  'admin',
  'commercial',
  'technical_planning',
  'production',
  'finance',
  'logistics',
  'dentist'
];

// ---------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (const raw of argv.slice(2)) {
    if (!raw.startsWith('--')) continue;
    const [key, ...rest] = raw.slice(2).split('=');
    args[key] = rest.length ? rest.join('=') : true;
  }
  return args;
}

const args = parseArgs(process.argv);

function required(name, value) {
  if (!value) {
    console.error(`✗ Missing required arg: --${name}`);
    process.exit(1);
  }
  return value;
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

// ---------------------------------------------------------------
// Password generator (matches strongPassword rules)
// ---------------------------------------------------------------

function generateStrongPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digit = '23456789';
  const sym   = '!#$%&*+-=?@';
  const all   = upper + lower + digit + sym;

  const pick = (set) => set[randomBytes(1)[0] % set.length];
  const chars = [
    pick(upper), pick(upper),
    pick(lower), pick(lower), pick(lower),
    pick(digit), pick(digit),
    pick(sym),
    ...Array.from({ length: 6 }, () => pick(all))
  ];
  // shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

async function main() {
  const url         = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey  = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  const email    = String(required('email',    args.email)).toLowerCase().trim();
  const name     = String(required('name',     args.name)).trim();
  const role     = String(args.role ?? 'admin').trim();
  const password = String(args.password ?? generateStrongPassword());
  const noEmail  = args['no-email'] === true;

  if (!VALID_ROLES.includes(role)) {
    console.error(`✗ Invalid --role. Must be one of:\n  ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`→ Inviting ${email} (${name}) as role=${role}`);

  // 1. Look up existing user
  let userId = null;
  {
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) {
        console.error('✗ listUsers failed:', error.message);
        process.exit(1);
      }
      const match = data.users.find((u) => u.email?.toLowerCase() === email);
      if (match) { userId = match.id; break; }
      if (data.users.length < 200) break;
      page += 1;
    }
  }

  // 2. Create if missing
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });
    if (error) {
      console.error('✗ createUser failed:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`  · auth user created (id ${userId})`);
  } else {
    console.log(`  · auth user already exists (id ${userId}) — password NOT overwritten`);
  }

  // 3. Ensure org exists (idempotent)
  {
    const { error } = await admin
      .from('organizations')
      .upsert(
        { id: SR_DIGITAL_ORG_ID, name: 'SR Digital', legal_name: 'SR Odontologia Digital' },
        { onConflict: 'id' }
      );
    if (error) {
      console.error('✗ upsert organizations failed:', error.message);
      process.exit(1);
    }
  }

  // 4. Upsert profile
  {
    const { error } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          organization_id: SR_DIGITAL_ORG_ID,
          full_name: name,
          email,
          role,
          status: 'active',
          must_change_password: true
        },
        { onConflict: 'id' }
      );
    if (error) {
      console.error('✗ upsert profile failed:', error.message);
      process.exit(1);
    }
    console.log(`  · profile upserted (role=${role}, must_change_password=true)`);
  }

  // 5. Send welcome email
  if (noEmail) {
    console.log('  · --no-email passed, skipping Resend send');
  } else {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.srodontologiadigital.com.br';
    const loginUrl = `${siteUrl.replace(/\/$/, '')}/login`;

    const { subject, html, text } = await buildWelcomeEmail({
      name,
      email,
      tempPassword: password,
      role,
      loginUrl
    });

    try {
      const result = await sendEmail({ to: email, subject, html, text });
      console.log(`  · welcome email dispatched (id ${result?.id ?? 'unknown'})`);
    } catch (e) {
      console.error(`✗ Email dispatch failed: ${e.message}`);
      console.error('  The user was created successfully — you can share the password manually.');
    }
  }

  console.log('');
  console.log('✓ Invite complete.');
  console.log('');
  console.log('Login URL: ' + (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000') + '/login');
  console.log('E-mail:     ' + email);
  if (!args.password) {
    console.log('Password:   ' + password + '   (auto-generated — copy now, it will not be shown again)');
  } else {
    console.log('Password:   (as provided via --password)');
  }
  console.log('');
  console.log('The user will be forced to change their password on first login.');
}

main().catch((e) => {
  console.error('✗ Unexpected failure:', e?.message ?? e);
  process.exit(1);
});
