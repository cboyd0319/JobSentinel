import { memo } from "react";
import { formatJobSourceLabel } from "../../../shared/jobSourceGuidance";
import { formatDashboardFitEstimate } from "../dashboardFitEstimate";
import type { DuplicateGroup } from "../types";

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  onMerge: (primaryId: number, jobIds: number[]) => void;
}

export const DuplicateGroupCard = memo(function DuplicateGroupCard({
  group,
  onMerge,
}: DuplicateGroupCardProps) {
  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-surface-800 dark:text-surface-200">
            {group.jobs[0]?.title ?? "Unknown"}
          </h4>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {group.jobs[0]?.company ?? "Unknown"}
          </p>
        </div>
        <button
          onClick={() =>
            onMerge(
              group.primary_id,
              group.jobs.map((j) => j.id),
            )
          }
          className="px-3 py-1 text-sm bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-400 focus-visible:ring-offset-2"
          aria-label={`Hide extra possible repeated jobs for ${group.jobs[0]?.title ?? "Unknown"}`}
        >
          Hide extras
        </button>
      </div>
      <div className="space-y-2">
        {group.jobs.map((job, idx) => (
          <div
            key={job.id}
            className={`flex items-center justify-between px-3 py-2 rounded ${
              idx === 0
                ? "bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800"
                : "bg-surface-50 dark:bg-surface-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">
                {formatJobSourceLabel(job.source)}
              </span>
              {idx === 0 && (
                <span className="text-xs bg-sentinel-500 text-white px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
            </div>
            <span className="text-sm text-surface-600 dark:text-surface-300">
              {formatDashboardFitEstimate(job.score)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
