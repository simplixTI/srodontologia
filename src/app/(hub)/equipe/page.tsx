import type { Metadata } from 'next';
import { listTeamMembers, listInvitations } from '@/features/team/queries';
import { TeamPanel } from './TeamPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Equipe · SR HUB' };

export default async function EquipePage() {
  const [members, invitations] = await Promise.all([listTeamMembers(), listInvitations()]);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Conta</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Equipe</h1>
      </header>
      <TeamPanel initialMembers={members} initialInvitations={invitations} />
    </div>
  );
}
