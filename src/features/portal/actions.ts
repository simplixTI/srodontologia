'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertRateLimit } from '@/lib/rate-limit';

export type ActionState = { ok: boolean; error?: string; id?: string };

const BUCKET = 'case-files';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic',
  'pdf', 'stl', 'obj', 'dcm', 'dicom', 'zip'
]);

async function requireDentist() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile || profile.role !== 'dentist') throw new Error('Forbidden');

  const { data: dentist } = await supabase
    .from('dentists')
    .select('id, active, primary_clinic_id, full_name')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; active: boolean; primary_clinic_id: string | null; full_name: string }>();
  if (!dentist || !dentist.active) throw new Error('Cadastro de dentista inativo.');

  return { supabase, user, profile, dentist };
}

function getRequestMeta() {
  const h = headers();
  const ip =
    (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0]?.trim() ||
    null;
  const ua = h.get('user-agent') || null;
  return { ip, ua };
}

function safeName(name: string) {
  return name
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function extOf(name: string) {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}

function guessCategory(ext: string): string {
  switch (ext) {
    case 'stl': return 'stl';
    case 'obj': return 'obj';
    case 'dcm':
    case 'dicom':
    case 'zip': return 'dicom_tomography';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'heic': return 'intraoral_photo';
    case 'pdf': return 'planning';
    default: return 'other';
  }
}

// ═══════════════════════════════════════════════════════════
// NEW CASE (dentist creates for themselves)
// ═══════════════════════════════════════════════════════════

export async function createDentistCaseAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const title = String(formData.get('title') ?? '').trim();
  const caseTypeId = String(formData.get('case_type_id') ?? '').trim() || null;
  const clinicId = String(formData.get('clinic_id') ?? '').trim() || null;
  const clinicalDescription = String(formData.get('clinical_description') ?? '').trim() || null;
  const material = String(formData.get('material') ?? '').trim() || null;
  const shade = String(formData.get('shade') ?? '').trim() || null;
  const requested = String(formData.get('requested_delivery_date') ?? '').trim() || null;

  if (title.length < 2) return { ok: false, error: 'Título muito curto.' };
  if (title.length > 200) return { ok: false, error: 'Título muito longo.' };

  try {
    const { supabase, user, profile, dentist } = await requireDentist();

    assertRateLimit(`case:create:${user.id}`, { max: 10, windowMs: 60_000, label: 'Novos casos' });

    const { data, error } = await supabase
      .from('cases')
      .insert({
        organization_id: profile.organization_id,
        dentist_id: dentist.id,
        clinic_id: clinicId ?? dentist.primary_clinic_id,
        case_type_id: caseTypeId,
        title,
        clinical_description: clinicalDescription,
        material,
        shade,
        requested_delivery_date: requested,
        internal_status: 'draft',
        created_by: user.id
      } as never)
      .select('id, case_type_id')
      .single<{ id: string; case_type_id: string | null }>();

    if (error) return { ok: false, error: error.message };

    if (data?.case_type_id) {
      await supabase.rpc('instantiate_case_checklist', { p_case_id: data.id });
    }
    if (data?.id) {
      await supabase.rpc('refresh_case_health_score', { p_case_id: data.id });
    }

    revalidatePath('/portal/casos');
    redirect(`/portal/casos/${data!.id}?created=1`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes('NEXT_REDIRECT'))
      return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function submitDentistCaseAction(caseId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireDentist();

    const { data: caseRow } = await supabase
      .from('cases')
      .select('missing_required_items_count, internal_status')
      .eq('id', caseId)
      .maybeSingle<{ missing_required_items_count: number; internal_status: string }>();

    if (!caseRow) return { ok: false, error: 'Caso não encontrado.' };
    if (caseRow.internal_status !== 'draft') {
      return { ok: false, error: 'Este caso já foi enviado.' };
    }
    if (caseRow.missing_required_items_count > 0) {
      return {
        ok: false,
        error: `Faltam ${caseRow.missing_required_items_count} itens obrigatórios.`
      };
    }

    const { error } = await supabase
      .from('cases')
      .update({
        internal_status: 'submitted',
        submitted_at: new Date().toISOString()
      } as never)
      .eq('id', caseId);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/portal/casos');
    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true, id: caseId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// FILES (dentist uploads)
// ═══════════════════════════════════════════════════════════

export async function uploadDentistCaseFileAction(
  caseId: string,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get('file');
  const checklistItemId = String(formData.get('checklist_item_id') ?? '').trim() || null;

  if (!(file instanceof File)) return { ok: false, error: 'Nenhum arquivo enviado.' };
  if (file.size === 0) return { ok: false, error: 'Arquivo vazio.' };
  if (file.size > MAX_FILE_BYTES)
    return { ok: false, error: `Arquivo maior que ${MAX_FILE_BYTES / 1024 / 1024} MB.` };
  const ext = extOf(file.name);
  if (!ext || !ALLOWED_EXT.has(ext)) {
    return { ok: false, error: `Formato .${ext || '?'} não permitido.` };
  }

  try {
    const { supabase, user, profile, dentist } = await requireDentist();

    // Guard: dentist only uploads on their own cases in draft or missing_information
    const { data: caseRow } = await supabase
      .from('cases')
      .select('dentist_id, internal_status, public_status')
      .eq('id', caseId)
      .maybeSingle<{ dentist_id: string; internal_status: string; public_status: string }>();
    if (!caseRow || caseRow.dentist_id !== dentist.id) {
      return { ok: false, error: 'Caso não encontrado.' };
    }
    const canUpload =
      caseRow.internal_status === 'draft' ||
      caseRow.public_status === 'missing_information';
    if (!canUpload) {
      return { ok: false, error: 'Este caso não aceita novos arquivos no momento.' };
    }

    assertRateLimit(`portal:upload:${user.id}`, { max: 30, windowMs: 60_000, label: 'Uploads' });

    const category = guessCategory(ext);
    const cleanName = safeName(file.name);
    const objectKey = `${profile.organization_id}/${caseId}/${category}/${randomUUID()}-${cleanName}`;

    const arrayBuf = await file.arrayBuffer();
    const uploadRes = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, new Uint8Array(arrayBuf), {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });
    if (uploadRes.error) {
      return { ok: false, error: `Upload falhou: ${uploadRes.error.message}` };
    }

    const { data, error } = await supabase
      .from('case_files')
      .insert({
        organization_id: profile.organization_id,
        case_id: caseId,
        checklist_item_id: checklistItemId,
        uploaded_by: user.id,
        file_name: cleanName,
        original_name: file.name,
        storage_bucket: BUCKET,
        storage_path: objectKey,
        mime_type: file.type || null,
        extension: ext,
        file_size: file.size,
        category,
        visibility: 'shared',
        version_number: 1
      } as never)
      .select('id')
      .single<{ id: string }>();

    if (error) {
      await supabase.storage.from(BUCKET).remove([objectKey]);
      return { ok: false, error: `Falha ao registrar: ${error.message}` };
    }

    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true, id: data!.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getDentistSignedFileUrlAction(fileId: string, expiresIn = 60) {
  const { supabase } = await requireDentist();
  const { data: fileRow } = await supabase
    .from('case_files')
    .select('storage_path, storage_bucket')
    .eq('id', fileId)
    .maybeSingle<{ storage_path: string; storage_bucket: string }>();
  if (!fileRow) return null;
  const { data } = await supabase.storage
    .from(fileRow.storage_bucket)
    .createSignedUrl(fileRow.storage_path, expiresIn);
  return data?.signedUrl ?? null;
}

// ═══════════════════════════════════════════════════════════
// MESSAGES (dentist sends)
// ═══════════════════════════════════════════════════════════

export async function sendDentistMessageAction(
  caseId: string,
  formData: FormData
): Promise<ActionState> {
  const message = String(formData.get('message') ?? '').trim();
  const replyToId = String(formData.get('reply_to_id') ?? '').trim() || null;

  if (message.length < 1) return { ok: false, error: 'Digite uma mensagem.' };
  if (message.length > 5000) return { ok: false, error: 'Mensagem muito longa.' };

  try {
    const { supabase, user, profile } = await requireDentist();

    assertRateLimit(`portal:msg:${user.id}`, { max: 60, windowMs: 60_000, label: 'Mensagens' });

    const { error } = await supabase.from('case_messages').insert({
      organization_id: profile.organization_id,
      case_id: caseId,
      sender_id: user.id,
      message,
      visibility: 'dentist',
      reply_to_id: replyToId
    } as never);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// QUOTES · approve / request changes (SECURITY DEFINER)
// ═══════════════════════════════════════════════════════════

export async function approveQuoteAction(
  quoteId: string,
  caseId: string,
  comment?: string
): Promise<ActionState> {
  try {
    const { supabase } = await requireDentist();
    const { ip, ua } = getRequestMeta();
    const { error } = await supabase.rpc('dentist_approve_quote', {
      p_quote_id: quoteId,
      p_ip: ip,
      p_user_agent: ua,
      p_comment: comment ?? null
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function requestQuoteChangesAction(
  quoteId: string,
  caseId: string,
  comment: string
): Promise<ActionState> {
  if (comment.trim().length < 3) return { ok: false, error: 'Descreva o ajuste desejado.' };
  try {
    const { supabase } = await requireDentist();
    const { ip, ua } = getRequestMeta();
    const { error } = await supabase.rpc('dentist_request_quote_changes', {
      p_quote_id: quoteId,
      p_ip: ip,
      p_user_agent: ua,
      p_comment: comment.trim()
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// PLANNING · approve / request changes
// ═══════════════════════════════════════════════════════════

export async function approvePlanningAction(
  planningId: string,
  caseId: string,
  comment?: string
): Promise<ActionState> {
  try {
    const { supabase } = await requireDentist();
    const { ip, ua } = getRequestMeta();
    const { error } = await supabase.rpc('dentist_approve_planning', {
      p_planning_id: planningId,
      p_ip: ip,
      p_user_agent: ua,
      p_comment: comment ?? null
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function requestPlanningChangesAction(
  planningId: string,
  caseId: string,
  comment: string
): Promise<ActionState> {
  if (comment.trim().length < 3) return { ok: false, error: 'Descreva o ajuste desejado.' };
  try {
    const { supabase } = await requireDentist();
    const { ip, ua } = getRequestMeta();
    const { error } = await supabase.rpc('dentist_request_planning_changes', {
      p_planning_id: planningId,
      p_ip: ip,
      p_user_agent: ua,
      p_comment: comment.trim()
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// DELIVERIES · confirm receipt
// ═══════════════════════════════════════════════════════════

export async function confirmDeliveryAction(
  deliveryId: string,
  caseId: string,
  notes?: string
): Promise<ActionState> {
  try {
    const { supabase } = await requireDentist();
    const { ip, ua } = getRequestMeta();
    const { error } = await supabase.rpc('dentist_confirm_delivery', {
      p_delivery_id: deliveryId,
      p_ip: ip,
      p_user_agent: ua,
      p_notes: notes ?? null
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/portal/casos/${caseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS · mark read
// ═══════════════════════════════════════════════════════════

export async function markPortalNotificationReadAction(id: string) {
  const { supabase } = await requireDentist();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', id)
    .is('read_at', null);
  revalidatePath('/portal/notificacoes');
  revalidatePath('/portal');
}

export async function markAllPortalNotificationsReadAction() {
  const { supabase } = await requireDentist();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .is('read_at', null);
  revalidatePath('/portal/notificacoes');
  revalidatePath('/portal');
}
