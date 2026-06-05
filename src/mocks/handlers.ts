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
import {
  assertMockDeepLinkUrl,
  buildMockImportedJob,
  generateMockDeepLink,
  generateMockDeepLinks,
  getMockSitesByCategory,
  getMockSupportedSites,
  isExternalHttpUrl,
  previewMockJobImport as buildMockJobImportPreview,
  type MockJobImportPreview,
  type MockJobImportResult,
} from "./handlers/sourceLinksAndImports";
import {
  generateMockFeedbackReport,
  getMockConfigSummary,
  getMockFeedbackFilename,
  getMockSystemInfo,
  sanitizeMockFeedbackText,
  saveMockFeedbackFile,
} from "./handlers/supportReports";
import {
  getAllMockSmokeTestResults,
  getMockExpiringCredentials,
  getMockHealthSummary,
  getMockLatestSourceRequest,
  getMockScraperHealth,
  getMockScraperRuns,
  getMockSmokeTestResultForArgs,
  hasConfiguredJobsWithGpt,
  hasEnabledMockScraperSource,
  updateMockScraperEnabled,
} from "./handlers/scraperHealth";
import {
  getMockInterviewFollowup,
  getMockInterviewPrepChecklist,
  normalizeInterviewFollowUpState,
  normalizeInterviewPrepState,
  saveMockInterviewFollowup,
  saveMockInterviewPrepItem,
} from "./handlers/interviewProgress";
import {
  getDefaultMockCoverLetterTemplates,
  getNextMockCoverLetterTemplateId,
  getNextMockSavedSearchId,
  normalizeMockCoverLetterTemplate,
  normalizeMockNotificationPreferences,
  normalizeMockSavedSearch,
} from "./handlers/coreCommands";
import {
  buildMockApplicationProfileFromInput,
  getDefaultMockApplicationProfile,
  getDefaultMockScreeningAnswers,
  getMockApplicationProfileEdit,
  getMockApplicationProfilePreview,
  getMockSuggestedAnswers as getMockSuggestedAnswersForState,
  normalizeMockApplicationProfile,
  normalizeMockScreeningAnswer,
  upsertMockScreeningAnswer as upsertMockScreeningAnswerState,
} from "./handlers/applicationProfile";
import { ATS_POWER_WORDS } from "./handlers/resumeAnalysis";
import {
  getMockAtsPlatform,
  getMockAtsPlatformDetection,
} from "./handlers/atsPlatform";
import { improveMockBulletPoint } from "./handlers/resumeBulletPrompts";
import {
  analyzeMockResumeForJob,
  analyzeMockResumeFormat,
} from "./handlers/resumeAnalysisRunner";
import { extractMockAtsKeywords } from "./handlers/resumeKeywordMatching";
import {
  generateMockNegotiationScript,
  getMockSalaryBenchmark,
} from "./handlers/salary";
import {
  getDefaultMarketAlerts,
  getMockActiveCompanies,
  getMockHottestLocations,
  getMockMarketSnapshot,
  getMockTrendingSkills,
} from "./handlers/marketIntelligence";
import {
  exportMockResumeText,
  getEmptyBuilderContact,
  getResumeTemplates,
  normalizeBuilderContact,
  normalizeBuilderEducation,
  normalizeBuilderExperience,
  normalizeBuilderSkill,
  normalizeResumeDraft,
  renderMockResumeHtml,
} from "./handlers/resumeBuilder";
import {
  APPLICATION_STATUS_KEYS,
  cloneApplications,
  getArg,
  getDefaultGhostConfig,
  getJobId,
  getNextId,
  getNumericArg,
  getResumeIdArg,
  getSkillIdArg,
  getStringArg,
  hasConfiguredUrlList,
  hasOwnInputKey,
  isCredentialKey,
  normalizeApplications,
  normalizeProfileInput,
  normalizeSkillInput,
  skillYearsOrNull,
  toScoreFraction,
  trimmedStringOrNull,
} from "./handlers/commandHelpers";
import type {
  MockApplication,
  MockApplications,
  MockApplicationStatus,
  MockApplicationProfile,
  MockBookmarkletConfig,
  MockBuilderSkill,
  MockConfig,
  MockCoverLetterTemplate,
  MockCredentialKey,
  MockDashboardPreferences,
  MockFillResultWithAttempt,
  MockGhostConfig,
  MockInterview,
  MockInterviewFollowUpState,
  MockInterviewPrepState,
  MockJob,
  MockMarketAlert,
  MockMatchResult,
  MockPendingReminder,
  MockResumeData,
  MockResumeDraft,
  MockResumeSummary,
  MockResumeTextPreview,
  MockSavedSearch,
  MockScreeningAnswer,
  MockScraperEnabledOverrides,
  MockState,
  MockUserSkill,
  NotificationPreferences,
} from "./handlers/types";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory state for mock data
let jobs = [...mockJobs];
let config = { ...mockConfig };
let interviews: MockInterview[] = [...mockUpcomingInterviews];
let applications: MockApplications = cloneApplications(mockApplications);
let pendingReminders: MockPendingReminder[] = [...mockPendingReminders];
let coverLetterTemplates: MockCoverLetterTemplate[] = [];
let savedSearches: MockSavedSearch[] = [];
let searchHistory: string[] = [];
let notificationPreferences: NotificationPreferences | null = null;
let credentials: Partial<Record<MockCredentialKey, string>> = {};
let ghostConfig: MockGhostConfig = getDefaultGhostConfig();
let bookmarkletConfig: MockBookmarkletConfig = {
  port: 4321,
  enabled: false,
};
let resumes: MockResumeData[] = [];
let userSkills: MockUserSkill[] = [];
let resumeDrafts: MockResumeDraft[] = [];
let recentMatches: MockMatchResult[] = [];
let marketAlerts: MockMarketAlert[] = getDefaultMarketAlerts();
let applicationProfile: MockApplicationProfile | null = getDefaultMockApplicationProfile();
let screeningAnswers: MockScreeningAnswer[] = getDefaultMockScreeningAnswers();
let scraperEnabledOverrides: MockScraperEnabledOverrides = {};
let interviewPrepChecklists: MockInterviewPrepState = {};
let interviewFollowups: MockInterviewFollowUpState = {};
let automationBrowserRunning = false;
let nextAutomationAttemptId = 1;

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

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
    coverLetterTemplates,
    savedSearches,
    searchHistory,
    notificationPreferences,
    credentials,
    ghostConfig,
    bookmarkletConfig,
    resumes,
    userSkills,
    resumeDrafts,
    recentMatches,
    marketAlerts,
    applicationProfile,
    screeningAnswers,
    scraperEnabledOverrides,
    interviewPrepChecklists,
    interviewFollowups,
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
    if (Array.isArray(state.coverLetterTemplates)) {
      coverLetterTemplates = state.coverLetterTemplates.map((template) =>
        normalizeMockCoverLetterTemplate(
          template,
          getNextMockCoverLetterTemplateId(coverLetterTemplates),
        ),
      );
    }
    if (Array.isArray(state.savedSearches)) {
      savedSearches = state.savedSearches.map((search) =>
        normalizeMockSavedSearch(search, getNextMockSavedSearchId(savedSearches)),
      );
    }
    if (Array.isArray(state.searchHistory)) {
      searchHistory = state.searchHistory.filter(
        (query): query is string => typeof query === "string" && query.trim().length >= 2,
      );
    }
    if (state.notificationPreferences && typeof state.notificationPreferences === "object") {
      notificationPreferences = normalizeMockNotificationPreferences(state.notificationPreferences);
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
    if (Array.isArray(state.resumeDrafts)) {
      resumeDrafts = state.resumeDrafts
        .filter((draft) => draft && typeof draft === "object")
        .map((draft) => normalizeResumeDraft(draft));
    }
    if (Array.isArray(state.recentMatches)) recentMatches = state.recentMatches;
    if (Array.isArray(state.marketAlerts)) marketAlerts = state.marketAlerts;
    if ("applicationProfile" in state) {
      applicationProfile =
        state.applicationProfile && typeof state.applicationProfile === "object"
          ? normalizeMockApplicationProfile(state.applicationProfile)
          : null;
    }
    if (Array.isArray(state.screeningAnswers)) {
      screeningAnswers = state.screeningAnswers
        .filter((answer) => answer && typeof answer === "object")
        .map((answer) => normalizeMockScreeningAnswer(answer));
    }
    if (state.scraperEnabledOverrides && typeof state.scraperEnabledOverrides === "object") {
      scraperEnabledOverrides = state.scraperEnabledOverrides;
    }
    if (state.interviewPrepChecklists && typeof state.interviewPrepChecklists === "object") {
      interviewPrepChecklists = normalizeInterviewPrepState(state.interviewPrepChecklists);
    }
    if (state.interviewFollowups && typeof state.interviewFollowups === "object") {
      interviewFollowups = normalizeInterviewFollowUpState(state.interviewFollowups);
    }
  } catch {
    window.localStorage.removeItem(MOCK_STATE_KEY);
  }
}

