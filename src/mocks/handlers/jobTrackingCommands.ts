import {
  mockApplicationStats,
  mockStatistics,
} from "../data";
import {
  APPLICATION_STATUS_KEYS,
  getArg,
  getJobId,
  getNumericArg,
} from "./commandHelpers";
import type {
  MockApplication,
  MockApplications,
  MockApplicationStatus,
  MockInterview,
  MockJob,
  MockPendingReminder,
} from "./types";

export interface MockJobTrackingCommandState {
  jobs: MockJob[];
  applications: MockApplications;
  pendingReminders: MockPendingReminder[];
  interviews: MockInterview[];
}

export interface MockJobTrackingCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockJobTrackingCommandState;
  value: unknown;
}

export function handleMockJobTrackingCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockJobTrackingCommandState,
): MockJobTrackingCommandResult {
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
                    description: "User confirmed this listing is a ghost job.",
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

    case "get_applications_kanban":
      return withoutSave(state, state.applications);

    case "create_application":
      return createApplication(args, state);

    case "update_application_status":
      return updateApplicationStatus(args, state);

    case "add_application_notes":
      return addApplicationNotes(args, state);

    case "get_pending_reminders":
      return withoutSave(state, state.pendingReminders);

    case "complete_reminder":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          pendingReminders: state.pendingReminders.filter(
            (reminder) => reminder.id !== getNumericArg(args, "reminderId"),
          ),
        },
        value: undefined,
      };

    case "detect_ghosted_applications":
      return withoutSave(state, 0);

    case "get_application_stats":
      return withoutSave(state, mockApplicationStats);

    case "get_jobs_by_source":
      return withoutSave(
        state,
        Object.entries(mockStatistics.by_source).map(([source, count]) => ({
          source,
          count,
        })),
      );

    case "get_salary_distribution":
      return withoutSave(
        state,
        [
          {
            range: "$40k-$60k",
            count: state.jobs.filter((job) => job.salary_min < 60000).length,
          },
          {
            range: "$60k-$80k",
            count: state.jobs.filter(
              (job) => job.salary_min >= 60000 && job.salary_min < 80000,
            ).length,
          },
          {
            range: "$80k-$100k",
            count: state.jobs.filter(
              (job) => job.salary_min >= 80000 && job.salary_min < 100000,
            ).length,
          },
          {
            range: "$100k+",
            count: state.jobs.filter((job) => job.salary_min >= 100000).length,
          },
        ].filter((bucket) => bucket.count > 0),
      );

    case "get_upcoming_interviews":
      return withoutSave(state, state.interviews);

    case "get_past_interviews":
      return withoutSave(state, []);

    case "schedule_interview":
      return scheduleInterview(args, state);

    case "complete_interview":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          interviews: state.interviews.map((interview): MockInterview =>
            interview.id === getArg(args, "interviewId")
              ? {
                  ...interview,
                  completed: true,
                  outcome: getArg(args, "outcome") as string,
                }
              : interview,
          ),
        },
        value: undefined,
      };

    case "delete_interview":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          interviews: state.interviews.filter(
            (interview) => interview.id !== getArg(args, "interviewId"),
          ),
        },
        value: undefined,
      };

    case "find_duplicates":
      return withoutSave(state, []);

    case "merge_duplicates":
      return withoutSave(state, undefined);

    default:
      return {
        handled: false,
        shouldSave: false,
        state,
        value: undefined,
      };
  }
}

function withoutSave(
  state: MockJobTrackingCommandState,
  value: unknown,
): MockJobTrackingCommandResult {
  return { handled: true, shouldSave: false, state, value };
}

function withJobs(
  state: MockJobTrackingCommandState,
  jobs: MockJob[],
  value?: unknown,
): MockJobTrackingCommandResult {
  return {
    handled: true,
    shouldSave: true,
    state: { ...state, jobs },
    value,
  };
}

function toggleBookmark(
  args: Record<string, unknown> | undefined,
  state: MockJobTrackingCommandState,
): MockJobTrackingCommandResult {
  let nextState = false;
  const jobs = state.jobs.map((job) => {
    if (job.id !== getJobId(args)) return job;
    nextState = !job.bookmarked;
    return { ...job, bookmarked: nextState };
  });

  return withJobs(state, jobs, nextState);
}

