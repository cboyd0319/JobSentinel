import { getStringArg } from "../../mocks/handlers/commandHelpers";
import type { MockApplications, MockJob } from "../../mocks/handlers/types";

interface MockOpportunityCaseState {
  jobs: MockJob[];
  applications: MockApplications;
}

interface MockOpportunityCaseResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockOpportunityCaseState;
  value: unknown;
}

export function handleMockOpportunityCaseCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockOpportunityCaseState,
): MockOpportunityCaseResult {
  if (command !== "open_opportunity_case") {
    return { handled: false, shouldSave: false, state, value: undefined };
  }

  const jobHash = getStringArg(args, "jobHash");
  const job = state.jobs.find((candidate) => candidate.hash === jobHash);
  if (!job) throw new Error("Job is unavailable.");

  const application = Object.values(state.applications)
    .flat()
    .find((candidate) => candidate.job_hash === job.hash);

  return {
    handled: true,
    shouldSave: false,
    state,
    value: {
      job: {
        job_hash: job.hash,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        times_seen: 1,
      },
      source: {
        name: "Saved job source",
        last_seen_at: job.created_at,
        connectivity_required: true,
        stale: false,
      },
      posting_risk: { score: 0, reasons: [] },
      application: application && {
        status: application.status,
        has_contact: Boolean(application.last_contact),
      },
      interviews: null,
      offer: null,
      outcome: null,
      evidence: {
        confirmed_count: 0,
        current_packet_count: 0,
        stale_packet_count: 0,
        review_status: "no_saved_match",
        requirements: [],
      },
      decision: {
        kind: "research_more",
        reasons: ["No current saved-resume evidence review is available."],
      },
      timeline: [],
    },
  };
}
