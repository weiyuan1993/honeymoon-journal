type InlineSpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface InlineSpinnerProps {
  label?: string;
  size?: InlineSpinnerSize;
  className?: string;
  spinnerClassName?: string;
}

const sizeClasses: Record<InlineSpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-2',
};

export default function InlineSpinner({
  label,
  size = 'sm',
  className = '',
  spinnerClassName = '',
}: InlineSpinnerProps) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 ${className}`}
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
    >
      <span
        aria-hidden="true"
        className={`${sizeClasses[size]} shrink-0 animate-spin rounded-full border-current/25 border-t-current ${spinnerClassName}`}
      />
      {label && <span>{label}</span>}
    </span>
  );
}