function createApplication(
  args: Record<string, unknown> | undefined,
  state: MockJobTrackingCommandState,
): MockJobTrackingCommandResult {
  const jobHash = getArg(args, "jobHash") ?? getArg(args, "job_hash");
  const job = state.jobs.find((candidate) => candidate.hash === jobHash);
  const nextId =
    Math.max(
      0,
      ...APPLICATION_STATUS_KEYS.flatMap((status) =>
        state.applications[status].map((application) => application.id),
      ),
    ) + 1;
  const applications = {
    ...state.applications,
    to_apply: [
      ...state.applications.to_apply,
      {
        id: nextId,
        job_hash: typeof jobHash === "string" ? jobHash : `mock-${nextId}`,
        job_title: job?.title ?? "Tracked Job",
        company: job?.company ?? "Mock Company",
        status: "to_apply",
        applied_at: null,
        notes: null,
        last_contact: null,
      },
    ],
  };

  return {
    handled: true,
    shouldSave: true,
    state: { ...state, applications },
    value: nextId,
  };
}

function updateApplicationStatus(
  args: Record<string, unknown> | undefined,
  state: MockJobTrackingCommandState,
): MockJobTrackingCommandResult {
  const applicationId = getNumericArg(args, "applicationId");
  const status = getArg(args, "status");
  if (applicationId === undefined || typeof status !== "string") {
    return withoutSave(state, undefined);
  }

  return {
    handled: true,
    shouldSave: true,
    state: {
      ...state,
      applications: moveApplicationStatus(
        state.applications,
        applicationId,
        status,
      ),
    },
    value: undefined,
  };
}

function addApplicationNotes(
  args: Record<string, unknown> | undefined,
  state: MockJobTrackingCommandState,
): MockJobTrackingCommandResult {
  const applicationId = getNumericArg(args, "applicationId");
  const notes = getArg(args, "notes");
  if (applicationId === undefined) {
    return withoutSave(state, undefined);
  }

  return {
    handled: true,
    shouldSave: true,
    state: {
      ...state,
      applications: updateApplication(
        state.applications,
        applicationId,
        (application) => ({
          ...application,
          notes: typeof notes === "string" ? notes : null,
        }),
      ),
    },
    value: undefined,
  };
}

function scheduleInterview(
  args: Record<string, unknown> | undefined,
  state: MockJobTrackingCommandState,
): MockJobTrackingCommandResult {
  const id = Math.max(...state.interviews.map((interview) => interview.id), 0) + 1;
  const interview: MockInterview = {
    id,
    application_id: getArg(args, "applicationId") as number,
    interview_type: getArg(args, "interviewType") as string,
    scheduled_at: getArg(args, "scheduledAt") as string,
    duration_minutes: getArg(args, "durationMinutes") as number,
    location: (getArg(args, "location") as string) || null,
    interviewer_name: (getArg(args, "interviewerName") as string) || null,
    interviewer_title: (getArg(args, "interviewerTitle") as string) || null,
    notes: (getArg(args, "notes") as string) || null,
    completed: false,
    outcome: null,
    job_title: "Mock Job",
    company: "Mock Company",
  };

  return {
    handled: true,
    shouldSave: true,
    state: { ...state, interviews: [...state.interviews, interview] },
    value: id,
  };
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

function findApplication(
  applications: MockApplications,
  applicationId: number,
): { status: MockApplicationStatus; application: MockApplication } | null {
  for (const status of APPLICATION_STATUS_KEYS) {
    const application = applications[status].find((app) => app.id === applicationId);
    if (application) return { status, application };
  }
  return null;
}

function updateApplication(
  applications: MockApplications,
  applicationId: number,
  updater: (application: MockApplication) => MockApplication,
): MockApplications {
  return APPLICATION_STATUS_KEYS.reduce((acc, status) => {
    acc[status] = applications[status].map((application) =>
      application.id === applicationId ? updater(application) : application,
    );
    return acc;
  }, {} as MockApplications);
}

function moveApplicationStatus(
  applications: MockApplications,
  applicationId: number,
  status: string,
): MockApplications {
  if (!APPLICATION_STATUS_KEYS.includes(status as MockApplicationStatus)) {
    return applications;
  }

  const current = findApplication(applications, applicationId);
  if (!current) return applications;

  const nextStatus = status as MockApplicationStatus;
  const updated = APPLICATION_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = applications[key].filter(
      (application) => application.id !== applicationId,
    );
    return acc;
  }, {} as MockApplications);
  updated[nextStatus] = [
    ...updated[nextStatus],
    { ...current.application, status: nextStatus },
  ];
  return updated;
}
