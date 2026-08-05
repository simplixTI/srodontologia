'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  generateSecret,
  generateBackupCodes,
  verifyBackupCode,
  totpVerify,
  otpauthUri,
  encryptSecret,
  decryptSecret
} from '@/lib/security/totp';

export type SetupResult =
  | { ok: true; secret: string; uri: string; backupCodes: string[] }
  | { ok: false; error: string };

export type ActionState = { ok: boolean; error?: string };

async function requireUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .maybeSingle<{ email: string; full_name: string }>();
  if (!profile) throw new Error('Perfil não encontrado.');
  return { user, profile };
}

/**
 * Kick off TOTP setup. Returns a fresh secret + otpauth URI + backup codes.
 * The secret is saved encrypted and `verified_at=null` until confirmSetup.
 */
export async function setupTotpAction(): Promise<SetupResult> {
  try {
    const { user, profile } = await requireUser();
    const secret = generateSecret();
    const { plain, hashed } = generateBackupCodes(10);
    const uri = otpauthUri({
      secret,
      accountName: profile.email,
      issuer: 'SR Digital'
    });

    const admin = createSupabaseAdminClient();
    await admin.from('user_totp_secrets').upsert({
      user_id: user.id,
      secret_enc: encryptSecret(secret),
      verified_at: null,
      backup_codes: hashed
    });

    return { ok: true, secret, uri, backupCodes: plain };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

const confirmSchema = z.object({ code: z.string().min(6).max(10) });

/** Verifies a 6-digit code and marks TOTP as active. */
export async function confirmTotpAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = confirmSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Código inválido.' };
    const { user } = await requireUser();

    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from('user_totp_secrets')
      .select('secret_enc, verified_at')
      .eq('user_id', user.id)
      .maybeSingle<{ secret_enc: string; verified_at: string | null }>();
    if (!row) return { ok: false, error: 'Nenhuma configuração pendente.' };
    if (row.verified_at) return { ok: false, error: '2FA já está ativo.' };

    const secret = decryptSecret(row.secret_enc);
    if (!totpVerify(secret, parsed.data.code)) return { ok: false, error: 'Código incorreto.' };

    await admin.from('user_totp_secrets').update({
      verified_at: new Date().toISOString()
    }).eq('user_id', user.id);

    await admin.from('security_events').insert({
      user_id: user.id,
      event_type: '2fa_enabled'
    });

    revalidatePath('/perfil');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

export async function disableTotpAction(): Promise<ActionState> {
  try {
    const { user } = await requireUser();
    const admin = createSupabaseAdminClient();
    await admin.from('user_totp_secrets').delete().eq('user_id', user.id);
    await admin.from('security_events').insert({
      user_id: user.id,
      event_type: '2fa_disabled'
    });
    revalidatePath('/perfil');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}

/** Consumes a backup code — verifies + removes from stored list. */
export async function useBackupCodeAction(code: string): Promise<ActionState> {
  try {
    const { user } = await requireUser();
    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from('user_totp_secrets')
      .select('backup_codes')
      .eq('user_id', user.id)
      .maybeSingle<{ backup_codes: string[] | null }>();
    if (!row?.backup_codes?.length) return { ok: false, error: 'Nenhum código disponível.' };
    const idx = verifyBackupCode(code, row.backup_codes);
    if (idx === null) return { ok: false, error: 'Código incorreto.' };
    const remaining = [...row.backup_codes];
    remaining.splice(idx, 1);
    await admin.from('user_totp_secrets').update({ backup_codes: remaining }).eq('user_id', user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha.' };
  }
}