loadMockState();

function previewMockJobImport(args?: Record<string, unknown>): MockJobImportPreview {
  return buildMockJobImportPreview(
    args,
    jobs.map((job) => job.url),
  );
}

function importMockJobFromUrl(args?: Record<string, unknown>): MockJobImportResult {
  const preview = previewMockJobImport(args);
  if (preview.already_exists) {
    throw new Error("This job is already in your saved jobs");
  }

  const job = buildMockImportedJob(preview, getNextId(jobs), new Date().toISOString());
  jobs = [job, ...jobs];
  saveMockState();
  return { jobId: job.id };
}

function getMockDashboardPreferences(): MockDashboardPreferences {
  return {
    autoRefresh: { ...config.auto_refresh },
    salaryFloorUsd: config.salary_floor_usd,
    anyJobSourceEnabled: anyMockJobSourceEnabled(),
  };
}

function anyMockJobSourceEnabled(): boolean {
  const configRecord = config as Record<string, unknown>;
  return (
    hasEnabledMockScraperSource(configRecord) ||
    hasConfiguredUrlList(configRecord, "greenhouse_urls") ||
    hasConfiguredUrlList(configRecord, "lever_urls") ||
    hasConfiguredJobsWithGpt(configRecord)
  );
}

function createMockResumeDraft(): number {
  const now = new Date().toISOString();
  const id = getNextId(resumeDrafts);
  resumeDrafts.push({
    id,
    contact: getEmptyBuilderContact(),
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    created_at: now,
    updated_at: now,
  });
  saveMockState();
  return id;
}

