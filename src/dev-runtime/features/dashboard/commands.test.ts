import { describe, expect, it } from "vitest";
import { mockJobs } from "../../mocks/data";
import { handleMockDashboardCommand } from "./commands";

describe("Dashboard mock commands", () => {
  it("returns statistics that match the displayed jobs", () => {
    const state = { jobs: mockJobs.map((job) => ({ ...job })) };

    const result = handleMockDashboardCommand("get_statistics", undefined, state);

    expect(result.value).toMatchObject({
      total_jobs: 8,
      high_matches: 1,
      hidden_count: 0,
      average_score: 0.8075,
    });
  });

  it("updates only the selected job when hiding a listing", () => {
    const state = { jobs: mockJobs.map((job) => ({ ...job })) };
    const selectedJob = state.jobs[0];

    const result = handleMockDashboardCommand(
      "hide_job",
      { id: selectedJob.id },
      state,
    );

    expect(result).toMatchObject({ handled: true, shouldSave: true });
    expect(result.state.jobs.find((job) => job.id === selectedJob.id)?.hidden).toBe(
      true,
    );
    expect(result.state.jobs.filter((job) => job.hidden)).toHaveLength(1);
  });

  it("returns an unhandled result for commands owned by another feature", () => {
    const state = { jobs: mockJobs.map((job) => ({ ...job })) };

    expect(
      handleMockDashboardCommand("get_applications_kanban", undefined, state),
    ).toMatchObject({ handled: false, shouldSave: false, state });
  });
});
