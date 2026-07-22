import { describe, expect, it } from "vitest";
import { mockApplications, mockJobs } from "../../mocks/data";
import { handleMockOpportunityCaseCommand } from "./commands";

describe("Opportunity case mock command", () => {
  it("returns one local-safe case snapshot for the requested job hash", () => {
    const result = handleMockOpportunityCaseCommand(
      "open_opportunity_case",
      { jobHash: mockJobs[0].hash },
      { jobs: mockJobs, applications: mockApplications },
    );

    expect(result).toMatchObject({ handled: true, shouldSave: false });
    expect(result.value).toMatchObject({
      job: { job_hash: mockJobs[0].hash, title: mockJobs[0].title },
      source: { connectivity_required: true, stale: false },
      evidence: { confirmed_count: 0, current_packet_count: 0, stale_packet_count: 0 },
      timeline: [],
    });
    expect(result.value).not.toHaveProperty("id");
  });

  it("does not claim commands owned by another feature", () => {
    const state = { jobs: mockJobs, applications: mockApplications };

    expect(handleMockOpportunityCaseCommand("get_jobs", undefined, state)).toMatchObject({
      handled: false,
      shouldSave: false,
      state,
    });
  });
});
