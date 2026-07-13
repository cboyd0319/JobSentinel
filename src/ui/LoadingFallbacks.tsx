import { memo } from "react";
import { Card } from "./Card";
import { LoadingSpinner } from "./LoadingSpinner";

/**
 * Loading fallbacks for lazy-loaded components
 * Simple, lightweight skeletons to show while code is being loaded
 */

export const ChartSkeleton = memo(function ChartSkeleton() {
  return (
    <Card className="dark:bg-surface-800">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-32 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="h-64 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    </Card>
  );
});

export const ModalSkeleton = memo(function ModalSkeleton() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl dark:bg-surface-800">
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          </div>
        </div>
      </Card>
    </div>
  );
});

export const PanelSkeleton = memo(function PanelSkeleton() {
  return (
    <Card className="dark:bg-surface-800 p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-surface-200 dark:bg-surface-700 rounded" />
          <div className="h-4 w-full bg-surface-200 dark:bg-surface-700 rounded" />
          <div className="h-4 w-2/3 bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
      </div>
    </Card>
  );
});

export const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
        <div className="p-6 space-y-6">
          <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-surface-200 dark:bg-surface-700 rounded animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
        </div>
      </Card>
    </div>
  );
});

export const WidgetSkeleton = memo(function WidgetSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
      <div className="h-80 bg-surface-100 dark:bg-surface-800 rounded-lg" />
      <div className="h-80 bg-surface-100 dark:bg-surface-800 rounded-lg" />
    </div>
  );
});

export const SettingsSkeleton = memo(function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-64 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-32 bg-surface-200 dark:bg-surface-700 rounded" />
              <div className="h-16 bg-surface-200 dark:bg-surface-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export const FormSkeleton = memo(function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded" />
          <div className="h-10 bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
      ))}
    </div>
  );
});

export const CompactLoadingSpinner = memo(function CompactLoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <LoadingSpinner message={message} delay={0} />
    </div>
  );
});
