'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  collectionAddSchema,
  extractCollectionForm,
  extractFileTagForm,
  fileCollectionSchema,
  fileTagSchema,
  tagAssignSchema
} from '@/lib/validations/dam';
import {
  addFileToCollection,
  assignTag,
  createCollection,
  createTag,
  deleteCollection,
  deleteTag,
  removeFileFromCollection,
  toggleFavorite,
  unassignTag
} from './service';

export type ActionState = { ok: boolean; error?: string; id?: string };

async function requireInternal() {
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
  if (!profile) throw new Error('No profile');
  if (profile.role === 'dentist') throw new Error('Forbidden');
  return { orgId: profile.organization_id, userId: user.id };
}

// ─── Tags ─────────────────────────────────────────────────
export async function createTagAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractFileTagForm(fd);
  const parsed = fileTagSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireInternal();
    await createTag(orgId, parsed.data);
    revalidatePath('/arquivos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTagAction(id: string): Promise<void> {
  await requireInternal();
  await deleteTag(id);
  revalidatePath('/arquivos');
}

export async function assignTagAction(input: { file_id: string; tag_id: string }): Promise<void> {
  const parsed = tagAssignSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireInternal();
  await assignTag(orgId, parsed.data.file_id, parsed.data.tag_id);
  revalidatePath('/arquivos');
}

export async function unassignTagAction(fileId: string, tagId: string): Promise<void> {
  await requireInternal();
  await unassignTag(fileId, tagId);
  revalidatePath('/arquivos');
}

// ─── Collections ──────────────────────────────────────────
export async function createCollectionAction(
  _prev: ActionState | undefined,
  fd: FormData
): Promise<ActionState> {
  const raw = extractCollectionForm(fd);
  const parsed = fileCollectionSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    const { orgId } = await requireInternal();
    await createCollection(orgId, parsed.data);
    revalidatePath('/arquivos/colecoes');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteCollectionAction(id: string): Promise<void> {
  await requireInternal();
  await deleteCollection(id);
  revalidatePath('/arquivos/colecoes');
}

export async function addFileToCollectionAction(input: {
  collection_id: string;
  file_id: string;
}): Promise<void> {
  const parsed = collectionAddSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
  const { orgId } = await requireInternal();
  await addFileToCollection(orgId, parsed.data.collection_id, parsed.data.file_id);
  revalidatePath(`/arquivos/colecoes/${parsed.data.collection_id}`);
}

export async function removeFileFromCollectionAction(
  collectionId: string,
  fileId: string
): Promise<void> {
  await requireInternal();
  await removeFileFromCollection(collectionId, fileId);
  revalidatePath(`/arquivos/colecoes/${collectionId}`);
}

// ─── Favorites ────────────────────────────────────────────
export async function toggleFavoriteAction(fileId: string): Promise<boolean> {
  const { orgId } = await requireInternal();
  const result = await toggleFavorite(orgId, fileId);
  revalidatePath('/arquivos');
  return result;
}
