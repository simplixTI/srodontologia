'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

type CaseItem = {
  code: string;
  title: string;
  summary: string;
  tag: string;
  aspect: 'tall' | 'wide' | 'square';
};

const cases: CaseItem[] = [
  {
    code: 'Caso 001',
    title: 'Reabilitação total superior',
    summary: 'Protocolo full-arch com carga imediata.',
    tag: 'All-on-4',
    aspect: 'tall'
  },
  {
    code: 'Caso 002',
    title: 'Cirurgia guiada + prótese provisória',
    summary: 'Planejamento reverso com guia impresso.',
    tag: 'Cirurgia Guiada',
    aspect: 'wide'
  },
  {
    code: 'Caso 003',
    title: 'Coroa unitária estética',
    summary: 'Fresagem em dissilicato de lítio.',
    tag: 'Estética',
    aspect: 'square'
  },
  {
    code: 'Caso 004',
    title: 'Reabilitação inferior implanto-suportada',
    summary: 'Barra fresada em titânio grau 5.',
    tag: 'Barra CAD/CAM',
    aspect: 'wide'
  },
  {
    code: 'Caso 005',
    title: 'Provisório impresso 3D',
    summary: 'Prova estética antes do definitivo.',
    tag: 'Impressão 3D',
    aspect: 'square'
  },
  {
    code: 'Caso 006',
    title: 'Full contour zircônia',
    summary: 'Prótese monolítica em zircônia multicamadas.',
    tag: 'Zircônia',
    aspect: 'tall'
  }
];

const aspectClass: Record<CaseItem['aspect'], string> = {
  tall: 'aspect-[3/4] md:row-span-2',
  wide: 'aspect-[4/3]',
  square: 'aspect-square'
};

export function Cases() {
  return (
    <section
      id="casos"
      className="relative overflow-hidden py-32 md:py-40"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-[900px] -translate-x-1/2 rounded-full bg-gold/[0.05] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            number="[ 05 ]"
            eyebrow="Casos clínicos"
            title={
              <>
                Antes e depois — <br />
                <span className="gold-text">resultados que se veem.</span>
              </>
            }
          />
          <a
            href="#contato"
            className="group inline-flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.32em] text-white/70 transition hover:text-gold-100"
          >
            Solicitar portfólio completo
            <ArrowRight
              className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </a>
        </div>

        <div className="mt-16 grid auto-rows-[220px] grid-cols-1 gap-4 md:auto-rows-[260px] md:grid-cols-3">
          {cases.map((c, i) => (
            <CaseCard key={c.code} caseItem={c} index={i} />
          ))}
        </div>

        <p className="mt-12 text-center text-[0.7rem] uppercase tracking-[0.3em] text-white/40">
          Galeria em breve · Enviamos casos reais sob demanda
        </p>
      </div>
    </section>
  );
}

function CaseCard({
  caseItem,
  index
}: {
  caseItem: CaseItem;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        delay: (index % 3) * 0.08,
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={`group relative overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-transparent ${aspectClass[caseItem.aspect]}`}
    >
      {/* Placeholder pattern (until real images are added) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(201,162,75,0.14),transparent_60%)]" />
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 flex items-center justify-center opacity-30 transition-opacity duration-500 group-hover:opacity-60">
        <ImageIcon
          className="h-10 w-10 text-gold/60"
          strokeWidth={1}
        />
      </div>

      {/* Hover shine */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

      {/* Overlay content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-black/50 px-3 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-gold-100 backdrop-blur">
            {caseItem.tag}
          </span>
          <span className="font-display text-sm text-white/40">
            {caseItem.code}
          </span>
        </div>

        <div className="translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <h3 className="font-display text-xl leading-tight text-white md:text-2xl">
            {caseItem.title}
          </h3>
          <p className="mt-2 text-xs text-white/70">{caseItem.summary}</p>
        </div>
      </div>

      {/* Border shimmer */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent transition-all duration-500 group-hover:ring-gold/40" />
    </motion.div>
  );
}
