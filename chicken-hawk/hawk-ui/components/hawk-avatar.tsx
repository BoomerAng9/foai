import Image from 'next/image';
import { cn } from '@/lib/utils';

export function HawkAvatar({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/chicken-hawk.svg"
      alt="Chicken Hawk"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full', className)}
    />
  );
}
