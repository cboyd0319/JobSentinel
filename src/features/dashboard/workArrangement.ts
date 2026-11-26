/** Resolves dashboard work-arrangement display and filters without inferring legacy non-remote rows. */

import type { Job, WorkArrangement } from "./types";

export function getDashboardWorkArrangement(
  job: Pick<Job, "remote" | "work_arrangement">,
): WorkArrangement {
  return isWorkArrangement(job.work_arrangement)
    ? job.work_arrangement
    : job.remote === true
      ? "remote"
      : "unspecified";
}

function isWorkArrangement(value: unknown): value is WorkArrangement {
  return value === "remote" || value === "hybrid" || value === "onsite" || value === "unspecified";
}

export function formatDashboardWorkArrangement(
  arrangement: WorkArrangement,
  location: string | null,
): string {
  const label = arrangement === "remote" ? "Remote"
    : arrangement === "hybrid" ? "Hybrid"
      : arrangement === "onsite" ? "On-site"
        : null;
  if (label === null) return location || "Location TBD";
  return location && location.trim().toLowerCase() !== label.toLowerCase()
    ? `${label} · ${location}`
    : label;
}
