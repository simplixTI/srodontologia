'use client';

import { ErrorFallback } from '@/components/errors/ErrorFallback';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white">
        <ErrorFallback error={error} reset={reset} homeHref="/" />
      </body>
    </html>
  );
}
