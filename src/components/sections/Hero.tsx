'use client';

import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { whatsappLink } from '@/lib/utils';

const capabilities = [
  'CAD/CAM',
  'Cirurgia Guiada',
  'Impressão 3D',
  'Escaneamento Intraoral',
  'Fresagem'
];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.15]);
  const imgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative overflow-hidden pt-32 md:pt-36 lg:pt-40"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(201,162,75,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_85%_20%,rgba(201,162,75,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-black" />

        {/* Floating particles */}
        {!reduce &&
          Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-gold/40"
              style={{
                left: `${(i * 47) % 100}%`,
                top: `${(i * 33) % 100}%`
              }}
              animate={{ y: [0, -18, 0], opacity: [0.15, 0.7, 0.15] }}
              transition={{
                duration: 5 + (i % 4),
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'easeInOut'
              }}
            />
          ))}
      </div>

      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto grid w-full max-w-7xl grid-cols-12 gap-8 px-6 pb-24 md:px-10 md:pb-32 lg:gap-14"
      >
        {/* ─── Left: editorial copy ─── */}
        <div className="col-span-12 flex flex-col lg:col-span-7">
          {/* Eyebrow with rule */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.9 }}
            className="flex items-center gap-4"
          >
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/70" />
            <span className="text-[0.6rem] uppercase tracking-[0.42em] text-gold-100">
              Digital Implant Center
            </span>
            <span className="hidden text-[0.55rem] uppercase tracking-[0.35em] text-white/40 md:inline">
              · Belo Horizonte · MG
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="mt-10 font-display text-[3.25rem] font-light leading-[0.95] tracking-[-0.035em] text-white sm:text-[4.2rem] md:text-[5rem] lg:text-[6.2rem] xl:text-[7rem]">
            <LineReveal delay={0.35}>Mais do que</LineReveal>
            <LineReveal delay={0.5}>
              <span className="text-white/70">próteses.</span>
            </LineReveal>
            <LineReveal delay={0.7}>
              <span className="gold-text italic">Planejamos</span>
            </LineReveal>
            <LineReveal delay={0.85}>
              <span className="gold-text italic">resultados.</span>
            </LineReveal>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.9 }}
            className="mt-10 max-w-xl text-base leading-relaxed text-white/60 md:text-lg"
          >
            Um Digital Implant Center especializado em reabilitações
            implantossuportadas. Planejamento clínico, CAD/CAM, impressão 3D
            e fresagem em um único fluxo — para casos previsíveis do briefing
            à entrega definitiva.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.9 }}
            className="mt-12 flex flex-col gap-4 sm:flex-row"
          >
            <Button
              as="a"
              href={whatsappLink(
                'Olá SR Digital, quero agendar uma apresentação para conhecer o fluxo digital.'
              )}
              target="_blank"
              rel="noreferrer"
              size="lg"
              variant="gold"
            >
              Agendar Apresentação
            </Button>
            <Button
              as="a"
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              size="lg"
              variant="ghost"
            >
              Falar no WhatsApp
            </Button>
          </motion.div>

          {/* Capability strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="mt-14 flex items-center gap-4"
          >
            <span className="text-[0.6rem] uppercase tracking-[0.4em] text-white/40 shrink-0">
              Fluxo 100% Digital
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
            className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/55"
          >
            {capabilities.map((c) => (
              <span key={c} className="inline-flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gold/60" />
                {c}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ─── Right: portrait editorial ─── */}
        <div className="col-span-12 lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-[420px] lg:max-w-none"
          >
            {/* Frame */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-gold/25">
              {/* Layered gold glow behind */}
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_50%_30%,rgba(201,162,75,0.4),transparent_70%)] blur-2xl" />

              <motion.div
                style={{ y: imgY }}
                className="absolute inset-0"
              >
                <Image
                  src="/draThainara.png"
                  alt="Dra. Thainara Salgueiro — Responsável Técnica"
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover object-top"
                />
              </motion.div>

              {/* Vignette + tint */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,75,0.14),transparent_50%)] mix-blend-overlay" />

              {/* Inner gold hairline */}
              <div className="pointer-events-none absolute inset-3 rounded-[22px] ring-1 ring-gold/15" />

              {/* Corner marks */}
              <CornerMark className="left-4 top-4" />
              <CornerMark className="right-4 top-4 rotate-90" />
              <CornerMark className="left-4 bottom-4 -rotate-90" />
              <CornerMark className="right-4 bottom-4 rotate-180" />

              {/* Bottom credential badge */}
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100/90">
                    Responsável Técnica
                  </div>
                  <div className="mt-1 font-display text-lg leading-tight text-white">
                    Dra. Thainara Salgueiro
                  </div>
                  <div className="text-[0.6rem] tracking-[0.3em] text-white/60">
                    CRO-MG 40.844
                  </div>
                </div>
                <div className="rounded-full border border-gold/30 bg-black/40 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.3em] text-gold-100 backdrop-blur">
                  Est. 2015
                </div>
              </div>
            </div>

            {/* Floating stat card */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 1.1,
                duration: 1,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="glass-strong absolute -left-4 top-14 hidden w-52 -rotate-2 rounded-2xl p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] md:block lg:-left-10"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[0.55rem] uppercase tracking-[0.35em] text-white/60">
                  Ativo · 24/7
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="stat-number font-display text-4xl leading-none text-white">
                  500
                </span>
                <span className="gold-text font-display text-2xl">+</span>
              </div>
              <div className="mt-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
                Casos planejados
              </div>
            </motion.div>

            {/* Floating precision badge */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 1.25,
                duration: 1,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="glass-strong absolute -right-4 bottom-24 hidden w-44 rotate-2 rounded-2xl p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] md:block lg:-right-8"
            >
              <div className="text-[0.55rem] uppercase tracking-[0.35em] text-white/60">
                Precisão
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="stat-number font-display text-4xl leading-none text-white">
                  ±20
                </span>
                <span className="gold-text font-display text-lg">µm</span>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '92%' }}
                  transition={{ delay: 1.6, duration: 1.4, ease: 'easeOut' }}
                  className="h-full bg-gold-gradient"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function LineReveal({
  children,
  delay = 0
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ delay, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function CornerMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute h-4 w-4 border-l border-t border-gold-100/70 ${className}`}
    />
  );
}
