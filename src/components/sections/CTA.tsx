'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { whatsappLink } from '@/lib/utils';

export function CTA() {
  return (
    <section className="relative overflow-hidden py-32 md:py-40">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_50%_100%,rgba(201,162,75,0.18),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          style={{
            backgroundImage:
              'radial-gradient(600px 300px at 20% 40%, rgba(201,162,75,0.08), transparent 60%), radial-gradient(400px 200px at 80% 60%, rgba(201,162,75,0.06), transparent 60%)'
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/[0.06] px-4 py-1.5 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold-300" />
          <span className="text-[0.6rem] uppercase tracking-[0.35em] text-gold-100">
            Aceitamos novos parceiros
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 font-display text-5xl leading-[1.05] tracking-tight text-white md:text-7xl lg:text-[5.5rem]"
        >
          Vamos planejar seu <br />
          <span className="gold-text">próximo caso?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.9 }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/60"
        >
          Conheça como a SR Digital pode elevar a previsibilidade dos seus
          tratamentos. Uma apresentação técnica revela o fluxo completo — do
          escaneamento à entrega definitiva.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.9 }}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button
            as="a"
            href={whatsappLink(
              'Olá SR Digital, gostaria de solicitar uma apresentação técnica.'
            )}
            target="_blank"
            rel="noreferrer"
            size="lg"
            variant="gold"
          >
            Solicitar Apresentação
          </Button>
          <Button
            as="a"
            href={whatsappLink()}
            target="_blank"
            rel="noreferrer"
            size="lg"
            variant="ghost"
            icon={false}
          >
            Falar no WhatsApp
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 1 }}
          className="mt-16 flex flex-col items-center gap-3"
        >
          <div className="h-8 w-px bg-gradient-to-b from-gold/60 to-transparent" />
          <span className="text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
            Seu parceiro em Implantodontia Digital
          </span>
        </motion.div>
      </div>
    </section>
  );
}