function getResumeDraft(args?: Record<string, unknown>): MockResumeDraft | undefined {
  const resumeId = getResumeIdArg(args);
  return resumeDrafts.find((draft) => draft.id === resumeId);
}

function updateResumeDraft(
  resumeId: number | undefined,
  updater: (draft: MockResumeDraft) => MockResumeDraft,
): void {
  if (typeof resumeId !== "number") throw new Error("Resume draft not found");

  const found = resumeDrafts.some((draft) => draft.id === resumeId);
  if (!found) throw new Error("Resume draft not found");
  resumeDrafts = resumeDrafts.map((draft) =>
    draft.id === resumeId
      ? updater({ ...draft, updated_at: new Date().toISOString() })
      : draft,
  );
  saveMockState();
}

function fillMockApplicationForm(args?: Record<string, unknown>): MockFillResultWithAttempt {
  const jobUrl = getStringArg(args, "jobUrl") ?? getStringArg(args, "job_url") ?? "";
  if (!isExternalHttpUrl(jobUrl)) {
    throw new Error("This application link is not safe to open");
  }

  automationBrowserRunning = true;
  const platform = getMockAtsPlatform(jobUrl);
  const hasJobHash = Boolean(getStringArg(args, "jobHash") ?? getStringArg(args, "job_hash"));
  const attemptId = hasJobHash ? nextAutomationAttemptId++ : null;
  const screeningFields = screeningAnswers
    .slice(0, 2)
    .map((_, index) => `screening:savedAnswer${index + 1}`);

  return {
    filledFields: ["firstName", "lastName", "email", "phone", "resume", ...screeningFields],
    unfilledFields: platform === "unknown" ? ["customQuestion"] : [],
    captchaDetected: false,
    readyForReview: true,
    errorMessage: null,
    attemptId,
    durationMs: 1250,
    atsPlatform: platform,
  };
}

function getActiveResume(): MockResumeData | null {
  return resumes.find((resume) => resume.is_active) ?? null;
}

function toMockResumeSummary(resume: MockResumeData): MockResumeSummary {
  const readableText = (resume.parsed_text ?? "").trim();
  return {
    id: resume.id,
    name: resume.name,
    is_active: resume.is_active,
    created_at: resume.created_at,
    updated_at: resume.updated_at,
    format_label: getMockResumeFormatLabel(resume),
    has_readable_text: readableText.length > 0,
    readable_text_chars: Array.from(readableText).length,
  };
}

function getMockResumeFormatLabel(resume: MockResumeData): string {
  const source = resume.file_path || resume.name;
  const extension = source.split(".").pop()?.toLowerCase() ?? "";

  switch (extension) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "txt":
      return "Plain text";
    case "md":
    case "markdown":
      return "Markdown";
    default:
      return "Resume file";
  }
}

const MAX_MOCK_RESUME_TEXT_PREVIEW_CHARS = 6000;

function toMockResumeTextPreview(resume: MockResumeData): MockResumeTextPreview {
  const readableText = (resume.parsed_text ?? "").trim();
  const textPreview = Array.from(readableText)
    .slice(0, MAX_MOCK_RESUME_TEXT_PREVIEW_CHARS)
    .join("");

  return {
    resume_id: resume.id,
    name: resume.name,
    has_text: readableText.length > 0,
    text_preview: textPreview,
    text_chars: Array.from(readableText).length,
    is_truncated: Array.from(readableText).length > Array.from(textPreview).length,
  };
}

