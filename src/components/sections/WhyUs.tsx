'use client';

import { motion } from 'framer-motion';
import {
  Stethoscope,
  Workflow,
  Target,
  LifeBuoy,
  type LucideIcon
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

type Card = {
  icon: LucideIcon;
  title: string;
  description: string;
  index: string;
};

const cards: Card[] = [
  {
    icon: Stethoscope,
    title: 'Planejamento Clínico Especializado',
    description:
      'Cada caso é analisado por dentistas, implantodontistas e protesistas — estratégia antes da execução.',
    index: '01'
  },
  {
    icon: Workflow,
    title: 'Fluxo 100% Digital',
    description:
      'Escaneamento, planejamento, CAD/CAM, impressão 3D e fresagem integrados em um único fluxo.',
    index: '02'
  },
  {
    icon: Target,
    title: 'Máxima Precisão',
    description:
      'Tecnologia de ponta com controle micrométrico para reduzir ajustes clínicos e retrabalhos.',
    index: '03'
  },
  {
    icon: LifeBuoy,
    title: 'Suporte ao Dentista',
    description:
      'Acompanhamento técnico do planejamento cirúrgico até a instalação da prótese definitiva.',
    index: '04'
  }
];

export function WhyUs() {
  return (
    <section
      id="diferenciais"
      className="relative overflow-hidden py-32 md:py-40"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-40 h-80 w-80 rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-24">
          <div>
            <SectionHeader
              number="[ 01 ]"
              eyebrow="Por que a SR Digital"
              title={
                <>
                  Estratégia antes da{' '}
                  <span className="gold-text">execução.</span>
                </>
              }
              description={
                <>
                  Cada caso começa com estratégia, termina com precisão. Não
                  entregamos apenas próteses — entregamos previsibilidade
                  clínica ponta a ponta.
                </>
              }
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {cards.map((card, i) => (
              <WhyCard key={card.title} card={card} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyCard({ card, index }: { card: Card; index: number }) {
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        delay: index * 0.12,
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="group relative overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-8 card-hover"
    >
      {/* Corner index */}
      <div className="absolute right-6 top-6 font-display text-sm text-white/25 transition-colors group-hover:text-gold-300">
        {card.index}
      </div>

      {/* Icon */}
      <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/20 bg-gold/[0.04]">
        <Icon className="h-5 w-5 text-gold-200" strokeWidth={1.4} />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gold/10 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      <h3 className="mt-8 font-display text-2xl leading-tight text-white">
        {card.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        {card.description}
      </p>

      {/* Bottom gold sweep */}
      <div className="mt-8 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-gold-300 to-transparent transition-transform duration-700 group-hover:scale-x-100" />
    </motion.div>
  );
}
