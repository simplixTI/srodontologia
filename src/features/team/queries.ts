import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type TeamMemberRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export async function listTeamMembers(): Promise<TeamMemberRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, last_login_at, created_at')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMemberRow[];
}

export async function listInvitations(): Promise<InvitationRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_invitations')
    .select('id, email, role, expires_at, accepted_at, cancelled_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as InvitationRow[];
}
