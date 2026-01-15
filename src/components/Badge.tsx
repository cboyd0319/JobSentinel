interface BadgeProps {
  children: React.ReactNode;
  variant?: "sentinel" | "alert" | "surface" | "success" | "danger";
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles = {
  sentinel: "bg-sentinel-100 text-sentinel-700",
  alert: "bg-alert-100 text-alert-700",
  surface: "bg-surface-100 text-surface-600",
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-700",
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
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
