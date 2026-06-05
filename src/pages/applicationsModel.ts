export interface Application {
  id: number;
  job_hash: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string | null;
  notes: string | null;
  last_contact: string | null;
}

export interface ApplicationsByStatus {
  to_apply: Application[];
  applied: Application[];
  screening_call: Application[];
  phone_interview: Application[];
  technical_interview: Application[];
  onsite_interview: Application[];
  offer_received: Application[];
  offer_accepted: Application[];
  offer_rejected: Application[];
  rejected: Application[];
  withdrawn: Application[];
  ghosted: Application[];
}

export interface PendingReminder {
  id: number;
  application_id: number;
  job_title: string;
  company: string;
  reminder_type: string;
  reminder_time: string;
}

export interface ApplicationStats {
  totalApplied: number;
  interviews: number;
  offers: number;
  rejected: number;
  inProgress: number;
  interviewRate: number;
  offerRate: number;
}

export interface InterviewSchedulerApplication {
  id: number;
  job_title: string;
  company: string;
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow up",
  interview_prep: "Interview prep",
  deadline: "Deadline",
  offer_review: "Offer review",
  custom: "Reminder",
};

export const STATUS_COLUMNS = [
  { key: "to_apply", label: "To Apply", color: "bg-surface-500" },
  { key: "applied", label: "Applied", color: "bg-blue-500" },
  { key: "screening_call", label: "Screening Call", color: "bg-purple-500" },
  { key: "phone_interview", label: "Phone Interview", color: "bg-violet-500" },
  { key: "technical_interview", label: "Skills Interview", color: "bg-indigo-500" },
  { key: "onsite_interview", label: "Onsite Interview", color: "bg-cyan-500" },
  { key: "offer_received", label: "Offer Received", color: "bg-success" },
  { key: "offer_accepted", label: "Offer Accepted", color: "bg-emerald-500" },
  { key: "offer_rejected", label: "Offer Declined", color: "bg-orange-500" },
  { key: "rejected", label: "Not Selected", color: "bg-danger" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-amber-500" },
  { key: "ghosted", label: "No Response", color: "bg-surface-400" },
] as const;

export type StatusKey = (typeof STATUS_COLUMNS)[number]["key"];

export function formatReminderType(type: string): string {
  return REMINDER_TYPE_LABELS[type] ?? "Reminder";
}

export function findColumnForApplication(
  applications: ApplicationsByStatus | null,
  appId: number,
): StatusKey | null {
  if (!applications) return null;
  for (const column of STATUS_COLUMNS) {
    if (applications[column.key].some((application) => application.id === appId)) {
      return column.key;
    }
  }
  return null;
}

export function findApplicationById(
  applications: ApplicationsByStatus | null,
  appId: number | null,
): Application | null {
  if (appId === null || !applications) return null;
  for (const column of STATUS_COLUMNS) {
    const application = applications[column.key].find((candidate) => candidate.id === appId);
    if (application) return application;
  }
  return null;
}

export function hasAnyApplications(applications: ApplicationsByStatus | null): boolean {
  if (!applications) return false;
  return STATUS_COLUMNS.some((column) => applications[column.key].length > 0);
}

export function getApplicationStats(
  applications: ApplicationsByStatus | null,
): ApplicationStats | null {
  if (!applications) return null;

  const totalApplied =
    applications.applied.length +
    applications.screening_call.length +
    applications.phone_interview.length +
    applications.technical_interview.length +
    applications.onsite_interview.length +
    applications.offer_received.length +
    applications.offer_accepted.length +
    applications.offer_rejected.length +
    applications.rejected.length +
    applications.withdrawn.length +
    applications.ghosted.length;

  const interviews =
    applications.screening_call.length +
    applications.phone_interview.length +
    applications.technical_interview.length +
    applications.onsite_interview.length;

  const interviewsPlusOffers =
    interviews +
    applications.offer_received.length +
    applications.offer_accepted.length +
    applications.offer_rejected.length;

  const offers =
    applications.offer_received.length +
    applications.offer_accepted.length +
    applications.offer_rejected.length;

  const rejected = applications.rejected.length + applications.offer_rejected.length;

  const inProgress = applications.applied.length + interviews + applications.offer_received.length;

  const interviewRate =
    totalApplied > 0 ? Math.round((interviewsPlusOffers / totalApplied) * 100) : 0;

  const offerRate = totalApplied > 0 ? Math.round((offers / totalApplied) * 100) : 0;

  return {
    totalApplied,
    interviews,
    offers,
    rejected,
    inProgress,
    interviewRate,
    offerRate,
  };
}

export function getInterviewSchedulerApplications(
  applications: ApplicationsByStatus,
): InterviewSchedulerApplication[] {
  return Object.values(applications)
    .flat()
    .map((application) => ({
      id: application.id,
      job_title: application.job_title,
      company: application.company,
    }));
}
