import type { Metadata } from 'next';
import { resolveBranding } from '@/lib/branding/resolver';
import { BrandingForm } from './BrandingForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Identidade visual · SR HUB' };

export default async function BrandingPage() {
  const current = await resolveBranding();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">SaaS</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Identidade visual</h1>
        <p className="mt-2 text-sm text-white/60">
          Personalize a marca vista pelos dentistas no portal, em e-mails e comprovantes.
        </p>
      </header>
      <BrandingForm initial={current} />
    </div>
  );
}
