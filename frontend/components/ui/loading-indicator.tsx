import { cn } from '@/lib/utils';

type LoadingIndicatorProps = {
  label?: string;
  className?: string;
  size?: 'md' | 'lg';
};

export function LoadingIndicator({ label, className, size = 'lg' }: LoadingIndicatorProps) {
  const spinnerSize = size === 'md' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className={cn('flex flex-col items-center gap-3 text-muted-foreground', className)}>
      <div
        className={cn(
          spinnerSize,
          'animate-spin rounded-full border-4 border-primary border-t-transparent'
        )}
      />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
