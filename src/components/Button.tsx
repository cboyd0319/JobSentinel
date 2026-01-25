import { forwardRef, memo } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  /** Custom loading text (defaults to "Loading...") */
  loadingText?: string;
  children: React.ReactNode;
}

const variantStyles = {
  primary: "bg-sentinel-500 text-white hover:bg-sentinel-600 hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0 active:bg-sentinel-700 focus-visible:ring-sentinel-500",
  secondary: "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-600 hover:bg-surface-200 dark:hover:bg-surface-600 hover:border-surface-300 active:bg-surface-300 dark:active:bg-surface-500 focus-visible:ring-surface-400",
  ghost: "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-800 dark:hover:text-surface-200 active:bg-surface-200 dark:active:bg-surface-700",
  success: "bg-success text-white hover:bg-green-600 hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-success",
  danger: "bg-danger text-white hover:bg-red-600 hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-danger",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      loading = false,
      loadingText = "Loading...",
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={`
          inline-flex items-center justify-center font-semibold rounded-lg
          transition-all duration-200 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:pointer-events-none disabled:transform-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-live={loading ? "polite" : undefined}
        {...props}
      >
        {loading ? (
          <>
            <LoadingIcon className="animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </button>
    );
  }
));

Button.displayName = "Button";

function LoadingIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-4 h-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
