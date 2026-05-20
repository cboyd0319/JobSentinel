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
type MockConfig = typeof mockConfig;
type MockApplicationStatus = keyof typeof mockApplications;
interface MockApplication {
  id: number;
  job_hash: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string | null;
  notes: string | null;
  last_contact: string | null;
}
type MockApplications = Record<MockApplicationStatus, MockApplication[]>;
type MockPendingReminder = typeof mockPendingReminders[number];
type MockCredentialKey =
  | "slack_webhook"
  | "smtp_password"
  | "linkedin_cookie"
  | "discord_webhook"
  | "teams_webhook"
  | "telegram_bot_token"
  | "usajobs_api_key";
const APPLICATION_STATUS_KEYS = Object.keys(mockApplications) as MockApplicationStatus[];

interface MockGhostConfig {
  stale_threshold_days: number;
  repost_threshold: number;
  min_description_length: number;
  penalize_missing_salary: boolean;
  warning_threshold: number;
  hide_threshold: number;
}

interface MockBookmarkletConfig {
  port: number;
  enabled: boolean;
}

interface MockResumeData {
  id: number;
  name: string;
  file_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MockUserSkill {
  id: number;
  resume_id: number;
  skill_name: string;
  skill_category: string | null;
  confidence_score: number;
  years_experience: number | null;
  proficiency_level: string | null;
  source: string;
}

interface MockSkillInput {
  skill_name?: unknown;
  skill_category?: unknown;
  proficiency_level?: unknown;
  years_experience?: unknown;
}

interface MockMatchResult {
  id: number;
  resume_id: number;
  job_hash: string;
  job_title: string;
  company: string;
  overall_match_score: number;
  skills_match_score: number | null;
  experience_match_score: number | null;
  education_match_score: number | null;
  matching_skills: string[];
  missing_skills: string[];
  gap_analysis: string | null;
  created_at: string;
}

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
let applications: MockApplications = cloneApplications(mockApplications);
let pendingReminders: MockPendingReminder[] = [...mockPendingReminders];
let credentials: Partial<Record<MockCredentialKey, string>> = {};
let ghostConfig: MockGhostConfig = getDefaultGhostConfig();
let bookmarkletConfig: MockBookmarkletConfig = {
  port: 4321,
  enabled: false,
};
let resumes: MockResumeData[] = [];
let userSkills: MockUserSkill[] = [];
let recentMatches: MockMatchResult[] = [];

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

interface MockState {
  jobs: MockJob[];
  config: MockConfig;
  interviews: MockInterview[];
  applications: MockApplications;
  pendingReminders: MockPendingReminder[];
  credentials: Partial<Record<MockCredentialKey, string>>;
  ghostConfig: MockGhostConfig;
  bookmarkletConfig: MockBookmarkletConfig;
  resumes: MockResumeData[];
  userSkills: MockUserSkill[];
  recentMatches: MockMatchResult[];
}

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function saveMockState(): void {
  if (!canUseStorage()) return;

  const state: MockState = {
    jobs,
    config,
    interviews,
    applications,
    pendingReminders,
    credentials,
    ghostConfig,
    bookmarkletConfig,
    resumes,
    userSkills,
    recentMatches,
  };
  window.localStorage.setItem(MOCK_STATE_KEY, JSON.stringify(state));
}

function loadMockState(): void {
  if (!canUseStorage()) return;

  const rawState = window.localStorage.getItem(MOCK_STATE_KEY);
  if (!rawState) return;

  try {
    const state = JSON.parse(rawState) as Partial<MockState>;
    if (Array.isArray(state.jobs)) jobs = state.jobs;
    if (state.config && typeof state.config === "object") {
      config = { ...mockConfig, ...state.config };
    }
    if (Array.isArray(state.interviews)) interviews = state.interviews;
    if (state.applications && typeof state.applications === "object") {
      applications = normalizeApplications(state.applications);
    }
    if (Array.isArray(state.pendingReminders)) {
      pendingReminders = state.pendingReminders;
    }
    if (state.credentials && typeof state.credentials === "object") {
      credentials = state.credentials;
    }
    if (state.ghostConfig && typeof state.ghostConfig === "object") {
      ghostConfig = { ...getDefaultGhostConfig(), ...state.ghostConfig };
    }
    if (state.bookmarkletConfig && typeof state.bookmarkletConfig === "object") {
      bookmarkletConfig = { ...bookmarkletConfig, ...state.bookmarkletConfig };
    }
    if (Array.isArray(state.resumes)) resumes = state.resumes;
    if (Array.isArray(state.userSkills)) userSkills = state.userSkills;
    if (Array.isArray(state.recentMatches)) recentMatches = state.recentMatches;
  } catch {
    window.localStorage.removeItem(MOCK_STATE_KEY);
  }
}

loadMockState();

function cloneApplications(
  source: Partial<Record<MockApplicationStatus, MockApplication[]>>,
): MockApplications {
  return APPLICATION_STATUS_KEYS.reduce((acc, status) => {
    acc[status] = (source[status] ?? []).map((application) => ({ ...application }));
    return acc;
  }, {} as MockApplications);
}

function normalizeApplications(
  source: Partial<Record<MockApplicationStatus, MockApplication[]>>,
): MockApplications {
  return APPLICATION_STATUS_KEYS.reduce((acc, status) => {
    const apps = Array.isArray(source[status]) ? source[status] : [];
    acc[status] = apps.map((application) => ({ ...application }));
    return acc;
  }, {} as MockApplications);
}

function getDefaultGhostConfig(): MockGhostConfig {
  return {
    stale_threshold_days: 60,
    repost_threshold: 3,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.3,
    hide_threshold: 0.7,
  };
}

function isCredentialKey(value: unknown): value is MockCredentialKey {
  return (
    value === "slack_webhook" ||
    value === "smtp_password" ||
    value === "linkedin_cookie" ||
    value === "discord_webhook" ||
    value === "teams_webhook" ||
    value === "telegram_bot_token" ||
    value === "usajobs_api_key"
  );
}

function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function getStringArg(
  args: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = getArg(args, key);
  return typeof value === "string" ? value : undefined;
}

function getActiveResume(): MockResumeData | null {
  return resumes.find((resume) => resume.is_active) ?? null;
}

function getNextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function getResumeIdArg(args: Record<string, unknown> | undefined): number | undefined {
  return getNumericArg(args, "resumeId") ?? getNumericArg(args, "resume_id");
}

function getSkillIdArg(args: Record<string, unknown> | undefined): number | undefined {
  return getNumericArg(args, "skillId") ?? getNumericArg(args, "skill_id");
}

function normalizeSkillInput(value: unknown): MockSkillInput {
  return value && typeof value === "object" ? (value as MockSkillInput) : {};
}

function createMockResume(name: string, filePath: string): number {
  const now = new Date().toISOString();
  const id = getNextId(resumes);
  resumes = resumes.map((resume) => ({ ...resume, is_active: false }));
  resumes.push({
    id,
    name,
    file_path: filePath,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  saveMockState();
  return id;
}

function getJobId(args?: Record<string, unknown>): number | undefined {
  const value = getArg(args, "id") ?? getArg(args, "jobId");
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getArg(
  args: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const nestedArgs = args?.payload as Record<string, unknown> | undefined;
  return args?.[key] ?? nestedArgs?.[key];
}

function getNumericArg(
  args: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = getArg(args, key);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function findApplication(
  applicationId: number,
): { status: MockApplicationStatus; application: MockApplication } | null {
  for (const status of APPLICATION_STATUS_KEYS) {
    const application = applications[status].find((app) => app.id === applicationId);
    if (application) return { status, application };
  }
  return null;
}

function updateApplication(
  applicationId: number,
  updater: (application: MockApplication) => MockApplication,
): void {
  applications = APPLICATION_STATUS_KEYS.reduce((acc, status) => {
    acc[status] = applications[status].map((application) =>
      application.id === applicationId ? updater(application) : application,
    );
    return acc;
  }, {} as MockApplications);
}

function moveApplicationStatus(applicationId: number, status: string): void {
  if (!APPLICATION_STATUS_KEYS.includes(status as MockApplicationStatus)) return;

  const current = findApplication(applicationId);
  if (!current) return;

  const nextStatus = status as MockApplicationStatus;
  applications = APPLICATION_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = applications[key].filter((application) => application.id !== applicationId);
    return acc;
  }, {} as MockApplications);
  applications[nextStatus] = [
    ...applications[nextStatus],
    { ...current.application, status: nextStatus },
  ];
}

/**
 * Mock implementation of Tauri invoke
 */
export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Simulate network latency
  await delay(100 + Math.random() * 200);
  const jobId = getJobId(args);

  switch (cmd) {
    // Job commands
    case "get_jobs":
      return filterJobs(args) as T;

    case "get_job":
      return jobs.find((j) => j.id === jobId) as T;

    case "hide_job":
      jobs = jobs.map((j) => (j.id === jobId ? { ...j, hidden: true } : j));
      saveMockState();
      return undefined as T;

    case "unhide_job":
      jobs = jobs.map((j) => (j.id === jobId ? { ...j, hidden: false } : j));
      saveMockState();
      return undefined as T;

    case "toggle_bookmark": {
      let nextState = false;
      jobs = jobs.map((j) => {
        if (j.id !== jobId) return j;
        nextState = !j.bookmarked;
        return { ...j, bookmarked: nextState };
      });
      saveMockState();
      return nextState as T;
    }

    case "get_bookmarked_jobs":
      return jobs.filter((j) => j.bookmarked) as T;

    case "set_job_notes":
      jobs = jobs.map((j) =>
        j.id === jobId
          ? { ...j, notes: getArg(args, "notes") as string | null }
          : j,
      );
      saveMockState();
      return undefined as T;

    case "get_job_notes":
      return (jobs.find((j) => j.id === jobId)?.notes || null) as T;

    // Setup/First run
    case "is_first_run":
      // Set to true to test setup wizard, false to show dashboard
      return false as T;

    // Config commands
    case "get_config":
      return config as T;

    case "save_config":
      config = { ...config, ...(getArg(args, "config") as object) };
      saveMockState();
      return undefined as T;

    case "has_credential": {
      const key = getArg(args, "key");
      return (isCredentialKey(key) && Boolean(credentials[key])) as T;
    }

    case "store_credential": {
      const key = getArg(args, "key");
      const value = getArg(args, "value");
      if (isCredentialKey(key) && typeof value === "string") {
        credentials[key] = value;
        saveMockState();
      }
      return undefined as T;
    }

    case "retrieve_credential": {
      const key = getArg(args, "key");
      return (isCredentialKey(key) ? credentials[key] ?? null : null) as T;
    }

    case "disconnect_linkedin":
      delete credentials.linkedin_cookie;
      config = {
        ...config,
        linkedin: { ...config.linkedin, enabled: false },
      };
      saveMockState();
      return undefined as T;

    case "linkedin_login":
      credentials.linkedin_cookie = "mock-linkedin-session";
      config = {
        ...config,
        linkedin: { ...config.linkedin, enabled: true },
      };
      saveMockState();
      return undefined as T;

    case "get_linkedin_expiry_status":
      return {
        connected: Boolean(credentials.linkedin_cookie),
        expires_at: credentials.linkedin_cookie
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        days_remaining: credentials.linkedin_cookie ? 7 : null,
        expiry_warning: false,
        expired: false,
      } as T;

    case "detect_location":
      return {
        city: "Denver",
        region: "CO",
        country: "US",
        timezone: "America/Denver",
      } as T;

    case "get_ghost_config":
      return ghostConfig as T;

    case "set_ghost_config":
      ghostConfig = {
        ...ghostConfig,
        ...(getArg(args, "config") as Partial<MockGhostConfig>),
      };
      saveMockState();
      return undefined as T;

    case "reset_ghost_config":
      ghostConfig = getDefaultGhostConfig();
      saveMockState();
      return undefined as T;

    case "validate_slack_webhook":
    case "test_email_notification":
      return undefined as T;

    case "get_bookmarklet_config":
      return bookmarkletConfig as T;

    case "start_bookmarklet_server": {
      const port = getNumericArg(args, "port") ?? bookmarkletConfig.port;
      bookmarkletConfig = { port, enabled: true };
      saveMockState();
      return undefined as T;
    }

    case "stop_bookmarklet_server":
      bookmarkletConfig = { ...bookmarkletConfig, enabled: false };
      saveMockState();
      return undefined as T;

    case "set_bookmarklet_port": {
      const port = getNumericArg(args, "port") ?? bookmarkletConfig.port;
      bookmarkletConfig = { ...bookmarkletConfig, port };
      saveMockState();
      return undefined as T;
    }

    case "get_system_info":
      return {
        app_version: "dev",
        platform: "mock",
        os_version: "browser",
        arch: "wasm",
      } as T;

    case "get_config_summary":
      {
        const configWithCompanies = config as {
          company_blacklist?: unknown;
          company_whitelist?: unknown;
        };
        return {
          scrapers_enabled: 3,
          keywords_count: config.keywords_boost.length,
          has_location_prefs: config.location_preferences.cities.length > 0,
          has_salary_prefs: config.salary_floor_usd > 0,
          has_company_blocklist:
            getArrayLength(configWithCompanies.company_blacklist) > 0,
          has_company_allowlist:
            getArrayLength(configWithCompanies.company_whitelist) > 0,
          notifications_configured: Number(config.alerts.email?.enabled ?? false),
          has_resume: Boolean(getActiveResume()),
        } as T;
      }

    case "get_debug_log_events":
      return [] as T;

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
      return applications as T;

    case "create_application": {
      const jobHash = getArg(args, "jobHash") ?? getArg(args, "job_hash");
      const job = jobs.find((candidate) => candidate.hash === jobHash);
      const nextId = Math.max(
        0,
        ...APPLICATION_STATUS_KEYS.flatMap((status) =>
          applications[status].map((application) => application.id),
        ),
      ) + 1;
      applications.to_apply = [
        ...applications.to_apply,
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
      ];
      saveMockState();
      return nextId as T;
    }

    case "update_application_status": {
      const applicationId = getNumericArg(args, "applicationId");
      const status = getArg(args, "status");
      if (applicationId !== undefined && typeof status === "string") {
        moveApplicationStatus(applicationId, status);
        saveMockState();
      }
      return undefined as T;
    }

    case "add_application_notes": {
      const applicationId = getNumericArg(args, "applicationId");
      const notes = getArg(args, "notes");
      if (applicationId !== undefined) {
        updateApplication(applicationId, (application) => ({
          ...application,
          notes: typeof notes === "string" ? notes : null,
        }));
        saveMockState();
      }
      return undefined as T;
    }

    case "get_pending_reminders":
      return pendingReminders as T;

    case "complete_reminder": {
      const reminderId = getNumericArg(args, "reminderId");
      pendingReminders = pendingReminders.filter((reminder) => reminder.id !== reminderId);
      saveMockState();
      return undefined as T;
    }

    case "detect_ghosted_applications":
      return 0 as T;

    case "get_application_stats":
      return mockApplicationStats as T;

    case "get_jobs_by_source":
      return Object.entries(mockStatistics.by_source).map(([source, count]) => ({
        source,
        count,
      })) as T;

    case "get_salary_distribution":
      return [
        { range: "$75k-$100k", count: jobs.filter((j) => j.salary_min < 100000).length },
        { range: "$100k-$150k", count: jobs.filter((j) => j.salary_min >= 100000 && j.salary_min < 150000).length },
        { range: "$150k-$200k", count: jobs.filter((j) => j.salary_min >= 150000 && j.salary_min < 200000).length },
        { range: "$200k+", count: jobs.filter((j) => j.salary_min >= 200000).length },
      ].filter((bucket) => bucket.count > 0) as T;

    // Interview commands
    case "get_upcoming_interviews":
      return interviews as T;

    case "get_past_interviews":
      return [] as T;

    case "schedule_interview": {
      const newId = Math.max(...interviews.map((i) => i.id), 0) + 1;
      const newInterview: MockInterview = {
        id: newId,
        application_id: getArg(args, "applicationId") as number,
        interview_type: getArg(args, "interviewType") as string,
        scheduled_at: getArg(args, "scheduledAt") as string,
        duration_minutes: getArg(args, "durationMinutes") as number,
        location: (getArg(args, "location") as string) || null,
        interviewer_name:
          (getArg(args, "interviewerName") as string) || null,
        interviewer_title:
          (getArg(args, "interviewerTitle") as string) || null,
        notes: (getArg(args, "notes") as string) || null,
        completed: false,
        outcome: null,
        job_title: "Mock Job",
        company: "Mock Company",
      };
      interviews.push(newInterview);
      saveMockState();
      return newId as T;
    }

    case "complete_interview":
      interviews = interviews.map((i): MockInterview =>
        i.id === getArg(args, "interviewId")
          ? {
              ...i,
              completed: true,
              outcome: getArg(args, "outcome") as string,
            }
          : i,
      );
      saveMockState();
      return undefined as T;

    case "delete_interview":
      interviews = interviews.filter(
        (i) => i.id !== getArg(args, "interviewId"),
      );
      saveMockState();
      return undefined as T;

    // Deduplication commands
    case "find_duplicates":
      return [] as T;

    case "merge_duplicates":
      return undefined as T;

    // Resume commands
    case "get_active_resume":
      return getActiveResume() as T;

    case "list_all_resumes":
      return resumes as T;

    case "set_active_resume": {
      const resumeId = getResumeIdArg(args);
      if (typeof resumeId === "number" && resumes.some((resume) => resume.id === resumeId)) {
        resumes = resumes.map((resume) => ({
          ...resume,
          is_active: resume.id === resumeId,
        }));
        saveMockState();
      }
      return undefined as T;
    }

    case "upload_resume": {
      const name = getStringArg(args, "name") ?? "Resume.pdf";
      const filePath = getStringArg(args, "filePath") ?? getStringArg(args, "file_path") ?? "";
      return createMockResume(name, filePath) as T;
    }

    case "import_json_resume": {
      const name = getStringArg(args, "name") ?? "Imported Resume";
      return createMockResume(`${name}.json`, `${name}.json`) as T;
    }

    case "delete_resume": {
      const resumeId = getResumeIdArg(args);
      if (typeof resumeId === "number") {
        const wasActive = resumes.some((resume) => resume.id === resumeId && resume.is_active);
        resumes = resumes.filter((resume) => resume.id !== resumeId);
        userSkills = userSkills.filter((skill) => skill.resume_id !== resumeId);
        recentMatches = recentMatches.filter((match) => match.resume_id !== resumeId);
        if (wasActive && resumes.length > 0) {
          resumes = resumes.map((resume, index) => ({
            ...resume,
            is_active: index === 0,
          }));
        }
        saveMockState();
      }
      return undefined as T;
    }

    case "get_user_skills": {
      const resumeId = getResumeIdArg(args);
      return userSkills.filter((skill) => skill.resume_id === resumeId) as T;
    }

    case "add_user_skill": {
      const resumeId = getResumeIdArg(args);
      const skill = normalizeSkillInput(getArg(args, "skill"));
      if (typeof resumeId !== "number" || typeof skill.skill_name !== "string") {
        return undefined as T;
      }

      const newSkill: MockUserSkill = {
        id: getNextId(userSkills),
        resume_id: resumeId,
        skill_name: skill.skill_name,
        skill_category: typeof skill.skill_category === "string" ? skill.skill_category : null,
        confidence_score: 1,
        years_experience:
          typeof skill.years_experience === "number" ? skill.years_experience : null,
        proficiency_level:
          typeof skill.proficiency_level === "string" ? skill.proficiency_level : null,
        source: "manual",
      };
      userSkills.push(newSkill);
      saveMockState();
      return newSkill.id as T;
    }

    case "update_user_skill": {
      const skillId = getSkillIdArg(args);
      const updates = normalizeSkillInput(getArg(args, "updates"));
      userSkills = userSkills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,
              skill_name:
                typeof updates.skill_name === "string" ? updates.skill_name : skill.skill_name,
              skill_category:
                typeof updates.skill_category === "string"
                  ? updates.skill_category
                  : skill.skill_category,
              proficiency_level:
                typeof updates.proficiency_level === "string"
                  ? updates.proficiency_level
                  : skill.proficiency_level,
              years_experience:
                typeof updates.years_experience === "number"
                  ? updates.years_experience
                  : skill.years_experience,
              source: "manual",
            }
          : skill,
      );
      saveMockState();
      return undefined as T;
    }

    case "delete_user_skill": {
      const skillId = getSkillIdArg(args);
      userSkills = userSkills.filter((skill) => skill.id !== skillId);
      saveMockState();
      return undefined as T;
    }

    case "get_recent_matches": {
      const resumeId = getResumeIdArg(args);
      const limit = getNumericArg(args, "limit") ?? 10;
      return recentMatches
        .filter((match) => match.resume_id === resumeId)
        .slice(0, limit) as T;
    }

    case "match_resume_to_job": {
      const resumeId = getResumeIdArg(args);
      const jobHash = getStringArg(args, "jobHash") ?? getStringArg(args, "job_hash");
      const job = jobs.find((item) => item.hash === jobHash);
      if (typeof resumeId !== "number" || !jobHash || !job) {
        return undefined as T;
      }

      const skills = userSkills
        .filter((skill) => skill.resume_id === resumeId)
        .map((skill) => skill.skill_name);
      const match: MockMatchResult = {
        id: getNextId(recentMatches),
        resume_id: resumeId,
        job_hash: jobHash,
        job_title: job.title,
        company: job.company,
        overall_match_score: Math.round(job.score * 100),
        skills_match_score: Math.round(job.score * 100),
        experience_match_score: Math.max(0, Math.round(job.score * 100) - 5),
        education_match_score: null,
        matching_skills: skills.slice(0, 3),
        missing_skills: ["Kubernetes"],
        gap_analysis: "✓ Existing skills align\n✗ Add Kubernetes evidence",
        created_at: new Date().toISOString(),
      };
      recentMatches = [
        match,
        ...recentMatches.filter((item) => item.job_hash !== jobHash),
      ];
      saveMockState();
      return match as T;
    }

    // Salary commands
    case "predict_salary":
      return { min: 120000, max: 160000, median: 140000 } as T;

    case "get_salary_benchmark":
      return { p25: 110000, p50: 140000, p75: 170000, p90: 200000 } as T;

    // Market intelligence
    case "get_trending_skills":
      return [
        { skill_name: "Rust", total_jobs: 245, avg_salary: 175000, change_percent: 45, trend_direction: "up" },
        { skill_name: "TypeScript", total_jobs: 512, avg_salary: 155000, change_percent: 32, trend_direction: "up" },
        { skill_name: "Kubernetes", total_jobs: 189, avg_salary: 165000, change_percent: 28, trend_direction: "up" },
        { skill_name: "Python", total_jobs: 678, avg_salary: 145000, change_percent: 20, trend_direction: "stable" },
        { skill_name: "AWS", total_jobs: 423, avg_salary: 160000, change_percent: 18, trend_direction: "up" },
      ] as T;

    case "get_active_companies":
      return [
        { company_name: "TechCorp", total_posted: 45, avg_active: 15, hiring_trend: "up", avg_salary: 165000, growth_rate: 25 },
        { company_name: "StartupXYZ", total_posted: 22, avg_active: 8, hiring_trend: "up", avg_salary: 155000, growth_rate: 40 },
        { company_name: "BigTech Inc", total_posted: 78, avg_active: 22, hiring_trend: "stable", avg_salary: 185000, growth_rate: 15 },
      ] as T;

    case "get_hottest_locations":
      return [
        { location: "San Francisco, CA", city: "San Francisco", state: "CA", total_jobs: 245, avg_median_salary: 185000, remote_percent: 35 },
        { location: "New York, NY", city: "New York", state: "NY", total_jobs: 198, avg_median_salary: 175000, remote_percent: 28 },
        { location: "Remote", city: null, state: null, total_jobs: 312, avg_median_salary: 165000, remote_percent: 100 },
        { location: "Seattle, WA", city: "Seattle", state: "WA", total_jobs: 156, avg_median_salary: 178000, remote_percent: 42 },
      ] as T;

    case "get_market_alerts":
      return [] as T;

    case "get_market_snapshot":
      return {
        date: new Date().toISOString(),
        total_jobs: 911,
        new_jobs_today: 47,
        jobs_filled_today: 12,
        avg_salary: 165000,
        median_salary: 155000,
        remote_job_percentage: 42,
        top_skill: "TypeScript",
        top_company: "BigTech Inc",
        jobs_30d_change: 8.5,
        salary_30d_change: 2.1,
        market_sentiment: "bullish",
      } as T;

    case "run_market_analysis":
      return { success: true } as T;

    case "mark_alert_read":
      return undefined as T;

    case "mark_all_alerts_read":
      return undefined as T;

    // Automation / One-Click Apply
    case "get_application_profile":
      return {
        full_name: "John Doe",
        email: "john@example.com",
        phone: "+1 (555) 123-4567",
        linkedin_url: "https://linkedin.com/in/johndoe",
        github_url: "https://github.com/johndoe",
        portfolio_url: "https://johndoe.com",
        website_url: "https://blog.johndoe.com",
        resume_path: null,
        us_work_authorized: true,
        requires_sponsorship: false,
        max_applications_per_day: 10,
        require_manual_approval: true,
      } as T;

    case "get_automation_stats":
      return {
        total_attempts: 42,
        submitted: 38,
        pending: 4,
        success_rate: 90.5,
      } as T;

    // Search history and saved searches
    case "get_search_history":
      return [] as T;

    case "list_saved_searches":
      return [] as T;

    case "save_search":
      return { id: 1, name: args?.name, query: args?.query } as T;

    case "delete_saved_search":
      return undefined as T;

    default:
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
  applications = cloneApplications(mockApplications);
  pendingReminders = [...mockPendingReminders];
  credentials = {};
  ghostConfig = getDefaultGhostConfig();
  bookmarkletConfig = {
    port: 4321,
    enabled: false,
  };
  resumes = [];
  userSkills = [];
  recentMatches = [];
  saveMockState();
}
