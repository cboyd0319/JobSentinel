import { describe, expect, it } from "vitest";
import {
  findApplicationById,
  findColumnForApplication,
  formatReminderType,
  getApplicationStats,
  getInterviewSchedulerApplications,
  hasAnyApplications,
  type Application,
  type ApplicationsByStatus,
} from "./applicationsModel";

const baseApplication: Application = {
  id: 1,
  job_hash: "job-1",
  job_title: "Care Coordinator",
  company: "Community Clinic",
  status: "applied",
  applied_at: "2026-06-01T12:00:00Z",
  notes: null,
  last_contact: null,
};

function emptyApplications(): ApplicationsByStatus {
  return {
    to_apply: [],
    applied: [],
    screening_call: [],
    phone_interview: [],
    technical_interview: [],
    onsite_interview: [],
    offer_received: [],
    offer_accepted: [],
    offer_rejected: [],
    rejected: [],
    withdrawn: [],
    ghosted: [],
  };
}

describe("applicationsModel", () => {
  it("formats known reminder types with plain labels", () => {
    expect(formatReminderType("follow_up")).toBe("Follow up");
    expect(formatReminderType("interview_prep")).toBe("Interview prep");
    expect(formatReminderType("unknown")).toBe("Reminder");
  });

  it("finds application columns and records across status groups", () => {
    const applications = emptyApplications();
    applications.phone_interview.push({
      ...baseApplication,
      id: 42,
      status: "phone_interview",
    });

    expect(findColumnForApplication(applications, 42)).toBe("phone_interview");
    expect(findColumnForApplication(applications, 7)).toBeNull();
    expect(findColumnForApplication(null, 42)).toBeNull();
    expect(findApplicationById(applications, 42)?.company).toBe("Community Clinic");
    expect(findApplicationById(applications, null)).toBeNull();
  });

  it("reports whether any application is tracked", () => {
    expect(hasAnyApplications(null)).toBe(false);
    expect(hasAnyApplications(emptyApplications())).toBe(false);

    const applications = emptyApplications();
    applications.to_apply.push(baseApplication);
    expect(hasAnyApplications(applications)).toBe(true);
  });

  it("calculates tracker stats without counting saved-only jobs as applied", () => {
    const applications = emptyApplications();
    applications.to_apply.push({ ...baseApplication, id: 1, status: "to_apply" });
    applications.applied.push({ ...baseApplication, id: 2, status: "applied" });
    applications.screening_call.push({
      ...baseApplication,
      id: 3,
      status: "screening_call",
    });
    applications.offer_received.push({
      ...baseApplication,
      id: 4,
      status: "offer_received",
    });
    applications.offer_rejected.push({
      ...baseApplication,
      id: 5,
      status: "offer_rejected",
    });
    applications.rejected.push({ ...baseApplication, id: 6, status: "rejected" });

    expect(getApplicationStats(applications)).toEqual({
      totalApplied: 5,
      interviews: 1,
      offers: 2,
      rejected: 2,
      inProgress: 3,
      interviewRate: 60,
      offerRate: 40,
    });
    expect(getApplicationStats(null)).toBeNull();
  });

  it("builds scheduler application options without status details", () => {
    const applications = emptyApplications();
    applications.applied.push(baseApplication);

    expect(getInterviewSchedulerApplications(applications)).toEqual([
      {
        id: 1,
        job_title: "Care Coordinator",
        company: "Community Clinic",
      },
    ]);
  });
});
