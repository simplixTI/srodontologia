'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { setupTotpAction, confirmTotpAction, disableTotpAction } from '@/features/security/totp-actions';

export function TotpPanel({ active }: { active: boolean }) {
  const [pending, start] = useTransition();
  const [setup, setSetup] = useState<{ secret: string; uri: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState('');

  const begin = () => {
    start(async () => {
      const res = await setupTotpAction();
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setSetup({ secret: res.secret, uri: res.uri, backupCodes: res.backupCodes });
    });
  };

  const confirm = () => {
    start(async () => {
      const res = await confirmTotpAction({ code });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('2FA ativado.');
      setSetup(null);
      setCode('');
      window.location.reload();
    });
  };

  const disable = () => {
    if (!confirm2('Desativar 2FA? Sua conta ficará menos protegida.')) return;
    start(async () => {
      const res = await disableTotpAction();
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('2FA desativado.');
      window.location.reload();
    });
  };

  if (active) {
    return (
      <button
        type="button"
        onClick={disable}
        disabled={pending}
        className="rounded-full border border-red-400/40 bg-red-400/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-red-200 hover:border-red-400/70 disabled:opacity-50"
      >
        Desativar 2FA
      </button>
    );
  }

  if (!setup) {
    return (
      <button
        type="button"
        onClick={begin}
        disabled={pending}
        className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
      >
        {pending ? 'Gerando…' : 'Configurar 2FA'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">1. Escaneie no seu app</div>
        <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-xs text-white/70">URI otpauth (copie no seu app autenticador):</div>
          <code className="mt-1 block overflow-x-auto text-xs text-gold-100">{setup.uri}</code>
          <div className="mt-2 text-xs text-white/60">
            Ou digite manualmente o segredo: <code className="text-gold-100">{setup.secret}</code>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">2. Guarde os códigos de recuperação</div>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3 font-mono text-xs text-emerald-100">
          {setup.backupCodes.map((c) => <div key={c}>{c}</div>)}
        </div>
        <p className="mt-1 text-[0.6rem] text-white/50">
          Cada código pode ser usado uma única vez. Guarde em local seguro — não mostraremos novamente.
        </p>
      </div>

      <div>
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">3. Digite o código gerado no app</div>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            className="h-10 w-32 rounded-lg border border-white/10 bg-black/40 px-3 text-center font-mono text-sm text-white focus:border-gold/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={confirm}
            disabled={pending || code.length !== 6}
            className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
          >
            {pending ? 'Verificando…' : 'Ativar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function confirm2(msg: string) {
  if (typeof window === 'undefined') return false;
  return window.confirm(msg);
}
