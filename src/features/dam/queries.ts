import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DamFileSummary, FileCollection, FileTag, FileWithMeta } from './types';

export async function listTags(): Promise<FileTag[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('file_tags').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as FileTag[];
}

export async function listCollections(): Promise<FileCollection[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('file_collections')
    .select('*')
    .order('is_shared', { ascending: false })
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as FileCollection[];
}

export async function listRecentFiles(limit = 60): Promise<FileWithMeta[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('case_files')
    .select(`
      id,
      organization_id,
      case_id,
      storage_path,
      file_name,
      mime_type,
      file_size,
      created_at,
      cases:cases!inner ( case_number, title )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const fileIds = rows.map((r) => r.id as string);

  const [summaryResult, favResult] = await Promise.all([
    fileIds.length === 0
      ? Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null })
      : supabase.from('v_dam_file_summary').select('*').in('file_id', fileIds),
    fileIds.length === 0
      ? Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null })
      : supabase.from('file_favorites').select('file_id').in('file_id', fileIds)
  ]);

  if (summaryResult.error) throw new Error(summaryResult.error.message);
  if (favResult.error) throw new Error(favResult.error.message);

  const summaryMap = new Map<string, DamFileSummary>();
  for (const s of (summaryResult.data ?? []) as Array<Record<string, unknown>>) {
    summaryMap.set(s.file_id as string, s as unknown as DamFileSummary);
  }

  return rows.map((r) => {
    const c = r.cases as { case_number?: string | null; title?: string | null } | null;
    const s = summaryMap.get(r.id as string);
    return {
      id: r.id as string,
      organization_id: r.organization_id as string,
      case_id: r.case_id as string,
      storage_path: r.storage_path as string,
      file_name: r.file_name as string,
      mime_type: (r.mime_type as string | null) ?? null,
      file_size: (r.file_size as number | null) ?? null,
      created_at: r.created_at as string,
      case_number: c?.case_number ?? null,
      case_title: c?.title ?? null,
      tags: (s?.tag_names as string[] | null) ?? [],
      is_favorite: s?.is_favorite ?? false,
      collection_count: s?.collection_count ?? 0
    } satisfies FileWithMeta;
  });
}

export async function listCollectionFiles(collectionId: string): Promise<FileWithMeta[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('file_collection_items')
    .select(`
      position,
      case_files!inner (
        id, organization_id, case_id, storage_path, file_name, mime_type, file_size, created_at,
        cases:cases!inner ( case_number, title )
      )
    `)
    .eq('collection_id', collectionId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const f = r.case_files as Record<string, unknown>;
    const c = f.cases as { case_number?: string | null; title?: string | null } | null;
    return {
      id: f.id as string,
      organization_id: f.organization_id as string,
      case_id: f.case_id as string,
      storage_path: f.storage_path as string,
      file_name: f.file_name as string,
      mime_type: (f.mime_type as string | null) ?? null,
      file_size: (f.file_size as number | null) ?? null,
      created_at: f.created_at as string,
      case_number: c?.case_number ?? null,
      case_title: c?.title ?? null,
      tags: [],
      is_favorite: false,
      collection_count: 1
    } satisfies FileWithMeta;
  });
}

export async function listFavorites(): Promise<FileWithMeta[]> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('file_favorites')
    .select(`
      file_id,
      case_files!inner (
        id, organization_id, case_id, storage_path, file_name, mime_type, file_size, created_at,
        cases:cases!inner ( case_number, title )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const f = r.case_files as Record<string, unknown>;
    const c = f.cases as { case_number?: string | null; title?: string | null } | null;
    return {
      id: f.id as string,
      organization_id: f.organization_id as string,
      case_id: f.case_id as string,
      storage_path: f.storage_path as string,
      file_name: f.file_name as string,
      mime_type: (f.mime_type as string | null) ?? null,
      file_size: (f.file_size as number | null) ?? null,
      created_at: f.created_at as string,
      case_number: c?.case_number ?? null,
      case_title: c?.title ?? null,
      tags: [],
      is_favorite: true,
      collection_count: 0
    } satisfies FileWithMeta;
  });
}
