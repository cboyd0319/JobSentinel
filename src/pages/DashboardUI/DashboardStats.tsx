// Dashboard Statistics Cards Component
// Displays total jobs, high matches, and average score

import { memo } from "react";
import { Card, ScoreDisplay } from "../../components";
import { BriefcaseIcon, StarIcon } from "../DashboardIcons";
import type { Statistics } from "../DashboardTypes";

interface DashboardStatsProps {
  statistics: Statistics;
}

export const DashboardStats = memo(function DashboardStats({ statistics }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-children">
      {/* Total Jobs */}
      <Card className="relative overflow-hidden dark:bg-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Total Jobs</p>
            <p className="font-display text-display-xl text-surface-900 dark:text-white">
              {statistics.total_jobs.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-sentinel-50 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
            <BriefcaseIcon className="w-6 h-6 text-sentinel-500" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sentinel-400 to-sentinel-500" />
      </Card>

      {/* High Matches */}
      <Card className="relative overflow-hidden dark:bg-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">High Matches</p>
            <p className="font-display text-display-xl text-alert-600 dark:text-alert-400">
              {statistics.high_matches.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-alert-50 dark:bg-alert-900/30 rounded-lg flex items-center justify-center">
            <StarIcon className="w-6 h-6 text-alert-500" />
          </div>
        </div>
        {statistics.high_matches > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-alert-400 to-alert-500" />
        )}
      </Card>

      {/* Average Score */}
      <Card className="relative overflow-hidden dark:bg-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Avg Score</p>
            <p className="font-mono text-display-xl text-surface-900 dark:text-white">
              {Math.round((statistics.average_score ?? 0) * 100)}%
            </p>
          </div>
          <ScoreDisplay score={statistics.average_score ?? 0} size="md" showLabel={false} animate={false} />
        </div>
      </Card>
    </div>
  );
});
