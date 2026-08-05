'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

/**
 * Friendly error fallback used by Next 14 error.tsx boundaries.
 * Never shows stack traces to end users. Generates a reference code that
 * matches what appears in error tracking logs.
 */
export function ErrorFallback({
  error,
  reset,
  homeHref = '/'
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  const [ref] = useState(() => (error.digest ?? cryptoUUID()).slice(0, 12));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as typeof window & { Sentry?: { captureException?: (e: unknown) => void } };
    if (w.Sentry?.captureException) w.Sentry.captureException(error);
    // eslint-disable-next-line no-console
    console.error('[error boundary]', ref, error.message);
  }, [error, ref]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-300" strokeWidth={1.5} />
      <div>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Ops</div>
        <h1 className="mt-1 font-display text-2xl text-white">Algo deu errado por aqui.</h1>
        <p className="mt-2 text-sm text-white/60">
          A equipe já foi avisada. Se persistir, envie o código abaixo pelo suporte.
        </p>
      </div>
      <code className="rounded-lg bg-black/50 px-3 py-2 font-mono text-xs text-gold-100">ref: {ref}</code>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
        >
          <RotateCw className="h-3 w-3" strokeWidth={1.5} />
          Tentar novamente
        </button>
        <Link
          href={homeHref}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white"
        >
          <Home className="h-3 w-3" strokeWidth={1.5} />
          Voltar
        </Link>
      </div>
    </div>
  );
}

function cryptoUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fallthrough
  }
  return String(Date.now()).padStart(12, '0');
}
