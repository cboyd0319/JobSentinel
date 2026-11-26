/** Verifies deterministic browser-development dashboard command projections. */

import { describe, expect, it } from "vitest";
import { mockConfig, mockJobs } from "../../mocks/data";
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

  it("projects canonical work arrangements with structured remote precedence", () => {
    const state = {
      jobs: [
        { ...mockJobs[0], remote: true, description: "Hybrid office schedule" },
        { ...mockJobs[1], id: 20, description: "Hybrid office schedule" },
        { ...mockJobs[1], id: 21, description: "Fully remote role" },
        { ...mockJobs[1], id: 22, description: "On-site client support" },
        { ...mockJobs[1], id: 23, description: "Client support" },
      ],
    };

    const result = handleMockDashboardCommand("get_recent_jobs", { limit: 10 }, state);

    expect(result.value).toMatchObject([
      { id: mockJobs[0].id, work_arrangement: "remote" },
      { id: 20, work_arrangement: "hybrid" },
      { id: 21, work_arrangement: "remote" },
      { id: 22, work_arrangement: "onsite" },
      { id: 23, work_arrangement: "unspecified" },
    ]);
  });

  it("filters known country mismatches before applying dashboard list limits", () => {
    const state = {
      config: {
        ...mockConfig,
        location_preferences: {
          ...mockConfig.location_preferences,
          search_country: "GB",
        },
      },
      jobs: [
        {
          ...mockJobs[1],
          id: 30,
          geography: {
            worksite_locations: [
              { raw_location: "Denver, CO", country: { raw_country: "United States", alpha2: "US" } },
            ],
            remote_applicant_locations: [],
          },
        },
        {
          ...mockJobs[0],
          id: 31,
          remote: true,
          geography: {
            worksite_locations: [
              { raw_location: "New York, NY", country: { raw_country: "United States", alpha2: "US" } },
            ],
            remote_applicant_locations: [
              { raw_location: "United Kingdom", country: { raw_country: "United Kingdom", alpha2: "GB" } },
            ],
          },
        },
        {
          ...mockJobs[2],
          id: 32,
          geography: {
            worksite_locations: [
              { raw_location: "London", country: null },
            ],
            remote_applicant_locations: [],
          },
        },
        {
          ...mockJobs[3],
          id: 33,
          remote: false,
          geography: {
            worksite_locations: [
              { raw_location: "Leeds", country: { raw_country: "United Kingdom", alpha2: "GB" } },
              { raw_location: "Unknown", country: null },
            ],
            remote_applicant_locations: [],
          },
        },
        {
          ...mockJobs[4],
          id: 34,
          remote: false,
          description: "United Kingdom applicants welcome",
          geography: {
            worksite_locations: [
              { raw_location: "London", country: { raw_country: "United Kingdom", alpha2: "gb" } },
            ],
            remote_applicant_locations: [],
          },
        },
      ],
    };

    expect(
      handleMockDashboardCommand("get_recent_jobs", { limit: 4 }, state).value,
    ).toMatchObject([
      { id: 31, country_scope: "match", search_country: "GB" },
      { id: 32, country_scope: "unknown", search_country: "GB" },
      { id: 33, country_scope: "unknown", search_country: "GB" },
      { id: 34, country_scope: "unknown", search_country: "GB" },
    ]);
    expect(
      handleMockDashboardCommand("get_bookmarked_jobs", { limit: 1 }, {
        ...state,
        jobs: state.jobs.map((job) => ({ ...job, bookmarked: true })),
      }).value,
    ).toMatchObject([{ id: 31, country_scope: "match" }]);
    expect(
      handleMockDashboardCommand("search_jobs_query", { query: "Manager", limit: 3 }, state).value,
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 31, country_scope: "match" }),
    ]));
  });

  it("keeps a known mismatch available to direct lookup", () => {
    const mismatch = {
      ...mockJobs[1],
      geography: {
        worksite_locations: [
          { raw_location: "Denver, CO", country: { raw_country: "United States", alpha2: "US" } },
        ],
        remote_applicant_locations: [],
      },
    };
    const state = {
      config: {
        ...mockConfig,
        location_preferences: { ...mockConfig.location_preferences, search_country: "GB" },
      },
      jobs: [mismatch],
    };

    expect(handleMockDashboardCommand("get_job_by_id", { id: mismatch.id }, state).value)
      .toMatchObject({ id: mismatch.id, country_scope: "mismatch", search_country: "GB" });
  });

  it("returns an unhandled result for commands owned by another feature", () => {
    const state = { jobs: mockJobs.map((job) => ({ ...job })) };

    expect(
      handleMockDashboardCommand("get_applications_kanban", undefined, state),
    ).toMatchObject({ handled: false, shouldSave: false, state });
  });
});
