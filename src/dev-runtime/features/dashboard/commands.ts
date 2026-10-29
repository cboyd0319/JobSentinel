/** Projects deterministic dashboard commands for browser development. */

import { mockSearchCountryOptions, mockStatistics } from "../../mocks/data";
import {
  getArg,
  getJobId,
} from "../../mocks/handlers/commandHelpers";
import type { MockConfig, MockJob } from "../../mocks/handlers/types";
import { classifyMockCountryScope } from "./countryScope";
import { deriveMockWorkArrangement } from "./workArrangement";

export interface MockDashboardCommandState {
  jobs: MockJob[];
  config?: MockConfig;
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
    case "get_search_country_options":
      return withoutSave(state, mockSearchCountryOptions.map((option) => [...option]));

    case "get_jobs":
      return withoutSave(state, filterJobs(state.jobs, args).map((job) => projectJob(job, searchCountry(state))));

    case "get_job":
    case "get_job_by_id":
      return withoutSave(
        state,
        projectJob(state.jobs.find((job) => job.id === getJobId(args)), searchCountry(state)),
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
        visibleCountryJobs(state.jobs.filter((job) => job.bookmarked), searchCountry(state))
          .slice(0, getLimit(args))
          .map((job) => projectJob(job, searchCountry(state))),
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
      return withoutSave(
        state,
        visibleCountryJobs(state.jobs, searchCountry(state))
          .slice(0, getLimit(args))
          .map((job) => projectJob(job, searchCountry(state))),
      );

    case "search_jobs_query":
      return withoutSave(
        state,
        visibleCountryJobs(filterJobs(state.jobs, { search: getArg(args, "query") }), searchCountry(state))
          .slice(0, getLimit(args))
          .map((job) => projectJob(job, searchCountry(state))),
      );

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

function projectJob(job: MockJob | undefined, selectedCountry: string | null) {
  if (!job) return undefined;
  return {
    ...job,
    work_arrangement: deriveMockWorkArrangement(job),
    country_scope: classifyMockCountryScope(job, selectedCountry),
    search_country: selectedCountry,
  };
}

function searchCountry(state: MockDashboardCommandState): string | null {
  return state.config?.location_preferences.search_country ?? null;
}

function visibleCountryJobs(jobs: MockJob[], selectedCountry: string | null): MockJob[] {
  return jobs.filter((job) => classifyMockCountryScope(job, selectedCountry) !== "mismatch");
}

function getLimit(args: Record<string, unknown> | undefined): number {
  const limit = getArg(args, "limit");
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0
    ? Math.floor(limit)
    : 10;
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
