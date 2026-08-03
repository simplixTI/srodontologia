'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/utils';

export function WhatsAppFloat() {
  return (
    <motion.a
      initial={{ opacity: 0, scale: 0.6, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      href={whatsappLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="group fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full md:h-16 md:w-16"
    >
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#F0DEA9] via-[#C9A24B] to-[#8E6B2A] opacity-90 shadow-[0_20px_50px_-10px_rgba(201,162,75,0.55)] transition-transform duration-500 group-hover:scale-105" />
      <span className="absolute inset-0 animate-pulse-gold rounded-full" />
      <MessageCircle
        className="relative h-6 w-6 text-black md:h-7 md:w-7"
        strokeWidth={1.75}
      />
      <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-full border border-gold/30 bg-black/80 px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-white/90 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 md:block md:opacity-0">
        Falar no WhatsApp
      </span>
    </motion.a>
  );
}
