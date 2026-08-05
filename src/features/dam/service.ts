import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FileCollectionInput, FileTagInput } from '@/lib/validations/dam';
import type { FileCollection, FileTag } from './types';

// ─── Tags ─────────────────────────────────────────────────
export async function createTag(orgId: string, input: FileTagInput): Promise<FileTag> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('file_tags')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      color: input.color,
      created_by: userData.user?.id ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as FileTag;
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('file_tags').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function assignTag(orgId: string, fileId: string, tagId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('file_tag_assignments').insert({
    organization_id: orgId,
    file_id: fileId,
    tag_id: tagId,
    created_by: userData.user?.id ?? null
  } as never);
  if (error && !String(error.message).includes('duplicate')) throw new Error(error.message);
}

export async function unassignTag(fileId: string, tagId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('file_tag_assignments')
    .delete()
    .eq('file_id', fileId)
    .eq('tag_id', tagId);
  if (error) throw new Error(error.message);
}

// ─── Collections ──────────────────────────────────────────
export async function createCollection(
  orgId: string,
  input: FileCollectionInput
): Promise<FileCollection> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('file_collections')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      description: input.description ?? null,
      color: input.color,
      is_shared: input.is_shared,
      created_by: userData.user?.id ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as FileCollection;
}

export async function deleteCollection(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('file_collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addFileToCollection(
  orgId: string,
  collectionId: string,
  fileId: string
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: existing } = await supabase
    .from('file_collection_items')
    .select('position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0] as { position: number } | undefined)?.position ?? -10) + 10;
  const { error } = await supabase.from('file_collection_items').insert({
    organization_id: orgId,
    collection_id: collectionId,
    file_id: fileId,
    position: nextPos,
    added_by: userData.user?.id ?? null
  } as never);
  if (error) throw new Error(error.message);
}

export async function removeFileFromCollection(
  collectionId: string,
  fileId: string
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('file_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('file_id', fileId);
  if (error) throw new Error(error.message);
}

// ─── Favorites ────────────────────────────────────────────
export async function toggleFavorite(orgId: string, fileId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: existing } = await supabase
    .from('file_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('file_id', fileId)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    const { error } = await supabase.from('file_favorites').delete().eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  }
  const { error } = await supabase.from('file_favorites').insert({
    organization_id: orgId,
    user_id: user.id,
    file_id: fileId
  } as never);
  if (error) throw new Error(error.message);
  return true;
}
