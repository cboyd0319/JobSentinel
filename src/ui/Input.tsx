import { forwardRef, useId, memo } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Hide the label visually but keep it for screen readers */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(
  ({ label, hideLabel = false, error, hint, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const hasError = Boolean(error);
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={`block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 ${hideLabel ? "sr-only" : ""}`}>
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            className={`
              w-full px-4 py-3 bg-white dark:bg-surface-800 border rounded-lg
              text-surface-800 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500
              transition-all duration-150
              hover:border-surface-300 dark:hover:border-surface-600
              focus:outline-none focus:border-sentinel-400 focus-visible:ring-2 focus-visible:ring-sentinel-100 dark:focus-visible:ring-sentinel-900
              disabled:bg-surface-50 dark:disabled:bg-surface-900 disabled:text-surface-500 disabled:cursor-not-allowed
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${hasError
                ? "border-danger focus:border-danger focus:ring-danger/20"
                : "border-surface-200 dark:border-surface-700"
              }
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-danger flex items-center gap-1">
            <ErrorIcon />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">{hint}</p>
        )}
      </div>
    );
  }
));

Input.displayName = "Input";

function ErrorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
