'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

type Variant = 'gold' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  as?: 'button' | 'a';
  href?: string;
  target?: string;
  rel?: string;
  icon?: boolean;
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[0.72rem] tracking-[0.2em]',
  md: 'h-12 px-6 text-[0.75rem] tracking-[0.22em]',
  lg: 'h-14 px-8 text-[0.8rem] tracking-[0.24em]'
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'gold',
    size = 'md',
    className,
    children,
    as = 'button',
    href,
    target,
    rel,
    icon = true,
    ...rest
  },
  ref
) {
  const base = cn(
    'group relative inline-flex items-center justify-center gap-3 rounded-full font-medium uppercase transition-all duration-500',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    sizes[size],
    variant === 'gold' && 'btn-gold text-black',
    variant === 'ghost' && 'btn-ghost',
    variant === 'quiet' &&
      'text-white/70 hover:text-gold-100 border border-transparent hover:border-gold/30',
    className
  );

  const inner = (
    <>
      <span className="relative z-10">{children}</span>
      {icon && (
        <ArrowUpRight
          className="relative z-10 h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={1.5}
        />
      )}
    </>
  );

  if (as === 'a' || href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={base}
        // @ts-expect-error anchor forwarding
        ref={ref}
      >
        {inner}
      </a>
    );
  }

  return (
    <button ref={ref} className={base} {...rest}>
      {inner}
    </button>
  );
});
