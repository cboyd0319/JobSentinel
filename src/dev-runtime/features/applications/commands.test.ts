import { describe, expect, it } from "vitest";
import {
  mockApplications,
  mockJobs,
  mockPendingReminders,
  mockUpcomingInterviews,
} from "../../mocks/data";
import { cloneApplications } from "../../mocks/handlers/commandHelpers";
import { handleMockApplicationsCommand } from "./commands";

function createState() {
  return {
    jobs: mockJobs.map((job) => ({ ...job })),
    applications: cloneApplications(mockApplications),
    pendingReminders: mockPendingReminders.map((reminder) => ({ ...reminder })),
    interviews: mockUpcomingInterviews.map((interview) => ({ ...interview })),
  };
}

describe("Applications mock commands", () => {
  it("creates and moves an application through owned state", () => {
    const initial = createState();
    const job = initial.jobs[0];
    const created = handleMockApplicationsCommand(
      "create_application",
      { jobHash: job.hash },
      initial,
    );
    const applicationId = created.value as number;

    expect(created).toMatchObject({ handled: true, shouldSave: true });
    expect(created.state.applications.to_apply).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: applicationId, job_hash: job.hash }),
      ]),
    );

    const moved = handleMockApplicationsCommand(
      "update_application_status",
      { applicationId, status: "applied" },
      created.state,
    );
    expect(moved.state.applications.to_apply).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: applicationId })]),
    );
    expect(moved.state.applications.applied).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: applicationId })]),
    );
  });

  it("returns an unhandled result for Dashboard commands", () => {
    const state = createState();

    expect(handleMockApplicationsCommand("get_jobs", undefined, state)).toMatchObject(
      { handled: false, shouldSave: false, state },
    );
  });
});
