import Image from 'next/image';
import { cn } from '@/lib/utils';

// Master logo file is 1077 × 726 px
const LOGO_ASPECT = 726 / 1077;

type Props = {
  className?: string;
  width?: number;
  priority?: boolean;
};

export function LogoLockup({ className, width = 140, priority }: Props) {
  const height = Math.round(width * LOGO_ASPECT);
  return (
    <Image
      src="/Logo.png"
      alt="SR Digital — Planning · Design · Manufacturing"
      width={width}
      height={height}
      priority={priority}
      style={{ width, height }}
      className={cn('block select-none object-contain', className)}
    />
  );
}

export function LogoCompact({
  className,
  size = 48
}: {
  className?: string;
  size?: number;
}) {
  const height = Math.round(size * LOGO_ASPECT);
  return (
    <Image
      src="/Logo.png"
      alt="SR Digital"
      width={size}
      height={height}
      style={{ width: size, height }}
      className={cn('block select-none object-contain', className)}
    />
  );
}
