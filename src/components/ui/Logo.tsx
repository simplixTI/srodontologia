import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  width?: number;
  priority?: boolean;
};

export function LogoLockup({ className, width = 140, priority }: Props) {
  return (
    <Image
      src="/Logo.png"
      alt="SR Digital — Planning · Design · Manufacturing"
      width={width}
      height={Math.round(width * (726 / 1077))}
      priority={priority}
      className={cn('h-auto w-auto select-none', className)}
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
  return (
    <Image
      src="/Logo.png"
      alt="SR Digital"
      width={size}
      height={Math.round(size * (726 / 1077))}
      className={cn('h-auto w-auto select-none', className)}
    />
  );
}
