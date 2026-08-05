import type { Metadata } from 'next';
import { listOcrExtractions } from '@/features/ocr/queries';
import { OcrReviewList } from './OcrReviewList';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'OCR & extrações · SR HUB' };

export default async function OcrPage() {
  const [awaiting, confirmed] = await Promise.all([
    listOcrExtractions('awaiting_review'),
    listOcrExtractions('confirmed')
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Inteligência</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">OCR & extrações</h1>
        <p className="mt-2 text-sm text-white/60">
          Documentos e fichas processados automaticamente. Revise antes de gravar no caso.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-white">Aguardando revisão ({awaiting.length})</h2>
        <OcrReviewList items={awaiting} mode="review" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-white">Confirmadas recentemente ({confirmed.length})</h2>
        <OcrReviewList items={confirmed} mode="readonly" />
      </section>
    </div>
  );
}
