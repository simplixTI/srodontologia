'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; error?: string; id?: string };

const BUCKET = 'case-files';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per file (Supabase default limit)

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic',
  'pdf',
  'stl', 'obj',
  'dcm', 'dicom', 'zip'
]);

async function requireInternal() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle<{ organization_id: string; role: string }>();
  if (!profile) throw new Error('No profile');
  const allowed = ['super_admin', 'admin', 'commercial', 'technical_planning', 'production'];
  if (!allowed.includes(profile.role)) throw new Error('Forbidden');
  return { supabase, user, profile };
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

/** Best-effort mapping from extension to checklist_item_category enum. */
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

/**
 * Upload a single file to Storage + insert row in case_files.
 * If uploaded_ok=false, tries to delete the storage object to avoid orphans.
 */
export async function uploadCaseFileAction(
  caseId: string,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get('file');
  const checklistItemId = (formData.get('checklist_item_id') as string | null) || null;
  const visibility = (formData.get('visibility') as string | null) || 'shared';

  if (!(file instanceof File)) {
    return { ok: false, error: 'Nenhum arquivo enviado.' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Arquivo vazio.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `Arquivo maior que ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.` };
  }
  const ext = extOf(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `Formato não permitido (.${ext || '?'}). Aceitos: ${[...ALLOWED_EXTENSIONS].join(', ')}.`
    };
  }

  const { supabase, user, profile } = await requireInternal();

  const category = guessCategory(ext);
  const cleanName = safeName(file.name);
  const objectKey = `${profile.organization_id}/${caseId}/${category}/${randomUUID()}-${cleanName}`;

  // 1. Upload blob to Storage
  const arrayBuf = await file.arrayBuffer();
  const uploadRes = await supabase.storage
    .from(BUCKET)
    .upload(objectKey, new Uint8Array(arrayBuf), {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false
    });

  if (uploadRes.error) {
    return { ok: false, error: `Falha no upload: ${uploadRes.error.message}` };
  }

  // 2. Insert metadata
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
      visibility: visibility === 'internal' ? 'internal' : 'shared',
      version_number: 1
    } as never)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    // rollback storage object
    await supabase.storage.from(BUCKET).remove([objectKey]);
    return { ok: false, error: `Falha ao registrar arquivo: ${error.message}` };
  }

  // Trigger will refresh health score
  revalidatePath(`/casos/${caseId}`);
  return { ok: true, id: data!.id };
}

export async function linkFileToChecklistItemAction(
  fileId: string,
  caseId: string,
  checklistItemId: string | null
) {
  const { supabase } = await requireInternal();
  const { error } = await supabase
    .from('case_files')
    .update({ checklist_item_id: checklistItemId } as never)
    .eq('id', fileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

export async function deleteCaseFileAction(fileId: string, caseId: string) {
  const { supabase } = await requireInternal();

  const { data: fileRow } = await supabase
    .from('case_files')
    .select('storage_path')
    .eq('id', fileId)
    .maybeSingle<{ storage_path: string }>();

  // Soft delete metadata (keeps for audit)
  const { error } = await supabase
    .from('case_files')
    .update({ archived_at: new Date().toISOString() } as never)
    .eq('id', fileId);
  if (error) throw new Error(error.message);

  // Hard delete storage object (keeps DB row for audit, drops the blob)
  if (fileRow?.storage_path) {
    await supabase.storage.from(BUCKET).remove([fileRow.storage_path]);
  }

  revalidatePath(`/casos/${caseId}`);
}

/**
 * Generates a short-lived (60s default) signed URL for downloading a file.
 * Returns null if file not accessible.
 */
export async function getSignedFileUrlAction(fileId: string, expiresIn = 60) {
  const { supabase } = await requireInternal();
  const { data: fileRow } = await supabase
    .from('case_files')
    .select('storage_path, storage_bucket')
    .eq('id', fileId)
    .maybeSingle<{ storage_path: string; storage_bucket: string }>();
  if (!fileRow) return null;

  const { data, error } = await supabase.storage
    .from(fileRow.storage_bucket)
    .createSignedUrl(fileRow.storage_path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
