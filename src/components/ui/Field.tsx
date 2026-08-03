'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactElement;
  htmlFor?: string;
};

export function Field({ label, hint, error, children, htmlFor }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[0.65rem] uppercase tracking-[0.28em] text-white/60"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
      {error && <p className="text-xs text-rose-300/90">{error}</p>}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white placeholder-white/30 backdrop-blur',
          'transition focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...rest}
      />
    );
  }
);

type SubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  children: React.ReactNode;
};
export function Submit({ pending, children, className, ...rest }: SubmitProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'btn-gold relative inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[0.75rem] uppercase tracking-[0.24em] disabled:cursor-not-allowed disabled:opacity-70',
        className
      )}
      {...rest}
    >
      {pending ? 'Processando...' : children}
    </button>
  );
}
