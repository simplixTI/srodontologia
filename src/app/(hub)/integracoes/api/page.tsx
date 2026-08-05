import type { Metadata } from 'next';
import { listApiKeys } from '@/features/api-keys/queries';
import { ApiKeysPanel } from './ApiKeysPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'API pública · SR HUB' };

export default async function ApiKeysPage() {
  const keys = await listApiKeys();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Integrações</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">API pública</h1>
        <p className="mt-2 text-sm text-white/60">
          Gere tokens Bearer para integrar sistemas de terceiros. Os tokens são exibidos uma única vez —
          guarde imediatamente. Spec OpenAPI disponível em{' '}
          <code className="rounded bg-black/40 px-1">/api/v1/openapi</code>.
        </p>
      </header>
      <ApiKeysPanel initial={keys} />
    </div>
  );
}
