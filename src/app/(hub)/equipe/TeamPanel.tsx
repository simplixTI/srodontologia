'use client';

import { useState, useTransition } from 'react';
import { Plus, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { inviteTeamMemberAction, cancelInviteAction } from '@/features/team/actions';
import type { TeamMemberRow, InvitationRow } from '@/features/team/queries';
import { ROLE_LABELS, INTERNAL_ROLES } from '@/lib/permissions/roles';

export function TeamPanel({
  initialMembers,
  initialInvitations
}: {
  initialMembers: TeamMemberRow[];
  initialInvitations: InvitationRow[];
}) {
  const [members] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('commercial');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const invite = () => {
    start(async () => {
      const res = await inviteTeamMemberAction({ email, role });
      if (!res.ok || !res.token) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Convite criado.');
      setIssuedToken(res.token);
      setInvitations((i) => [
        {
          id: crypto.randomUUID(),
          email,
          role,
          expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
          accepted_at: null,
          cancelled_at: null,
          created_at: new Date().toISOString()
        },
        ...i
      ]);
      setEmail('');
      setInviting(false);
    });
  };

  const cancel = (id: string) => {
    if (!confirm('Cancelar este convite?')) return;
    start(async () => {
      const res = await cancelInviteAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setInvitations((i) => i.map((x) => (x.id === id ? { ...x, cancelled_at: new Date().toISOString() } : x)));
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm text-white">Membros ({members.length})</h2>
          <button
            type="button"
            onClick={() => setInviting((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} />
            Convidar
          </button>
        </div>

        {inviting && (
          <div className="mb-3 rounded-2xl border border-gold/25 bg-gold/[0.03] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colega@empresa.com"
                className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none md:col-span-2"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
              >
                {INTERNAL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviting(false)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={invite}
                disabled={pending || !email}
                className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
              >
                {pending ? 'Enviando…' : 'Enviar convite'}
              </button>
            </div>
          </div>
        )}

        {issuedToken && (
          <div className="mb-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-3">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200">
              Link de convite (envie manualmente até termos e-mail integrado)
            </div>
            <div className="mt-2 flex gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-black/50 px-3 py-2 text-xs text-emerald-100">
                {window.location.origin}/accept-invite?token={issuedToken}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${issuedToken}`);
                  toast.success('Copiado.');
                }}
                className="rounded-full border border-emerald-400/40 p-2 text-emerald-100 hover:bg-emerald-400/10"
              >
                <Copy className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const isPlatform = m.platform_role === 'super' || m.platform_role === 'support';
            const badgeLabel = isPlatform
              ? m.platform_role === 'super'
                ? 'Super · Plataforma'
                : 'Suporte · Plataforma'
              : (ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role);
            const badgeClass = isPlatform
              ? 'rounded-full border border-gold/40 bg-gold/10 px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
              : 'rounded-full border border-white/15 bg-white/[0.05] px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70';
            return (
              <li key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white">{m.full_name}</div>
                    <div className="mt-0.5 text-xs text-white/50">{m.email}</div>
                  </div>
                  <span className={badgeClass}>{badgeLabel}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm text-white">Convites pendentes ({invitations.filter((i) => !i.accepted_at && !i.cancelled_at).length})</h2>
        <ul className="flex flex-col gap-2">
          {invitations.map((inv) => (
            <li
              key={inv.id}
              className={
                inv.cancelled_at
                  ? 'rounded-2xl border border-white/5 bg-white/[0.01] p-3 opacity-50'
                  : inv.accepted_at
                  ? 'rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-3'
                  : 'rounded-2xl border border-gold/15 bg-white/[0.02] p-3'
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white">{inv.email}</div>
                  <div className="mt-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                    {ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role} · expira{' '}
                    {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {!inv.accepted_at && !inv.cancelled_at && (
                  <button
                    type="button"
                    onClick={() => cancel(inv.id)}
                    className="rounded-full border border-red-400/30 p-1.5 text-red-200 hover:bg-red-400/10"
                  >
                    <XCircle className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
