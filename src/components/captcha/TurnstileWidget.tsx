'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile widget with graceful fallback.
 *
 * When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing, renders nothing and
 * emits a fixed `e2e-bypass` token so dev/E2E can proceed.
 *
 * The token is injected as `<input type="hidden" name={name}>` so it
 * flows to the server action naturally with the form.
 */
export function TurnstileWidget({ name = 'captcha_token' }: { name?: string }) {
  const [token, setToken] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      setToken('e2e-bypass');
      return;
    }
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    const render = () => {
      const w = window as typeof window & {
        turnstile?: {
          render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; 'error-callback'?: () => void; theme?: string }) => string;
        };
      };
      if (!w.turnstile || !ref.current) return;
      w.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (t) => { if (!cancelled) setToken(t); }
      });
    };

    // Poll until turnstile is ready
    const timer = setInterval(() => {
      const w = window as typeof window & { turnstile?: unknown };
      if (w.turnstile) {
        clearInterval(timer);
        render();
      }
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [siteKey]);

  return (
    <>
      <div ref={ref} />
      <input type="hidden" name={name} value={token} readOnly />
    </>
  );
}
