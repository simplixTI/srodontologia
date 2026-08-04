'use client';

import { motion } from 'framer-motion';
import {
  Cpu,
  Layers3,
  Cog,
  Route,
  Braces,
  Boxes,
  type LucideIcon
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

type Tech = {
  icon: LucideIcon;
  title: string;
  description: string;
  spec: string;
};

const techs: Tech[] = [
  {
    icon: Cpu,
    title: 'CAD/CAM',
    description:
      'Modelagem e produção assistidas por computador para próteses com ajuste passivo.',
    spec: 'Design paramétrico'
  },
  {
    icon: Layers3,
    title: 'Impressão 3D de Alta Performance',
    description:
      'Impressoras Formlabs e SprintRay, referências mundiais em odontologia digital, para produzir modelos, guias cirúrgicos e próteses provisórias com alta precisão.',
    spec: 'Formlabs · SprintRay'
  },
  {
    icon: Cog,
    title: 'Fresagem 5 eixos',
    description:
      'Tecnologia de fresagem em 5 eixos para manufatura de diversos materiais odontológicos, incluindo zircônia, PMMA, dissilicato de lítio, metal, cera e Zantex® — garantindo precisão e excelente acabamento.',
    spec: 'Precisão ±20 µm'
  },
  {
    icon: Route,
    title: 'Planejamento Guiado',
    description:
      'Cirurgias planejadas virtualmente e transferidas com guias impressos personalizados.',
    spec: 'Full-guide / mini-guide'
  },
  {
    icon: Braces,
    title: 'Softwares Especializados',
    description:
      'Ecossistema integrado com os principais softwares de planejamento cirúrgico e protético.',
    spec: 'exocad · implant studio · exoplan'
  },
  {
    icon: Boxes,
    title: 'Modelagem Digital',
    description:
      'Bibliotecas oficiais dos principais sistemas de implantes do mercado.',
    spec: 'Compatibilidade multi-sistema'
  }
];

export function Technology() {
  return (
    <section
      id="tecnologia"
      className="relative overflow-hidden py-32 md:py-40"
    >
      {/* Background beams */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(600px_400px_at_50%_0%,rgba(201,162,75,0.08),transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            number="[ 03 ]"
            eyebrow="Tecnologia"
            title={
              <>
                Engenharia digital <br />
                <span className="gold-text">aplicada à clínica.</span>
              </>
            }
          />
          <p className="max-w-md text-white/60">
            Tecnologia que transforma planejamento em previsibilidade
            clínica — do arquivo digital à peça entregue na cadeira.
          </p>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {techs.map((tech, i) => (
            <TechCard tech={tech} index={i} key={tech.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TechCard({ tech, index }: { tech: Tech; index: number }) {
  const Icon = tech.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        delay: (index % 3) * 0.08 + Math.floor(index / 3) * 0.15,
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="group relative overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 card-hover"
    >
      {/* Glow orb */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.08] to-transparent">
          <Icon
            className="h-5 w-5 text-gold-100 transition-transform duration-500 group-hover:scale-110"
            strokeWidth={1.4}
          />
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
          {renderSpec(tech.spec)}
        </span>
      </div>

      <h3 className="mt-8 font-display text-2xl leading-snug text-white">
        {tech.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        {tech.description}
      </p>

      <div className="mt-8 flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-300/80">
        <span className="h-px w-8 bg-gold/60" />
        Padrão SR
      </div>
    </motion.article>
  );
}

// The CSS `text-transform: uppercase` maps µ (U+00B5) → Μ (Greek Mu), which
// renders visually as "M" — turning "µm" into "MM". We split the string and
// re-render the µm portion with `normal-case` to preserve it as intended.
function renderSpec(spec: string): React.ReactNode {
  const parts = spec.split(/(µm)/g);
  return parts.map((p, i) =>
    p === 'µm' ? (
      <span key={i} className="normal-case">
        µm
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
