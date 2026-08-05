import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SkillLevel, TechnicianInput, TechStatus } from '@/lib/validations/production';
import type { Technician, TechnicianSkill } from './types';

export async function createTechnician(orgId: string, input: TechnicianInput): Promise<Technician> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('technicians')
    .insert({
      organization_id: orgId,
      profile_id: input.profile_id,
      specialty: input.specialty ?? null,
      team: input.team ?? null,
      status: input.status,
      weekly_hours: input.weekly_hours,
      hourly_cost: input.hourly_cost ?? null,
      notes: input.notes ?? null
    } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Technician;
}

export async function updateTechnician(id: string, patch: Partial<TechnicianInput>): Promise<Technician> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('technicians')
    .update({
      ...(patch.specialty !== undefined ? { specialty: patch.specialty ?? null } : {}),
      ...(patch.team !== undefined ? { team: patch.team ?? null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.weekly_hours !== undefined ? { weekly_hours: patch.weekly_hours } : {}),
      ...(patch.hourly_cost !== undefined ? { hourly_cost: patch.hourly_cost ?? null } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {})
    } as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Technician;
}

export async function updateStatus(id: string, status: TechStatus): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('technicians')
    .update({ status } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addSkill(technicianId: string, skill: string, level: SkillLevel): Promise<TechnicianSkill> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('technician_skills')
    .insert({ technician_id: technicianId, skill: skill.trim(), level } as never)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as TechnicianSkill;
}

export async function removeSkill(skillId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('technician_skills').delete().eq('id', skillId);
  if (error) throw new Error(error.message);
}

export async function deleteTechnician(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('technicians').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
