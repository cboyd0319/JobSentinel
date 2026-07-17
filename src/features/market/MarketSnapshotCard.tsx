import { memo, type ReactNode } from "react";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { formatCurrency } from "../../shared/currencyFormatting";
import type { MarketSnapshot } from "./model";
import {
  MarketIconView,
  type MarketIcon,
} from "./MarketPrimitives";

interface MarketSnapshotCardProps {
  snapshot: MarketSnapshot | null;
  loading?: boolean;
  emptyMessage?: string;
}

type SnapshotIconName = Exclude<MarketIcon, "chart" | "bell">;
type OutlookConfig = { icon: SnapshotIconName; color: string; label: string };

// Lookup objects for hiring outlook styling.
const DEFAULT_OUTLOOK: OutlookConfig = {
  icon: "trend-flat",
  color: "text-surface-600 dark:text-surface-400",
  label: "Steady",
};

const OUTLOOK_CONFIG: Record<string, OutlookConfig> = {
  bullish: { icon: "trend-up", color: "text-green-600 dark:text-green-400", label: "More active" },
  bearish: { icon: "trend-down", color: "text-red-600 dark:text-red-400", label: "Slower" },
  neutral: DEFAULT_OUTLOOK,
};

const getOutlookConfig = (sentiment: string | undefined | null) =>
  OUTLOOK_CONFIG[(sentiment ?? "neutral").toLowerCase()] ?? DEFAULT_OUTLOOK;

function BadgeContent({ icon, children }: { icon: SnapshotIconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <MarketIconView icon={icon} />
      <span>{children}</span>
    </span>
  );
}

export const MarketSnapshotCard = memo(function MarketSnapshotCard({
  snapshot,
  loading = false,
  emptyMessage = "No hiring trends snapshot yet. Refresh hiring trends to create one.",
}: MarketSnapshotCardProps) {
  if (loading) {
    return (
      <Card className="dark:bg-surface-800 animate-pulse" role="status" aria-busy="true" aria-label="Loading hiring trends snapshot">
        <div className="h-24 bg-surface-200 dark:bg-surface-700 rounded" aria-hidden="true" />
      </Card>
    );
  }

  if (!snapshot || (snapshot.total_jobs ?? 0) <= 0) {
    return (
      <Card className="dark:bg-surface-800" role="status">
        <p className="text-center text-surface-500 dark:text-surface-400 py-6">
          {emptyMessage}
        </p>
      </Card>
    );
  }

  const outlookConfig = getOutlookConfig(snapshot.market_sentiment);

  return (
    <Card className="dark:bg-surface-800" role="region" aria-label="Hiring trends snapshot">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main stats */}
        <div className="flex flex-wrap gap-6" role="list" aria-label="Hiring trend statistics">
          <div role="listitem">
            <p className="text-2xl font-bold text-surface-900 dark:text-white" aria-label={`${(snapshot.total_jobs ?? 0).toLocaleString()} total jobs`}>
              {(snapshot.total_jobs ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Total Jobs</p>
          </div>
          <div role="listitem">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400" aria-label={`${(snapshot.new_jobs_today ?? 0).toLocaleString()} new jobs today`}>
              +{(snapshot.new_jobs_today ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">New Today</p>
          </div>
          <div role="listitem">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" aria-label={`${(snapshot.remote_job_percentage ?? 0).toFixed(0)} percent remote jobs`}>
              {(snapshot.remote_job_percentage ?? 0).toFixed(0)}%
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Remote</p>
          </div>
          <div role="listitem">
            <p className="text-2xl font-bold text-surface-900 dark:text-white" aria-label={`Median salary ${formatCurrency(snapshot.median_salary)}`}>
              {formatCurrency(snapshot.median_salary)}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Median Salary</p>
          </div>
        </div>

        {/* Hiring outlook */}
        <div className="text-right" role="status" aria-label={`Hiring outlook: ${outlookConfig.label}`}>
          <span className={`inline-flex items-center justify-end gap-2 text-2xl ${outlookConfig.color}`} aria-hidden="true">
            <MarketIconView icon={outlookConfig.icon} className="h-6 w-6" />
            <span>{outlookConfig.label}</span>
          </span>
          <p className="text-sm text-surface-500 dark:text-surface-400">Hiring Outlook</p>
        </div>
      </div>

      {/* Top badges */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700" role="list" aria-label="Market highlights">
        {snapshot.top_skill && (
          <Badge variant="sentinel" role="listitem">
            <BadgeContent icon="tool">Top Skill: {snapshot.top_skill}</BadgeContent>
          </Badge>
        )}
        {snapshot.top_company && (
          <Badge variant="surface" role="listitem">
            <BadgeContent icon="building">Top Company: {snapshot.top_company}</BadgeContent>
          </Badge>
        )}
        {snapshot.top_location && (
          <Badge variant="surface" role="listitem">
            <BadgeContent icon="location">Top Location: {snapshot.top_location}</BadgeContent>
          </Badge>
        )}
        {snapshot.total_companies_hiring != null && (
          <Badge variant="surface" role="listitem">
            <BadgeContent icon="factory">
              {snapshot.total_companies_hiring.toLocaleString()} Companies Hiring
            </BadgeContent>
          </Badge>
        )}
      </div>
    </Card>
  );
});
