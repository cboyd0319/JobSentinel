import { lazy, Suspense } from "react";
import ComponentErrorBoundary from "../../../components/ComponentErrorBoundary";
import { WidgetSkeleton } from "../../../components/LoadingFallbacks";

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
