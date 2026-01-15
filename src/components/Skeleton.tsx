interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-surface-200 dark:bg-surface-700";

  const variantStyles = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-lg",
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === "circular" ? height : "100%"),
    height: height ?? (variant === "circular" ? width : undefined),
  };

  if (lines > 1 && variant === "text") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseStyles} ${variantStyles.text}`}
            style={{
              ...style,
              width: i === lines - 1 ? "75%" : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    />
  );
}

// Skeleton variants for common use cases
export function SkeletonCard() {
  return (
    <div className="p-6 bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700">
      <div className="flex gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton width="60%" height={20} className="mb-2" />
          <Skeleton width="40%" height={16} />
        </div>
      </div>
      <div className="mt-4">
        <Skeleton lines={3} />
      </div>
    </div>
  );
}

export function SkeletonJobCard() {
  return (
    <div className="p-5 bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700">
      <div className="flex gap-4">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="flex-1">
          <Skeleton width="70%" height={24} className="mb-2" />
          <Skeleton width="50%" height={18} className="mb-3" />
          <div className="flex gap-4">
            <Skeleton width={80} height={16} />
            <Skeleton width={60} height={16} />
            <Skeleton width={70} height={16} />
          </div>
        </div>
        <Skeleton variant="rounded" width={80} height={36} />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="p-6 bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton width={100} height={14} className="mb-2" />
          <Skeleton width={80} height={32} />
        </div>
        <Skeleton variant="rounded" width={48} height={48} />
      </div>
    </div>
  );
}
