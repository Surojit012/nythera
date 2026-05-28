type SuccessMotionProps = {
  label?: string;
  detail?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClass = {
  sm: 'h-6 w-6 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};

const iconSize = {
  sm: 13,
  md: 17,
  lg: 22,
};

export default function SuccessMotion({
  label,
  detail,
  size = 'md',
  className = '',
}: SuccessMotionProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`ny-success-mark shrink-0 ${sizeClass[size]}`} aria-hidden="true">
        <svg
          width={iconSize[size]}
          height={iconSize[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {(label || detail) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {detail && <span className="mt-0.5 block text-xs leading-5 text-ink/50">{detail}</span>}
        </span>
      )}
    </div>
  );
}
