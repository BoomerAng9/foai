import styles from './BoomerangLoader.module.css';

type LoaderSize = 'sm' | 'md' | 'lg' | 'xl';
type LoaderLayout = 'inline' | 'page' | 'screen';

interface BoomerangLoaderProps {
  label?: string;
  size?: LoaderSize;
  layout?: LoaderLayout;
  className?: string;
  labelClassName?: string;
}

const SIZE_CLASS: Record<LoaderSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

const LAYOUT_CLASS: Record<LoaderLayout, string> = {
  inline: styles.inline,
  page: styles.page,
  screen: styles.screen,
};

function joinClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function BoomerangLoader({
  label = 'Loading...',
  size = 'md',
  layout = 'page',
  className,
  labelClassName,
}: BoomerangLoaderProps) {
  return (
    <div className={joinClasses(styles.root, LAYOUT_CLASS[layout], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/boomer-ang-loader.png"
        alt=""
        className={joinClasses(styles.image, SIZE_CLASS[size])}
      />
      {label ? (
        <span className={joinClasses(styles.label, labelClassName)}>{label}</span>
      ) : null}
    </div>
  );
}