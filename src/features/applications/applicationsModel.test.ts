import { describe, expect, it } from "vitest";
import {
  findApplicationById,
  findColumnForApplication,
  formatReminderType,
  getApplicationReviewSummary,
  getApplicationStats,
  getInterviewSchedulerApplications,
  hasAnyApplications,
  type Application,
  type ApplicationsByStatus,
  type PendingReminder,
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

  it("builds a plain next-action review from reminders and active statuses", () => {
    const applications = emptyApplications();
    applications.to_apply.push({
      ...baseApplication,
      id: 2,
      status: "to_apply",
      applied_at: null,
    });
    applications.phone_interview.push({
      ...baseApplication,
      id: 3,
      status: "phone_interview",
      last_contact: "2026-06-18T12:00:00Z",
    });
    applications.offer_received.push({
      ...baseApplication,
      id: 4,
      status: "offer_received",
    });
    const reminders: PendingReminder[] = [
      {
        id: 1,
        application_id: 3,
        job_title: "Care Coordinator",
        company: "Community Clinic",
        reminder_type: "interview_prep",
        reminder_time: "2026-06-20T12:00:00Z",
      },
    ];

    expect(
      getApplicationReviewSummary(applications, reminders, new Date("2026-06-19T12:00:00Z")).actions,
    ).toEqual([
      expect.objectContaining({ kind: "reminders", priority: "high", count: 1 }),
      expect.objectContaining({ kind: "interviews", priority: "medium", count: 1 }),
      expect.objectContaining({ kind: "offers", priority: "medium", count: 1 }),
      expect.objectContaining({ kind: "to_apply", priority: "low", count: 1 }),
      expect.objectContaining({ kind: "weekly_review", priority: "low", count: 0 }),
    ]);
  });

  it("adds review handoffs so next actions explain what to do after the click", () => {
    const applications = emptyApplications();
    applications.to_apply.push({
      ...baseApplication,
      id: 2,
      status: "to_apply",
      applied_at: null,
    });
    applications.offer_received.push({
      ...baseApplication,
      id: 3,
      status: "offer_received",
    });

    const actions = getApplicationReviewSummary(applications, []).actions;

    expect(actions).toContainEqual(
      expect.objectContaining({
        kind: "to_apply",
        handoff: expect.objectContaining({
          label: "Posting review",
          description: expect.stringContaining("tailor"),
        }),
      }),
    );
    expect(actions).toContainEqual(
      expect.objectContaining({
        kind: "offers",
        handoff: expect.objectContaining({
          label: "Offer and pay review",
          description: expect.stringContaining("written offer"),
        }),
      }),
    );
    expect(actions).toContainEqual(
      expect.objectContaining({
        kind: "weekly_review",
        title: "Replan this week",
        handoff: expect.objectContaining({
          label: "Job-search plan",
          description: expect.stringContaining("stop rules"),
        }),
      }),
    );
  });

  it("flags quiet roles only after the no-response review window", () => {
    const applications = emptyApplications();
    applications.applied.push({
      ...baseApplication,
      id: 2,
      applied_at: "2026-06-05T12:00:00Z",
      last_contact: null,
    });
    applications.technical_interview.push({
      ...baseApplication,
      id: 3,
      status: "technical_interview",
      applied_at: "2026-05-01T12:00:00Z",
      last_contact: "2026-06-18T12:00:00Z",
    });

    expect(
      getApplicationReviewSummary(applications, [], new Date("2026-06-19T12:00:00Z")).actions,
    ).toContainEqual(
      expect.objectContaining({
        kind: "no_response",
        priority: "high",
        count: 1,
      }),
    );
  });

  it("shows a steady state when nothing needs attention", () => {
    const applications = emptyApplications();
    applications.applied.push({
      ...baseApplication,
      applied_at: "2026-06-18T12:00:00Z",
    });

    expect(
      getApplicationReviewSummary(applications, [], new Date("2026-06-19T12:00:00Z")),
    ).toEqual({
      title: "What to focus on next",
      description: "Use this short list to decide where your job-search time goes next.",
      actions: [
        {
          handoff: {
            description: "Use weekly review when changing sources, lanes, pacing, or stop rules.",
            label: "Job-search plan",
          },
          kind: "steady",
          priority: "low",
          count: 0,
          title: "Everything is organized",
          description: "No reminders, stale applications, interviews, offers, or saved roles need attention right now.",
        },
      ],
    });
  });

  it("guides empty trackers toward importing or saving one job", () => {
    expect(getApplicationReviewSummary(emptyApplications(), [])).toEqual({
      title: "Start with one role",
      description: "Save or import a job, then JobSentinel will help choose the next step.",
      actions: [
        {
          handoff: {
            description: "Review source, pay, and must-haves, then tailor only if the role is worth applying to.",
            label: "Posting review",
          },
          kind: "to_apply",
          priority: "low",
          count: 0,
          title: "Add a job to track",
          description: "Start with one saved, pasted, or imported job so the board has something to organize.",
        },
      ],
    });
  });
});
