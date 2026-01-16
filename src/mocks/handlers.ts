/**
 * Mock handlers for Tauri commands
 * Used for development without the Rust backend
 */

import {
  mockJobs,
  mockConfig,
  mockStatistics,
  mockApplications,
  mockApplicationStats,
  mockUpcomingInterviews,
  mockPendingReminders,
} from "./data";

type MockJob = typeof mockJobs[number];

interface MockInterview {
  id: number;
  application_id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  interviewer_name: string | null;
  interviewer_title: string | null;
  notes: string | null;
  completed: boolean;
  outcome: string | null;
  job_title: string;
  company: string;
}

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory state for mock data
let jobs = [...mockJobs];
let config = { ...mockConfig };
let interviews: MockInterview[] = [...mockUpcomingInterviews];

/**
 * Mock implementation of Tauri invoke
 */
export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Simulate network latency
  await delay(100 + Math.random() * 200);

  console.log(`[Mock] invoke: ${cmd}`, args);

  switch (cmd) {
    // Job commands
    case "get_jobs":
      return filterJobs(args) as T;

    case "get_job":
      return jobs.find((j) => j.id === args?.jobId) as T;

    case "hide_job":
      jobs = jobs.map((j) => (j.id === args?.jobId ? { ...j, hidden: true } : j));
      return undefined as T;

    case "unhide_job":
      jobs = jobs.map((j) => (j.id === args?.jobId ? { ...j, hidden: false } : j));
      return undefined as T;

    case "toggle_bookmark":
      jobs = jobs.map((j) => (j.id === args?.jobId ? { ...j, bookmarked: !j.bookmarked } : j));
      return undefined as T;

    case "get_bookmarked_jobs":
      return jobs.filter((j) => j.bookmarked) as T;

    case "set_job_notes":
      jobs = jobs.map((j) => (j.id === args?.jobId ? { ...j, notes: args?.notes as string } : j));
      return undefined as T;

    case "get_job_notes":
      return (jobs.find((j) => j.id === args?.jobId)?.notes || null) as T;

    // Setup/First run
    case "is_first_run":
      // Set to true to test setup wizard, false to show dashboard
      return false as T;

    // Config commands
    case "get_config":
      return config as T;

    case "save_config":
      config = { ...config, ...(args?.config as object) };
      return undefined as T;

    // Statistics commands
    case "get_statistics":
      return {
        ...mockStatistics,
        total_jobs: jobs.length,
        hidden_count: jobs.filter((j) => j.hidden).length,
      } as T;

    // Dashboard commands
    case "get_recent_jobs":
      return jobs.slice(0, (args?.limit as number) || 10) as T;

    case "get_scraping_status":
      return {
        is_running: false,
        current_source: null,
        progress: 0,
        last_run: new Date().toISOString(),
        jobs_found: jobs.length,
      } as T;

    // Search commands
    case "search_jobs":
      return { jobs_found: Math.floor(Math.random() * 20) + 5, duration_ms: 1500 } as T;

    // Application commands
    case "get_applications_kanban":
      return mockApplications as T;

    case "create_application":
      return 100 as T;

    case "update_application_status":
      return undefined as T;

    case "add_application_notes":
      return undefined as T;

    case "get_pending_reminders":
      return mockPendingReminders as T;

    case "complete_reminder":
      return undefined as T;

    case "detect_ghosted_applications":
      return 0 as T;

    case "get_application_stats":
      return mockApplicationStats as T;

    // Interview commands
    case "get_upcoming_interviews":
      return interviews as T;

    case "schedule_interview": {
      const newId = Math.max(...interviews.map((i) => i.id), 0) + 1;
      const newInterview: MockInterview = {
        id: newId,
        application_id: args?.applicationId as number,
        interview_type: args?.interviewType as string,
        scheduled_at: args?.scheduledAt as string,
        duration_minutes: args?.durationMinutes as number,
        location: (args?.location as string) || null,
        interviewer_name: (args?.interviewerName as string) || null,
        interviewer_title: (args?.interviewerTitle as string) || null,
        notes: (args?.notes as string) || null,
        completed: false,
        outcome: null,
        job_title: "Mock Job",
        company: "Mock Company",
      };
      interviews.push(newInterview);
      return newId as T;
    }

    case "complete_interview":
      interviews = interviews.map((i): MockInterview =>
        i.id === args?.interviewId ? { ...i, completed: true, outcome: args?.outcome as string } : i
      );
      return undefined as T;

    case "delete_interview":
      interviews = interviews.filter((i) => i.id !== args?.interviewId);
      return undefined as T;

    // Deduplication commands
    case "find_duplicates":
      return [] as T;

    case "merge_duplicates":
      return undefined as T;

    // Resume commands
    case "get_active_resume":
      return null as T;

    case "get_user_skills":
      return [] as T;

    // Salary commands
    case "predict_salary":
      return { min: 120000, max: 160000, median: 140000 } as T;

    case "get_salary_benchmark":
      return { p25: 110000, p50: 140000, p75: 170000, p90: 200000 } as T;

    // Market intelligence
    case "get_trending_skills":
      return [
        { skill: "Rust", growth: 45, demand: "high" },
        { skill: "TypeScript", growth: 32, demand: "high" },
        { skill: "Kubernetes", growth: 28, demand: "medium" },
      ] as T;

    case "get_active_companies":
      return [
        { company: "TechCorp", openings: 15, growth: 25 },
        { company: "StartupXYZ", openings: 8, growth: 40 },
      ] as T;

    default:
      console.warn(`[Mock] Unhandled command: ${cmd}`);
      return undefined as T;
  }
}

function filterJobs(args?: Record<string, unknown>): MockJob[] {
  let filtered = jobs.filter((j) => !j.hidden);

  if (args?.source) {
    filtered = filtered.filter((j) => j.source === args.source);
  }

  if (args?.minScore) {
    filtered = filtered.filter((j) => j.score >= (args.minScore as number));
  }

  if (args?.bookmarkedOnly) {
    filtered = filtered.filter((j) => j.bookmarked);
  }

  if (args?.search) {
    const search = (args.search as string).toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(search) ||
        j.company.toLowerCase().includes(search) ||
        j.description.toLowerCase().includes(search)
    );
  }

  return filtered;
}

/**
 * Reset mock data to initial state
 */
export function resetMockData() {
  jobs = [...mockJobs];
  config = { ...mockConfig };
  interviews = [...mockUpcomingInterviews];
}
