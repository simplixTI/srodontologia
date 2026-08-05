import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Technician, TechnicianSkill, TechnicianWithProfile, TechnicianWorkload } from './types';

export async function listTechnicians(): Promise<TechnicianWithProfile[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('technicians')
    .select(`
      *,
      profiles!inner ( full_name, email, role )
    `)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const p = r.profiles as { full_name?: string | null; email?: string | null; role?: string | null } | null;
    return {
      id: r.id as string,
      organization_id: r.organization_id as string,
      profile_id: r.profile_id as string,
      specialty: (r.specialty as string | null) ?? null,
      team: (r.team as string | null) ?? null,
      status: r.status as Technician['status'],
      weekly_hours: (r.weekly_hours as number) ?? 40,
      hourly_cost: (r.hourly_cost as number | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      name: p?.full_name ?? null,
      email: p?.email ?? null,
      role: p?.role ?? null
    } satisfies TechnicianWithProfile;
  });
}

export async function getTechnician(id: string): Promise<TechnicianWithProfile | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('technicians')
    .select(`
      *,
      profiles!inner ( full_name, email, role )
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const p = r.profiles as { full_name?: string | null; email?: string | null; role?: string | null } | null;
  return {
    id: r.id as string,
    organization_id: r.organization_id as string,
    profile_id: r.profile_id as string,
    specialty: (r.specialty as string | null) ?? null,
    team: (r.team as string | null) ?? null,
    status: r.status as Technician['status'],
    weekly_hours: (r.weekly_hours as number) ?? 40,
    hourly_cost: (r.hourly_cost as number | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    name: p?.full_name ?? null,
    email: p?.email ?? null,
    role: p?.role ?? null
  } satisfies TechnicianWithProfile;
}

export async function listSkillsByTechnician(technicianId: string): Promise<TechnicianSkill[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('technician_skills')
    .select('*')
    .eq('technician_id', technicianId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TechnicianSkill[];
}

export async function listWorkload(): Promise<TechnicianWorkload[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('v_technician_workload').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as TechnicianWorkload[];
}

export async function listAvailableProfiles(): Promise<Array<{ id: string; full_name: string; email: string; role: string }>> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from('technicians').select('profile_id');
  const excluded = new Set((existing ?? []).map((t) => (t as { profile_id: string }).profile_id));

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('status', 'active')
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((p) => !excluded.has((p as { id: string }).id))
    .map((p) => p as { id: string; full_name: string; email: string; role: string });
}
