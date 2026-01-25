import { memo } from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton = memo(function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseStyles = "motion-safe:animate-pulse bg-surface-200 dark:bg-surface-700";

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
});

// Skeleton variants for common use cases
export const SkeletonCard = memo(function SkeletonCard() {
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
});

export const SkeletonJobCard = memo(function SkeletonJobCard() {
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
});

export const SkeletonStatCard = memo(function SkeletonStatCard() {
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
});

export const SkeletonJobList = memo(function SkeletonJobList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonJobCard key={i} />
      ))}
    </div>
  );
});

export const ResumeSkeleton = memo(function ResumeSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header skeleton */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="rounded" width={40} height={40} />
              <div>
                <Skeleton width={160} height={24} className="mb-2" />
                <Skeleton width={220} height={16} />
              </div>
            </div>
            <Skeleton variant="rounded" width={128} height={40} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Skills */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton width={128} height={24} />
                <Skeleton variant="rounded" width={96} height={32} />
              </div>
              {/* Skill filters skeleton */}
              <div className="flex gap-2 mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="rounded" width={80} height={28} />
                ))}
              </div>
              {/* Skills list skeleton */}
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="rounded" width={64} height={24} />
                        <Skeleton width={100} height={18} />
                      </div>
                      <Skeleton variant="rounded" width={80} height={24} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Match Results */}
          <div>
            <div className="bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700 p-6">
              <Skeleton width={160} height={24} className="mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Skeleton width="80%" height={18} className="mb-1" />
                        <Skeleton width="50%" height={14} />
                      </div>
                      <Skeleton variant="circular" width={40} height={40} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Skeleton variant="rounded" width={48} height={20} />
                      <Skeleton variant="rounded" width={56} height={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});

export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header skeleton */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="rounded" width={40} height={40} />
              <div>
                <Skeleton width={128} height={24} className="mb-2" />
                <Skeleton width={192} height={16} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton variant="rounded" width={96} height={32} />
              <Skeleton variant="rounded" width={40} height={40} />
              <Skeleton variant="rounded" width={112} height={40} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Navigation buttons skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </div>

        {/* Status card skeleton */}
        <div className="p-6 bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700 mb-8">
          <Skeleton width={128} height={20} className="mb-4" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton width={80} height={14} className="mb-2" />
                <Skeleton width={128} height={18} />
              </div>
            ))}
          </div>
        </div>

        {/* Jobs list skeleton */}
        <div className="mb-4">
          <Skeleton width={128} height={28} />
        </div>
        <SkeletonJobList count={5} />
      </main>
    </div>
  );
});
