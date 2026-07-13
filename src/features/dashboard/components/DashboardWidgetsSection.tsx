import { lazy, Suspense } from "react";
import ComponentErrorBoundary from "../errors/ComponentErrorBoundary";
import { WidgetSkeleton } from "../../../ui/LoadingFallbacks";

const DashboardWidgets = lazy(() =>
  import("./DashboardWidgets").then((module) => ({
    default: module.DashboardWidgets,
  })),
);

export function DashboardWidgetsSection() {
  return (
    <ComponentErrorBoundary componentName="DashboardWidgets" silentFail>
      <Suspense fallback={<WidgetSkeleton />}>
        <DashboardWidgets className="mb-6" />
      </Suspense>
    </ComponentErrorBoundary>
  );
}
