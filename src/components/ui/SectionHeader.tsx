'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  number?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
};

export function SectionHeader({
  eyebrow,
  number,
  title,
  description,
  align = 'left',
  className
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        align === 'center' && 'items-center text-center',
        className
      )}
    >
      {(eyebrow || number) && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'flex items-center gap-4',
            align === 'center' && 'justify-center'
          )}
        >
          {number && (
            <span className="font-display text-sm text-gold-300">
              {number}
            </span>
          )}
          <span className="h-px w-8 bg-gold/50" />
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-4xl leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className={cn(
            'max-w-2xl text-base leading-relaxed text-white/60 md:text-lg',
            align === 'center' && 'mx-auto'
          )}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
