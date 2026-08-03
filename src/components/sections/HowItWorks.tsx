'use client';

import { motion } from 'framer-motion';
import {
  Inbox,
  Cpu,
  MessagesSquare,
  Printer,
  ShieldCheck,
  Package,
  type LucideIcon
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
  meta: string;
};

const steps: Step[] = [
  {
    icon: Inbox,
    title: 'Recebimento do Caso',
    description:
      'Recebimento do arquivo intraoral, exames e briefing clínico para análise inicial.',
    meta: 'Escaneamento / Fotos / Tomografia'
  },
  {
    icon: Cpu,
    title: 'Planejamento Digital',
    description:
      'Planejamento reverso do caso em softwares especializados por implantodontistas e protesistas.',
    meta: 'Software CAD · Planejamento Guiado'
  },
  {
    icon: MessagesSquare,
    title: 'Discussão Técnica',
    description:
      'Alinhamento técnico com o dentista antes de qualquer produção — decisões compartilhadas.',
    meta: 'Videochamada · Chat técnico'
  },
  {
    icon: Printer,
    title: 'Produção CAD/CAM',
    description:
      'Fresagem e impressão 3D com controle micrométrico. Materiais premium e ajuste passivo.',
    meta: 'Fresagem · Impressão 3D · Sinterização'
  },
  {
    icon: ShieldCheck,
    title: 'Controle de Qualidade',
    description:
      'Conferência dimensional e estética antes da entrega. Zero surpresa na cadeira.',
    meta: 'Métrica óptica · Provas técnicas'
  },
  {
    icon: Package,
    title: 'Entrega ao Dentista',
    description:
      'Entrega com relatório do caso, instruções de instalação e suporte contínuo.',
    meta: 'Dossiê digital · Suporte pós-entrega'
  }
];

export function HowItWorks() {
  return (
    <section
      id="processo"
      className="relative overflow-hidden py-32 md:py-40"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-gold/[0.06] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader
          number="[ 02 ]"
          eyebrow="Como funciona"
          align="center"
          title={
            <>
              Do briefing ao <span className="gold-text">resultado final.</span>
            </>
          }
          description="Um fluxo cadenciado, transparente e cadenciado — sem retrabalhos, sem surpresas."
        />

        <div className="relative mt-24">
          {/* Timeline vertical center line — desktop */}
          <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gold/40 to-transparent md:block" />

          <div className="flex flex-col gap-16 md:gap-24">
            {steps.map((step, i) => (
              <Step step={step} index={i} key={step.title} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  const isRight = index % 2 === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_1fr]"
    >
      {/* Left content */}
      <div className={`${isRight ? 'md:order-3 md:text-left' : 'md:text-right'}`}>
        <div className={`inline-flex items-center gap-3 ${isRight ? '' : 'md:flex-row-reverse'}`}>
          <span className="font-display text-4xl text-white/20">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="h-px w-10 bg-gold/50" />
          <span className="eyebrow">{step.meta}</span>
        </div>
        <h3 className="mt-4 font-display text-3xl leading-tight text-white md:text-4xl">
          {step.title}
        </h3>
        <p className={`mt-4 max-w-md text-white/60 ${isRight ? '' : 'md:ml-auto'}`}>
          {step.description}
        </p>
      </div>

      {/* Center node */}
      <div className="relative md:order-2">
        <motion.div
          whileInView={{ scale: [0.6, 1.1, 1], opacity: [0, 1, 1] }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-black/80 shadow-[0_0_60px_-20px_rgba(201,162,75,0.6)] backdrop-blur md:h-24 md:w-24"
        >
          <div className="absolute inset-1 rounded-full border border-gold/20" />
          <Icon
            className="h-6 w-6 text-gold-100 md:h-7 md:w-7"
            strokeWidth={1.4}
          />
          {/* Pulse */}
          <span className="absolute inset-0 rounded-full border border-gold/40 opacity-70 animate-pulse-gold" />
        </motion.div>
      </div>

      {/* Right empty spacer to keep alignment on desktop */}
      <div className={`${isRight ? 'md:order-1' : 'md:order-3'}`} />
    </motion.div>
  );
}
