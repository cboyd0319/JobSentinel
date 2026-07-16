import { mockStatistics } from "../../../test-support/mocks/data";
import {
  getArg,
  getJobId,
} from "../../../test-support/mocks/handlers/commandHelpers";
import type { MockJob } from "../../../test-support/mocks/handlers/types";

export interface MockDashboardCommandState {
  jobs: MockJob[];
}

export interface MockDashboardCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockDashboardCommandState;
  value: unknown;
}

export function handleMockDashboardCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockDashboardCommandState,
): MockDashboardCommandResult {
  switch (command) {
    case "get_jobs":
      return withoutSave(state, filterJobs(state.jobs, args));

    case "get_job":
      return withoutSave(
        state,
        state.jobs.find((job) => job.id === getJobId(args)),
      );

    case "hide_job":
      return withJobs(
        state,
        state.jobs.map((job) =>
          job.id === getJobId(args) ? { ...job, hidden: true } : job,
        ),
      );

    case "unhide_job":
      return withJobs(
        state,
        state.jobs.map((job) =>
          job.id === getJobId(args) ? { ...job, hidden: false } : job,
        ),
      );

    case "toggle_bookmark":
      return toggleBookmark(args, state);

    case "get_bookmarked_jobs":
      return withoutSave(
        state,
        state.jobs.filter((job) => job.bookmarked),
      );

    case "set_job_notes":
      return withJobs(
        state,
        state.jobs.map((job) =>
          job.id === getJobId(args)
            ? { ...job, notes: getArg(args, "notes") as string | null }
            : job,
        ),
      );

    case "mark_job_as_real":
      return withJobs(
        state,
        state.jobs.map((job) =>
          job.id === getJobId(args)
            ? {
                ...job,
                ghost_score: 0,
                ghost_reasons: null,
                user_ghost_verdict: "real",
              }
            : job,
        ),
      );

    case "mark_job_as_ghost":
      return withJobs(
        state,
        state.jobs.map((job) =>
          job.id === getJobId(args)
            ? {
                ...job,
                ghost_score: 0.95,
                ghost_reasons: JSON.stringify([
                  {
                    category: "company_behavior",
                    description: "User marked this listing as needing review.",
                    weight: 1,
                    severity: "high",
                  },
                ]),
                user_ghost_verdict: "ghost",
              }
            : job,
        ),
      );

    case "get_job_notes":
      return withoutSave(
        state,
        state.jobs.find((job) => job.id === getJobId(args))?.notes || null,
      );

    case "get_statistics":
      return withoutSave(state, {
        ...mockStatistics,
        total_jobs: state.jobs.length,
        hidden_count: state.jobs.filter((job) => job.hidden).length,
      });

    case "get_recent_jobs":
      return withoutSave(state, state.jobs.slice(0, (args?.limit as number) || 10));

    case "get_scraping_status":
      return withoutSave(state, {
        is_running: false,
        current_source: null,
        progress: 0,
        last_run: new Date().toISOString(),
        jobs_found: state.jobs.length,
      });

    case "search_jobs":
      return withoutSave(state, {
        jobs_found: Math.floor(Math.random() * 20) + 5,
        duration_ms: 1500,
      });

    default:
      return { handled: false, shouldSave: false, state, value: undefined };
  }
}

function withoutSave(
  state: MockDashboardCommandState,
  value: unknown,
): MockDashboardCommandResult {
  return { handled: true, shouldSave: false, state, value };
}

function withJobs(
  state: MockDashboardCommandState,
  jobs: MockJob[],
  value?: unknown,
): MockDashboardCommandResult {
  return {
    handled: true,
    shouldSave: true,
    state: { ...state, jobs },
    value,
  };
}

function toggleBookmark(
  args: Record<string, unknown> | undefined,
  state: MockDashboardCommandState,
): MockDashboardCommandResult {
  let nextState = false;
  const jobs = state.jobs.map((job) => {
    if (job.id !== getJobId(args)) return job;
    nextState = !job.bookmarked;
    return { ...job, bookmarked: nextState };
  });

  return withJobs(state, jobs, nextState);
}

function filterJobs(
  jobs: MockJob[],
  args?: Record<string, unknown>,
): MockJob[] {
  let filtered = jobs.filter((job) => !job.hidden);

  if (args?.source) {
    filtered = filtered.filter((job) => job.source === args.source);
  }

  if (args?.minScore) {
    filtered = filtered.filter(
      (job) => job.score >= (args.minScore as number),
    );
  }

  if (args?.bookmarkedOnly) {
    filtered = filtered.filter((job) => job.bookmarked);
  }

  if (args?.search) {
    const search = (args.search as string).toLowerCase();
    filtered = filtered.filter(
      (job) =>
        job.title.toLowerCase().includes(search) ||
        job.company.toLowerCase().includes(search) ||
        job.description.toLowerCase().includes(search),
    );
  }

  return filtered;
}