function upsertMockApplicationProfile(args?: Record<string, unknown>): number {
  const input = normalizeProfileInput(getArg(args, "input"));
  applicationProfile = buildMockApplicationProfileFromInput(input, applicationProfile);
  saveMockState();

  return applicationProfile.id;
}

function upsertMockScreeningAnswer(args?: Record<string, unknown>): void {
  screeningAnswers = upsertMockScreeningAnswerState(args, screeningAnswers);
  saveMockState();
}

function createMockResume(name: string, filePath: string): number {
  const now = new Date().toISOString();
  const id = getNextId(resumes);
  resumes = resumes.map((resume) => ({ ...resume, is_active: false }));
  const parsedText = [
    name,
    "Care coordinator supporting intake, scheduling, and case management.",
    "Skills: patient scheduling, community outreach, documentation.",
  ].join("\n");

  resumes.push({
    id,
    name,
    file_path: filePath,
    parsed_text: parsedText,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  saveMockState();
  return id;
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

    case "mark_job_as_real":
      jobs = jobs.map((j) =>
        j.id === getJobId(args)
          ? { ...j, ghost_score: 0, ghost_reasons: null, user_ghost_verdict: "real" }
          : j,
      );
      saveMockState();
      return undefined as T;

    case "mark_job_as_ghost":
      jobs = jobs.map((j) =>
        j.id === getJobId(args)
          ? {
              ...j,
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
          : j,
      );
      saveMockState();
      return undefined as T;

    case "get_job_notes":
      return (jobs.find((j) => j.id === jobId)?.notes || null) as T;

    // Setup/First run
    case "is_first_run":
      // Set to true to test first-run setup, false to show dashboard
      return false as T;

    case "complete_setup": {
      const setupConfig = getArg(args, "config");
      if (setupConfig && typeof setupConfig === "object") {
        config = { ...config, ...(setupConfig as Partial<MockConfig>) };
        saveMockState();
      }
      return undefined as T;
    }

    // Config commands
    case "get_config":
      return config as T;

    case "get_dashboard_preferences":
      return getMockDashboardPreferences() as T;

    case "get_resume_matching_preference":
      return { enabled: Boolean(config.use_resume_matching) } as T;

    case "set_resume_matching_enabled": {
      const enabled = Boolean(getArg(args, "enabled"));
      config = { ...config, use_resume_matching: enabled };
      saveMockState();
      return { enabled } as T;
    }

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

    case "disconnect_linkedin":
      config = {
        ...config,
        linkedin: { ...config.linkedin, enabled: false },
      };
      saveMockState();
      return undefined as T;

    case "linkedin_login":
      throw new Error("LinkedIn automatic monitoring is disabled by JobSentinel source policy");

    case "get_linkedin_expiry_status":
      return {
        connected: false,
        expires_at: null,
        days_remaining: null,
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

    case "copy_bookmarklet_code":
      return undefined as T;

    case "start_bookmarklet_server": {
      const port = getNumericArg(args, "port") ?? bookmarkletConfig.port;
      bookmarkletConfig = { ...bookmarkletConfig, port, enabled: true };
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
      return getMockSystemInfo() as T;

    case "get_config_summary":
      return getMockConfigSummary(config, Boolean(getActiveResume())) as T;

    case "get_debug_log_events":
      return [] as T;

    case "generate_feedback_report":
      return generateMockFeedbackReport(args, config, Boolean(getActiveResume())) as T;

    case "sanitize_feedback_text":
      return sanitizeMockFeedbackText(args) as T;

    case "get_feedback_filename":
      return getMockFeedbackFilename() as T;

    case "save_feedback_file":
      return saveMockFeedbackFile(args) as T;

    case "open_github_issues":
    case "open_google_drive":
      return undefined as T;

    case "reveal_saved_feedback_file": {
      const revealToken = getStringArg(args, "revealToken") ?? getStringArg(args, "reveal_token");
      if (!revealToken) {
        throw new Error("Reveal token cannot be empty");
      }
      return undefined as T;
    }

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

    // Deep-link commands
    case "get_supported_sites":
      return getMockSupportedSites() as T;

    case "get_sites_by_category_cmd":
      return getMockSitesByCategory(args) as T;

    case "generate_deep_links":
      return generateMockDeepLinks(args) as T;

    case "generate_deep_link":
      return generateMockDeepLink(args) as T;

    case "open_deep_link":
      assertMockDeepLinkUrl(getStringArg(args, "url"));
      return undefined as T;

    // Job import commands
    case "preview_job_import":
      return previewMockJobImport(args) as T;

    case "import_job_from_url":
      return importMockJobFromUrl(args) as T;

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
        { range: "$40k-$60k", count: jobs.filter((j) => j.salary_min < 60000).length },
        { range: "$60k-$80k", count: jobs.filter((j) => j.salary_min >= 60000 && j.salary_min < 80000).length },
        { range: "$80k-$100k", count: jobs.filter((j) => j.salary_min >= 80000 && j.salary_min < 100000).length },
        { range: "$100k+", count: jobs.filter((j) => j.salary_min >= 100000).length },
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
    case "get_active_resume": {
      const activeResume = getActiveResume();
      return (activeResume ? toMockResumeSummary(activeResume) : null) as T;
    }

    case "list_all_resumes":
      return resumes.map(toMockResumeSummary) as T;

    case "get_resume_text_preview": {
      const resumeId = getResumeIdArg(args);
      const selectedResume = resumes.find((resume) => resume.id === resumeId);
      if (!selectedResume) {
        throw new Error("Resume not found");
      }
      return toMockResumeTextPreview(selectedResume) as T;
    }

    case "set_active_resume": {
      const resumeId = getResumeIdArg(args);
      if (typeof resumeId !== "number" || !resumes.some((resume) => resume.id === resumeId)) {
        throw new Error("Resume not found");
      }
      resumes = resumes.map((resume) => ({
        ...resume,
        is_active: resume.id === resumeId,
      }));
      saveMockState();
      return undefined as T;
    }

    case "select_and_upload_resume": {
      return createMockResume("Mock Resume", "app-owned://resume-uploads/mock-resume.pdf") as T;
    }

    case "import_json_resume": {
      const name = getStringArg(args, "name") ?? "Imported Resume";
      return createMockResume(`${name}.json`, `${name}.json`) as T;
    }

    case "select_and_import_json_resume": {
      return createMockResume("Imported Resume", "app-owned://resume-imports/imported-resume.json") as T;
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
      const skillName = trimmedStringOrNull(skill.skill_name);
      if (typeof resumeId !== "number" || !skillName) {
        return undefined as T;
      }

      const newSkill: MockUserSkill = {
        id: getNextId(userSkills),
        resume_id: resumeId,
        skill_name: skillName,
        skill_category: trimmedStringOrNull(skill.skill_category),
        confidence_score: 1,
        years_experience: skillYearsOrNull(skill.years_experience),
        proficiency_level: trimmedStringOrNull(skill.proficiency_level),
        source: "manual",
      };
      userSkills.push(newSkill);
      saveMockState();
      return newSkill.id as T;
    }

    case "update_user_skill": {
      const skillId = getSkillIdArg(args);
      const updates = normalizeSkillInput(getArg(args, "updates"));
      if (typeof skillId !== "number" || !userSkills.some((skill) => skill.id === skillId)) {
        throw new Error("Skill not found");
      }
      userSkills = userSkills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,
              skill_name:
                trimmedStringOrNull(updates.skill_name) ?? skill.skill_name,
              skill_category: hasOwnInputKey(updates, "skill_category")
                ? trimmedStringOrNull(updates.skill_category)
                : skill.skill_category,
              proficiency_level: hasOwnInputKey(updates, "proficiency_level")
                ? trimmedStringOrNull(updates.proficiency_level)
                : skill.proficiency_level,
              years_experience: hasOwnInputKey(updates, "years_experience")
                ? skillYearsOrNull(updates.years_experience)
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
      const matchScore = toScoreFraction(job.score);
      const match: MockMatchResult = {
        id: getNextId(recentMatches),
        resume_id: resumeId,
        job_hash: jobHash,
        job_title: job.title,
        company: job.company,
        overall_match_score: matchScore,
        skills_match_score: matchScore,
        experience_match_score: Math.max(0, Number((matchScore - 0.05).toFixed(2))),
        education_match_score: null,
        matching_skills: skills.slice(0, 3),
        missing_skills: ["Role-specific evidence"],
        gap_analysis: "Matching: Existing skills align\nMissing: Add one role-specific example",
        created_at: new Date().toISOString(),
      };
      recentMatches = [
        match,
        ...recentMatches.filter((item) => item.job_hash !== jobHash),
      ];
      saveMockState();
      return match as T;
    }

    case "create_resume_draft":
      return createMockResumeDraft() as T;

    case "get_resume_draft":
      return (getResumeDraft(args) ?? null) as T;

    case "update_resume_contact": {
      const resumeId = getResumeIdArg(args);
      const contact = normalizeBuilderContact(getArg(args, "contact"));
      updateResumeDraft(resumeId, (draft) => ({ ...draft, contact }));
      return undefined as T;
    }

    case "update_resume_summary": {
      const resumeId = getResumeIdArg(args);
      const summary = getStringArg(args, "summary") ?? "";
      updateResumeDraft(resumeId, (draft) => ({ ...draft, summary }));
      return undefined as T;
    }

    case "add_resume_experience": {
      const resumeId = getResumeIdArg(args);
      const draft = getResumeDraft(args);
      const newId = getNextId(draft?.experience ?? []);
      const experience = normalizeBuilderExperience(getArg(args, "experience"), newId);
      updateResumeDraft(resumeId, (current) => ({
        ...current,
        experience: [...current.experience, { ...experience, id: newId }],
      }));
      return newId as T;
    }

    case "delete_resume_experience": {
      const resumeId = getResumeIdArg(args);
      const experienceId =
        getNumericArg(args, "experienceId") ?? getNumericArg(args, "experience_id");
      const draft = getResumeDraft(args);
      if (!draft || !draft.experience.some((experience) => experience.id === experienceId)) {
        throw new Error("Experience entry not found");
      }
      updateResumeDraft(resumeId, (draft) => ({
        ...draft,
        experience: draft.experience.filter((experience) => experience.id !== experienceId),
      }));
      return undefined as T;
    }

    case "add_resume_education": {
      const resumeId = getResumeIdArg(args);
      const draft = getResumeDraft(args);
      const newId = getNextId(draft?.education ?? []);
      const education = normalizeBuilderEducation(getArg(args, "education"), newId);
      updateResumeDraft(resumeId, (current) => ({
        ...current,
        education: [...current.education, { ...education, id: newId }],
      }));
      return newId as T;
    }

    case "delete_resume_education": {
      const resumeId = getResumeIdArg(args);
      const educationId =
        getNumericArg(args, "educationId") ?? getNumericArg(args, "education_id");
      const draft = getResumeDraft(args);
      if (!draft || !draft.education.some((education) => education.id === educationId)) {
        throw new Error("Education entry not found");
      }
      updateResumeDraft(resumeId, (draft) => ({
        ...draft,
        education: draft.education.filter((education) => education.id !== educationId),
      }));
      return undefined as T;
    }

    case "set_resume_skills": {
      const resumeId = getResumeIdArg(args);
      const rawSkills = getArg(args, "skills");
      const skills = Array.isArray(rawSkills)
        ? rawSkills.map(normalizeBuilderSkill).filter((skill): skill is MockBuilderSkill => !!skill)
        : [];
      updateResumeDraft(resumeId, (draft) => ({ ...draft, skills }));
      return undefined as T;
    }

    case "delete_resume_draft": {
      const resumeId = getResumeIdArg(args);
      if (typeof resumeId !== "number" || !resumeDrafts.some((draft) => draft.id === resumeId)) {
        throw new Error("Resume draft not found");
      }
      resumeDrafts = resumeDrafts.filter((draft) => draft.id !== resumeId);
      saveMockState();
      return undefined as T;
    }

    case "list_resume_templates":
      return getResumeTemplates() as T;

    case "render_resume_html":
      return renderMockResumeHtml(getArg(args, "resume")) as T;

    case "analyze_resume_format":
      return analyzeMockResumeFormat(getArg(args, "resume")) as T;

    case "analyze_resume_for_job":
      return analyzeMockResumeForJob(
        getArg(args, "resume"),
        getStringArg(args, "jobDescription") ?? "",
      ) as T;

    case "analyze_active_resume_for_job": {
      const activeResume = getActiveResume();
      if (!activeResume) {
        throw new Error("Choose or add a resume before reviewing job fit.");
      }

      const readableText = (activeResume.parsed_text ?? "").trim();
      if (!readableText) {
        throw new Error("JobSentinel could not find readable text in the active resume.");
      }

      return analyzeMockResumeForJob(
        {
          summary: readableText,
          experience: [],
          skills: [],
          education: [],
          certifications: [],
          projects: [],
          custom_sections: {},
        },
        getStringArg(args, "jobDescription") ?? "",
      ) as T;
    }

    case "get_ats_power_words":
      return [...ATS_POWER_WORDS] as T;

    case "improve_bullet_point":
      return improveMockBulletPoint(args, extractMockAtsKeywords) as T;

    case "export_resume_docx":
      return [80, 75, 3, 4, 20, 0, 0, 0] as T;

    case "export_resume_html":
      return renderMockResumeHtml(getArg(args, "resume")) as T;

    case "export_resume_text": {
      return exportMockResumeText(getArg(args, "resume")) as T;
    }

    // Salary commands
    case "predict_salary":
      return { min: 55000, max: 76000, median: 65000 } as T;

    case "get_salary_benchmark":
      return getMockSalaryBenchmark(args) as T;

    case "generate_negotiation_script":
      return generateMockNegotiationScript(args) as T;

    // Market intelligence
    case "get_trending_skills":
      return getMockTrendingSkills() as T;

    case "get_active_companies":
      return getMockActiveCompanies() as T;

    case "get_hottest_locations":
      return getMockHottestLocations() as T;

    case "get_market_alerts":
      return marketAlerts as T;

    case "get_market_snapshot":
      return getMockMarketSnapshot() as T;

    case "run_market_analysis":
      return { success: true } as T;

    case "mark_alert_read":
      marketAlerts = marketAlerts.map((alert) =>
        alert.id === getNumericArg(args, "id")
          ? { ...alert, is_read: true }
          : alert,
      );
      saveMockState();
      return undefined as T;

    case "mark_all_alerts_read":
      marketAlerts = marketAlerts.map((alert) => ({ ...alert, is_read: true }));
      saveMockState();
      return undefined as T;

    // Application Assist
    case "has_application_profile":
      return Boolean(applicationProfile) as T;

    case "get_application_profile_preview":
      return getMockApplicationProfilePreview(applicationProfile) as T;

    case "get_application_profile":
      return getMockApplicationProfileEdit(applicationProfile) as T;

    case "select_application_resume_file":
      return {
        token: "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--mock-resume.pdf",
        fileName: "mock-resume.pdf",
      } as T;

    case "upsert_application_profile":
      return upsertMockApplicationProfile(args) as T;

    case "get_screening_answers":
      return screeningAnswers as T;

    case "upsert_screening_answer":
      upsertMockScreeningAnswer(args);
      return undefined as T;

    case "get_automation_stats":
      return {
        totalAttempts: 42,
        submitted: 38,
        failed: 0,
        pending: 4,
        successRate: 90.476,
      } as T;

    case "detect_ats_platform":
      return getMockAtsPlatformDetection(getStringArg(args, "url") ?? "") as T;

    case "fill_application_form":
      return fillMockApplicationForm(args) as T;

    case "is_browser_running":
      return automationBrowserRunning as T;

    case "close_automation_browser":
      automationBrowserRunning = false;
      return undefined as T;

    case "mark_attempt_submitted":
      return undefined as T;

    case "get_suggested_answers":
      return getMockSuggestedAnswersForState(args, screeningAnswers) as T;

    // Scraper health commands
    case "get_health_summary":
      return getMockHealthSummary(scraperEnabledOverrides) as T;

    case "get_scraper_health":
      return getMockScraperHealth(scraperEnabledOverrides) as T;

    case "get_expiring_credentials":
      return getMockExpiringCredentials() as T;

    case "set_scraper_enabled": {
      const updatedOverrides = updateMockScraperEnabled(args, scraperEnabledOverrides);
      if (updatedOverrides !== scraperEnabledOverrides) {
        scraperEnabledOverrides = updatedOverrides;
        saveMockState();
      }
      return undefined as T;
    }

    case "get_scraper_runs":
      return getMockScraperRuns(args) as T;

    case "get_latest_source_request":
      return getMockLatestSourceRequest(args, config) as T;

    case "run_scraper_smoke_test":
      return getMockSmokeTestResultForArgs(args, scraperEnabledOverrides) as T;

    case "run_all_smoke_tests":
      return getAllMockSmokeTestResults(scraperEnabledOverrides) as T;

    // Interview prep and follow-up commands
    case "get_interview_prep_checklist":
      return getMockInterviewPrepChecklist(args, interviewPrepChecklists) as T;

    case "save_interview_prep_item":
      interviewPrepChecklists = saveMockInterviewPrepItem(args, interviewPrepChecklists);
      saveMockState();
      return undefined as T;

    case "get_interview_followup":
      return getMockInterviewFollowup(args, interviewFollowups) as T;

    case "save_interview_followup": {
      const result = saveMockInterviewFollowup(args, interviewFollowups);
      interviewFollowups = result.state;
      saveMockState();
      return result.followup as T;
    }

    // Cover letter templates
    case "seed_default_templates": {
      if (coverLetterTemplates.length > 0) {
        return 0 as T;
      }
      coverLetterTemplates = getDefaultMockCoverLetterTemplates();
      saveMockState();
      return coverLetterTemplates.length as T;
    }

    case "list_cover_letter_templates":
      return coverLetterTemplates.map((template) => ({ ...template })) as T;

    case "get_cover_letter_template":
      return (
        coverLetterTemplates.find((template) => template.id === getStringArg(args, "id")) ?? null
      ) as T;

    case "create_cover_letter_template": {
      const now = new Date().toISOString();
      const template = normalizeMockCoverLetterTemplate({
        id: getNextMockCoverLetterTemplateId(coverLetterTemplates),
        name: getStringArg(args, "name"),
        content: getStringArg(args, "content"),
        category: getStringArg(args, "category"),
        createdAt: now,
        updatedAt: now,
      }, getNextMockCoverLetterTemplateId(coverLetterTemplates));
      coverLetterTemplates = [
        template,
        ...coverLetterTemplates.filter((existing) => existing.id !== template.id),
      ];
      saveMockState();
      return { ...template } as T;
    }

    case "update_cover_letter_template": {
      const id = getStringArg(args, "id");
      const existingTemplate = coverLetterTemplates.find((template) => template.id === id);
      if (!existingTemplate) {
        return null as T;
      }

      const updatedTemplate = normalizeMockCoverLetterTemplate({
        ...existingTemplate,
        name: getStringArg(args, "name") ?? existingTemplate.name,
        content: getStringArg(args, "content") ?? existingTemplate.content,
        category: getStringArg(args, "category") ?? existingTemplate.category,
        updatedAt: new Date().toISOString(),
      }, getNextMockCoverLetterTemplateId(coverLetterTemplates));
      coverLetterTemplates = coverLetterTemplates.map((template) =>
        template.id === id ? updatedTemplate : template,
      );
      saveMockState();
      return { ...updatedTemplate } as T;
    }

    case "delete_cover_letter_template": {
      const id = getStringArg(args, "id");
      const initialLength = coverLetterTemplates.length;
      coverLetterTemplates = coverLetterTemplates.filter((template) => template.id !== id);
      const deleted = coverLetterTemplates.length !== initialLength;
      if (deleted) saveMockState();
      return deleted as T;
    }

    // Notification preferences
    case "get_notification_preferences": {
      if (!notificationPreferences) {
        notificationPreferences = normalizeMockNotificationPreferences(null);
        saveMockState();
      }
      return normalizeMockNotificationPreferences(notificationPreferences) as T;
    }

    case "save_notification_preferences":
      notificationPreferences = normalizeMockNotificationPreferences(getArg(args, "prefs"));
      saveMockState();
      return undefined as T;

    // Search history and saved searches
    case "get_search_history": {
      const limit = Math.max(0, Math.min(getNumericArg(args, "limit") ?? 20, 50));
      return searchHistory.slice(0, limit) as T;
    }

    case "list_saved_searches":
      return savedSearches.map((search) => ({ ...search })) as T;

    case "create_saved_search": {
      const search = {
        ...normalizeMockSavedSearch(
          getArg(args, "search"),
          getNextMockSavedSearchId(savedSearches),
        ),
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      };
      savedSearches = [search, ...savedSearches.filter((saved) => saved.id !== search.id)];
      saveMockState();
      return { ...search } as T;
    }

    case "use_saved_search": {
      let found = false;
      const lastUsedAt = new Date().toISOString();
      savedSearches = savedSearches.map((search) => {
        if (search.id !== getStringArg(args, "id")) return search;
        found = true;
        return { ...search, lastUsedAt };
      });
      if (found) saveMockState();
      return found as T;
    }

    case "delete_saved_search": {
      const id = getStringArg(args, "id");
      const initialLength = savedSearches.length;
      savedSearches = savedSearches.filter((search) => search.id !== id);
      const deleted = savedSearches.length !== initialLength;
      if (deleted) saveMockState();
      return deleted as T;
    }

    case "add_search_history": {
      const query = getStringArg(args, "query")?.trim();
      if (query && query.length >= 2) {
        searchHistory = [
          query,
          ...searchHistory.filter((entry) => entry !== query),
        ].slice(0, 50);
        saveMockState();
      }
      return undefined as T;
    }

    case "clear_search_history":
      searchHistory = [];
      saveMockState();
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
  coverLetterTemplates = [];
  savedSearches = [];
  searchHistory = [];
  notificationPreferences = null;
  credentials = {};
  ghostConfig = getDefaultGhostConfig();
  bookmarkletConfig = {
    port: 4321,
    enabled: false,
  };
  resumes = [];
  userSkills = [];
  resumeDrafts = [];
  recentMatches = [];
  marketAlerts = getDefaultMarketAlerts();
  applicationProfile = getDefaultMockApplicationProfile();
  screeningAnswers = getDefaultMockScreeningAnswers();
  saveMockState();
}
