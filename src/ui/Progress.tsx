import { memo } from "react";

interface ProgressProps {
  value: number; // 0-100
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "sentinel" | "alert" | "success" | "danger";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

// Style constants (extracted to prevent re-creation on each render)
const SIZE_STYLES = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
} as const;

const VARIANT_STYLES = {
  sentinel: "bg-sentinel-500",
  alert: "bg-alert-500",
  success: "bg-success",
  danger: "bg-danger",
} as const;

export const Progress = memo(function Progress({
  value,
  max = 100,
  size = "md",
  variant = "sentinel",
  showLabel = false,
  animated = true,
  className = "",
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Progress
          </span>
          <span className="text-sm font-mono text-surface-600 dark:text-surface-400">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={`
          w-full bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden
          ${SIZE_STYLES[size]}
        `}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            h-full rounded-full
            ${VARIANT_STYLES[variant]}
            ${animated ? "transition-all duration-500 ease-out" : ""}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

// Indeterminate progress for loading states
export const ProgressIndeterminate = memo(function ProgressIndeterminate({
  size = "md",
  variant = "sentinel",
  className = "",
}: Pick<ProgressProps, "size" | "variant" | "className">) {
  return (
    <div
      className={`
        w-full bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden
        ${SIZE_STYLES[size]}
        ${className}
      `}
      role="progressbar"
      aria-busy="true"
    >
      <div
        className={`
          h-full w-1/3 rounded-full
          ${VARIANT_STYLES[variant]}
          animate-progress-indeterminate
        `}
      />
    </div>
  );
});
