import { cn } from '@/lib/utils';

export function LogoMark({
  className,
  size = 40
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="goldGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#F7ECCF" />
          <stop offset="30%" stopColor="#F0DEA9" />
          <stop offset="60%" stopColor="#C9A24B" />
          <stop offset="100%" stopColor="#6B5020" />
        </linearGradient>
      </defs>
      {/* Frame arc */}
      <path
        d="M60 8 A52 52 0 1 1 59.9 8"
        stroke="url(#goldGrad)"
        strokeWidth="1"
        fill="none"
        opacity="0.35"
      />
      {/* S */}
      <path
        d="M52 38 Q40 38 40 50 Q40 60 52 60 Q64 60 64 70 Q64 82 52 82"
        stroke="url(#goldGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* R */}
      <path
        d="M68 38 L68 82 M68 38 L78 38 Q86 38 86 48 Q86 58 78 58 L68 58 M78 58 L86 82"
        stroke="url(#goldGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Divider dot */}
      <circle cx="60" cy="92" r="1.8" fill="url(#goldGrad)" />
      {/* Underscore */}
      <line
        x1="42"
        y1="98"
        x2="78"
        y2="98"
        stroke="url(#goldGrad)"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark size={36} />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg tracking-[0.22em] text-white">
          SR <span className="gold-text">DIGITAL</span>
        </span>
        <span className="mt-1 text-[0.55rem] tracking-[0.4em] text-white/40">
          DIGITAL · IMPLANT · CENTER
        </span>
      </div>
    </div>
  );
}
