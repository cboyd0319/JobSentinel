interface BadgeProps {
  children: React.ReactNode;
  variant?: "sentinel" | "alert" | "surface" | "success" | "danger";
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantStyles = {
  sentinel: "bg-sentinel-100 dark:bg-sentinel-900/30 text-sentinel-700 dark:text-sentinel-400",
  alert: "bg-alert-100 dark:bg-alert-900/30 text-alert-700 dark:text-alert-400",
  surface: "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300",
  success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  danger: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({
  children,
  variant = "surface",
  size = "md",
  removable = false,
  onRemove,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
