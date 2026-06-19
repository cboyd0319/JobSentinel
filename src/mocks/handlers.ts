/**
 * Mock handlers for Tauri commands
 * Used for development without the Rust backend
 */

import {
  mockJobs,
  mockConfig,
  mockApplications,
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
  isExternalHttpsUrl,
  previewMockJobImport as buildMockJobImportPreview,
  type MockJobImportPreview,
  type MockJobImportResult,
} from "./handlers/sourceLinksAndImports";
import {
  getAllMockSmokeTestResults,
  getMockExpiringCredentials,
  getMockHealthSummary,
  getMockLatestSourceRequest,
  getMockScraperHealth,
  getMockScraperRuns,
  getMockSmokeTestResultForArgs,
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
import { handleMockJobTrackingCommand } from "./handlers/jobTrackingCommands";
import { handleMockSettingsSupportCommand } from "./handlers/settingsSupportCommands";
import { handleMockUserDataCommand } from "./handlers/userDataCommands";
import {
  getMockActiveResume,
  handleMockResumeCommand,
} from "./handlers/resumeCommands";
import {
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
import {
  getMockAtsPlatform,
  getMockAtsPlatformDetection,
} from "./handlers/atsPlatform";
import {
  generateMockNegotiationScript,
  getMockSalaryBenchmark,
} from "./handlers/salary";
import {
  sanitizeLinkedInWorkbenchTextForStorage,
  sanitizeLinkedInWorkbenchUrl,
} from "../shared/linkedinWorkbench";
import {
  getDefaultMarketAlerts,
  getMockActiveCompanies,
  getMockHottestLocations,
  getMockMarketSnapshot,
  getMockTrendingSkills,
} from "./handlers/marketIntelligence";
import { normalizeResumeDraft } from "./handlers/resumeBuilder";
import {
  APPLICATION_STATUS_KEYS,
  cloneApplications,
  getArg,
  getDefaultGhostConfig,
  getNextId,
  getNumericArg,
  getStringArg,
  normalizeApplications,
  normalizeProfileInput,
} from "./handlers/commandHelpers";
import type {
  MockApplications,
  MockApplicationProfile,
  MockApplicationStatus,
  MockBookmarkletConfig,
  MockCoverLetterTemplate,
  MockCredentialKey,
  MockCredentialUnlockState,
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
const defaultCredentialUnlock: MockCredentialUnlockState = {
  mode: "system",
  configured: false,
  unlocked: true,
};
let credentialUnlock: MockCredentialUnlockState = { ...defaultCredentialUnlock };
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
const MOCK_INVOKE_CONTROLS_KEY = "jobsentinel.mockInvokeControls.v1";
const MAX_MOCK_DELAY_MS = 30_000;
const LINKEDIN_WORKBENCH_DEFAULT_TITLE = "LinkedIn application";
const LINKEDIN_WORKBENCH_DEFAULT_COMPANY = "Company needs details";
const LINKEDIN_WORKBENCH_JOBS_URL = "https://www.linkedin.com/jobs/";
const LINKEDIN_WORKBENCH_APPLIED_URL =
  "https://www.linkedin.com/jobs-tracker/?stage=applied";

interface MockInvokeControls {
  delayMs?: unknown;
  delays?: Record<string, unknown>;
  failures?: Record<string, unknown>;
  responses?: Record<string, unknown>;
}

interface MockInvokeControl {
  delayMs: number;
  failureMessage: string | null;
  hasResponse: boolean;
  responseValue: unknown;
}

type MockLinkedInWorkbenchEventType = "applied" | "saved" | "tracking" | "rejected" | "interview" | "follow_up" | "reminder" | "note" | "not_interested";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function isMockCredentialUnlockState(
  value: unknown,
): value is MockCredentialUnlockState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<MockCredentialUnlockState>;
  return (
    (state.mode === "system" || state.mode === "passphrase") &&
    typeof state.configured === "boolean" &&
    typeof state.unlocked === "boolean"
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
    credentialUnlock,
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
    if (isMockCredentialUnlockState(state.credentialUnlock)) {
      credentialUnlock = state.credentialUnlock;
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

function getCommandControlEntry(
  controls: Record<string, unknown> | undefined,
  cmd: string,
): { found: boolean; value: unknown } {
  if (!controls) return { found: false, value: undefined };
  if (Object.prototype.hasOwnProperty.call(controls, cmd)) {
    return { found: true, value: controls[cmd] };
  }
  if (Object.prototype.hasOwnProperty.call(controls, "*")) {
    return { found: true, value: controls["*"] };
  }
  return { found: false, value: undefined };
}

function parseDelayMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(MAX_MOCK_DELAY_MS, Math.max(0, value));
}

function parseFailureMessage(value: unknown): string | null {
  if (value === true) return "Forced mock command failure";
  if (typeof value === "string" && value.trim()) return value.trim();
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message.trim();
  }
  return null;
}

function readMockInvokeControl(cmd: string): MockInvokeControl {
  const defaultDelayMs = 100 + Math.random() * 200;
  if (!canUseStorage()) {
    return {
      delayMs: defaultDelayMs,
      failureMessage: null,
      hasResponse: false,
      responseValue: undefined,
    };
  }

  const rawControls = window.localStorage.getItem(MOCK_INVOKE_CONTROLS_KEY);
  if (!rawControls) {
    return {
      delayMs: defaultDelayMs,
      failureMessage: null,
      hasResponse: false,
      responseValue: undefined,
    };
  }

  try {
    const controls = JSON.parse(rawControls) as MockInvokeControls;
    const commandDelay = parseDelayMs(
      getCommandControlEntry(controls.delays, cmd).value,
    );
    const globalDelay = parseDelayMs(controls.delayMs);
    const failureMessage = parseFailureMessage(
      getCommandControlEntry(controls.failures, cmd).value,
    );
    const response = getCommandControlEntry(controls.responses, cmd);

    return {
      delayMs: commandDelay ?? globalDelay ?? defaultDelayMs,
      failureMessage,
      hasResponse: response.found,
      responseValue: response.value,
    };
  } catch {
    window.localStorage.removeItem(MOCK_INVOKE_CONTROLS_KEY);
    return {
      delayMs: defaultDelayMs,
      failureMessage: null,
      hasResponse: false,
      responseValue: undefined,
    };
  }
}

function applyMockUserDataCommand<T>(
  command: string,
  args: Record<string, unknown> | undefined,
): T {
  const result = handleMockUserDataCommand(command, args, {
    coverLetterTemplates,
    savedSearches,
    searchHistory,
    notificationPreferences,
  });

  if (!result.handled) {
    return undefined as T;
  }

  coverLetterTemplates = result.state.coverLetterTemplates;
  savedSearches = result.state.savedSearches;
  searchHistory = result.state.searchHistory;
  notificationPreferences = result.state.notificationPreferences;

  if (result.shouldSave) {
    saveMockState();
  }

  return result.value as T;
}

function applyMockJobTrackingCommand<T>(
  command: string,
  args: Record<string, unknown> | undefined,
): T {
  const result = handleMockJobTrackingCommand(command, args, {
    jobs,
    applications,
    pendingReminders,
    interviews,
  });

  if (!result.handled) {
    return undefined as T;
  }

  jobs = result.state.jobs;
  applications = result.state.applications;
  pendingReminders = result.state.pendingReminders;
  interviews = result.state.interviews;

  if (result.shouldSave) {
    saveMockState();
  }

  return result.value as T;
}

function applyMockSettingsSupportCommand<T>(
  command: string,
  args: Record<string, unknown> | undefined,
): T {
  const result = handleMockSettingsSupportCommand(
    command,
    args,
    {
      config,
      credentials,
      credentialUnlock,
      ghostConfig,
      bookmarkletConfig,
    },
    Boolean(getMockActiveResume(resumes)),
  );

  if (!result.handled) {
    return undefined as T;
  }

  config = result.state.config;
  credentials = result.state.credentials;
  credentialUnlock = result.state.credentialUnlock;
  ghostConfig = result.state.ghostConfig;
  bookmarkletConfig = result.state.bookmarkletConfig;

  if (result.shouldSave) {
    saveMockState();
  }

  return result.value as T;
}

function applyMockResumeCommand<T>(
  command: string,
  args: Record<string, unknown> | undefined,
): T {
  const result = handleMockResumeCommand(command, args, {
    jobs,
    resumes,
    userSkills,
    resumeDrafts,
    recentMatches,
  });

  if (!result.handled) {
    return undefined as T;
  }

  resumes = result.state.resumes;
  userSkills = result.state.userSkills;
  resumeDrafts = result.state.resumeDrafts;
  recentMatches = result.state.recentMatches;

  if (result.shouldSave) {
    saveMockState();
  }

  return result.value as T;
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

function recordMockLinkedInWorkbenchEvent(args?: Record<string, unknown>) {
  const input = getRecordArg(args, "input");
  const eventType = getLinkedInWorkbenchEventType(input.eventType);
  const title =
    trimMockWorkbenchText(input.title, 500) ?? LINKEDIN_WORKBENCH_DEFAULT_TITLE;
  const company =
    trimMockWorkbenchText(input.company, 200) ?? LINKEDIN_WORKBENCH_DEFAULT_COMPANY;
  const notes = trimMockWorkbenchText(input.notes, 5_000);
  const sanitizedNotes =
    notes === undefined ? undefined : sanitizeLinkedInWorkbenchTextForStorage(notes);
  const rawUrl = trimMockWorkbenchText(input.url, 2_000);
  const url = rawUrl
    ? canonicalizeMockWorkbenchUrl(rawUrl)
    : eventType === "applied"
      ? LINKEDIN_WORKBENCH_APPLIED_URL
      : LINKEDIN_WORKBENCH_JOBS_URL;
  const needsDetails =
    title === LINKEDIN_WORKBENCH_DEFAULT_TITLE ||
    company === LINKEDIN_WORKBENCH_DEFAULT_COMPANY ||
    !rawUrl;
  const existingJob =
    rawUrl !== undefined ? jobs.find((job) => job.url === url) : undefined;
  const jobId = existingJob?.id ?? getNextId(jobs);
  const jobHash = existingJob?.hash ?? mockLinkedInWorkbenchHash(url, jobId, rawUrl);
  const shouldBookmark = ["applied", "saved", "tracking", "interview", "follow_up", "reminder"].includes(eventType);
  const hidden = eventType === "not_interested";
  const now = new Date().toISOString();
  const job: MockJob = {
    ...(existingJob ?? {
      id: jobId,
      hash: jobHash,
      title,
      company,
      location: "LinkedIn",
      description: "Created from a user-controlled LinkedIn Workbench action.",
      url,
      source: "linkedin",
      salary_min: 0,
      salary_max: 0,
      remote: false,
      score: 0.5,
      hidden: false,
      bookmarked: false,
      notes: null,
      created_at: now,
    }),
    id: jobId,
    hash: jobHash,
    title,
    company,
    url,
    source: "linkedin",
    hidden: existingJob?.hidden === true || hidden,
    bookmarked: existingJob?.bookmarked === true || shouldBookmark,
    notes: sanitizedNotes ?? existingJob?.notes ?? null,
  };

  jobs = existingJob
    ? jobs.map((candidate) => (candidate.id === jobId ? job : candidate))
    : [job, ...jobs];

  const applicationId =
    ["applied", "tracking", "rejected", "interview", "follow_up", "reminder"].includes(eventType)
      ? upsertMockLinkedInApplication(
          jobHash,
          title,
          company,
          mockLinkedInWorkbenchApplicationStatus(eventType),
          now,
          eventType === "follow_up",
        )
      : null;

  if (eventType === "reminder" && applicationId !== null) {
    pendingReminders = [
      ...pendingReminders,
      {
        id: getNextId(pendingReminders),
        application_id: applicationId,
        reminder_type: "follow_up",
        reminder_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        message: "Review this LinkedIn job in JobSentinel",
        job_hash: jobHash,
        job_title: title,
        company,
      },
    ];
  }

  saveMockState();

  return {
    jobId,
    jobHash,
    applicationId,
    status: mockLinkedInWorkbenchStatus(eventType),
    needsDetails,
    savedAsBookmark: shouldBookmark,
    hidden,
  };
}

function getRecordArg(
  args: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> {
  const value = getArg(args, key);
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getLinkedInWorkbenchEventType(value: unknown): MockLinkedInWorkbenchEventType {
  if (typeof value === "string" && ["applied", "saved", "tracking", "rejected", "interview", "follow_up", "reminder", "note", "not_interested"].includes(value)) {
    return value as MockLinkedInWorkbenchEventType;
  }

  throw new Error("Unsupported LinkedIn workbench action");
}

function trimMockWorkbenchText(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? [...trimmed].slice(0, limit).join("") : undefined;
}

function canonicalizeMockWorkbenchUrl(rawUrl: string): string {
  if (!isExternalHttpsUrl(rawUrl)) {
    throw new Error("This LinkedIn job link is not safe to save");
  }

  return sanitizeLinkedInWorkbenchUrl(rawUrl);
}

function mockLinkedInWorkbenchHash(
  url: string,
  jobId: number,
  rawUrl: string | undefined,
): string {
  return rawUrl
    ? `linkedin-workbench:${url}`
    : `linkedin-workbench-draft:${jobId}`;
}

function upsertMockLinkedInApplication(
  jobHash: string,
  title: string,
  company: string,
  status: MockApplicationStatus,
  now: string,
  markContact: boolean,
): number {
  const existing = APPLICATION_STATUS_KEYS
    .flatMap((key) => applications[key])
    .find((application) => application.job_hash === jobHash);
  const id =
    existing?.id ??
    APPLICATION_STATUS_KEYS
      .flatMap((key) => applications[key])
      .reduce((max, application) => Math.max(max, application.id), 0) + 1;

  applications = APPLICATION_STATUS_KEYS.reduce((next, key) => {
    next[key] = applications[key].filter(
      (application) => application.job_hash !== jobHash,
    );
    return next;
  }, cloneApplications(applications));
  applications[status] = [
    ...applications[status],
    {
      id,
      job_hash: jobHash,
      job_title: title,
      company,
      status,
      applied_at: status === "applied" ? existing?.applied_at ?? now : null,
      notes: existing?.notes ?? null,
      last_contact: markContact ? now : existing?.last_contact ?? null,
    },
  ];

  return id;
}

function mockLinkedInWorkbenchApplicationStatus(
  eventType: MockLinkedInWorkbenchEventType,
): MockApplicationStatus {
  switch (eventType) {
    case "applied":
      return "applied";
    case "rejected":
      return "rejected";
    case "interview":
      return "phone_interview";
    case "tracking":
    case "follow_up":
    case "reminder":
    case "saved":
    case "note":
    case "not_interested":
      return "to_apply";
  }
}

function mockLinkedInWorkbenchStatus(
  eventType: MockLinkedInWorkbenchEventType,
): string {
  switch (eventType) {
    case "applied":
      return "applied";
    case "saved":
      return "saved";
    case "tracking":
      return "tracking";
    case "rejected":
      return "rejected";
    case "interview":
      return "interview";
    case "follow_up":
      return "follow_up";
    case "reminder":
      return "reminder";
    case "note":
      return "noted";
    case "not_interested":
      return "not_interested";
  }
}

function fillMockApplicationForm(args?: Record<string, unknown>): MockFillResultWithAttempt {
  const jobUrl = getStringArg(args, "jobUrl") ?? getStringArg(args, "job_url") ?? "";
  if (!isExternalHttpsUrl(jobUrl)) {
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

/**
 * Mock implementation of Tauri invoke
 */
export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const control = readMockInvokeControl(cmd);

  await delay(control.delayMs);

  if (control.failureMessage) {
    throw new Error(control.failureMessage);
  }

  if (control.hasResponse) {
    return control.responseValue as T;
  }

  switch (cmd) {
    // Job commands
    case "get_jobs":
    case "get_job":
    case "hide_job":
    case "unhide_job":
    case "toggle_bookmark":
    case "get_bookmarked_jobs":
    case "set_job_notes":
    case "mark_job_as_real":
    case "mark_job_as_ghost":
    case "get_job_notes":
      return applyMockJobTrackingCommand<T>(cmd, args);

    // Setup/First run
    case "is_first_run":
    case "complete_setup":
    case "get_config":
    case "get_dashboard_preferences":
    case "get_resume_matching_preference":
    case "set_resume_matching_enabled":
    case "save_config":
    case "get_credential_status":
    case "has_credential":
    case "store_credential":
    case "get_credential_unlock_status":
    case "enable_credential_passphrase":
    case "unlock_credential_vault":
    case "disable_credential_passphrase":
    case "disconnect_linkedin":
    case "linkedin_login":
    case "get_linkedin_expiry_status":
    case "detect_location":
    case "get_ghost_config":
    case "set_ghost_config":
    case "reset_ghost_config":
    case "validate_slack_webhook":
    case "test_email_notification":
    case "get_bookmarklet_config":
    case "copy_bookmarklet_code":
    case "start_bookmarklet_server":
    case "stop_bookmarklet_server":
    case "set_bookmarklet_port":
    case "get_system_info":
    case "get_config_summary":
    case "get_debug_log_events":
    case "generate_feedback_report":
    case "sanitize_feedback_text":
    case "get_feedback_filename":
    case "save_feedback_file":
    case "open_github_issues":
    case "open_google_drive":
    case "reveal_saved_feedback_file":
      return applyMockSettingsSupportCommand<T>(cmd, args);

    // Statistics commands
    case "get_statistics":
    case "get_recent_jobs":
    case "get_scraping_status":
    case "search_jobs":
      return applyMockJobTrackingCommand<T>(cmd, args);

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

    case "record_linkedin_workbench_event":
      return recordMockLinkedInWorkbenchEvent(args) as T;

    // Application commands
    case "get_applications_kanban":
    case "create_application":
    case "update_application_status":
    case "add_application_notes":
    case "get_pending_reminders":
    case "complete_reminder":
    case "detect_ghosted_applications":
    case "get_application_stats":
    case "get_jobs_by_source":
    case "get_salary_distribution":
    case "get_upcoming_interviews":
    case "get_past_interviews":
    case "schedule_interview":
    case "complete_interview":
    case "delete_interview":
    case "find_duplicates":
    case "merge_duplicates":
      return applyMockJobTrackingCommand<T>(cmd, args);

    // Resume commands
    case "get_active_resume":
    case "list_all_resumes":
    case "get_resume_text_preview":
    case "set_active_resume":
    case "select_and_upload_resume":
    case "import_json_resume":
    case "select_and_import_json_resume":
    case "delete_resume":
    case "get_user_skills":
    case "add_user_skill":
    case "update_user_skill":
    case "delete_user_skill":
    case "get_recent_matches":
    case "match_resume_to_job":
    case "create_resume_draft":
    case "get_resume_draft":
    case "update_resume_contact":
    case "update_resume_summary":
    case "add_resume_experience":
    case "delete_resume_experience":
    case "add_resume_education":
    case "delete_resume_education":
    case "set_resume_skills":
    case "delete_resume_draft":
    case "list_resume_templates":
    case "render_resume_html":
    case "analyze_resume_format":
    case "analyze_resume_for_job":
    case "analyze_active_resume_for_job":
    case "get_ats_power_words":
    case "improve_bullet_point":
    case "export_resume_docx":
    case "export_resume_html":
    case "export_resume_text":
      return applyMockResumeCommand<T>(cmd, args);

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
    case "seed_default_templates":
    case "list_cover_letter_templates":
    case "get_cover_letter_template":
    case "create_cover_letter_template":
    case "update_cover_letter_template":
    case "delete_cover_letter_template":
    case "import_cover_letter_templates":
    case "get_notification_preferences":
    case "save_notification_preferences":
    case "get_search_history":
    case "list_saved_searches":
    case "create_saved_search":
    case "use_saved_search":
    case "delete_saved_search":
    case "import_saved_searches":
    case "add_search_history":
    case "clear_search_history":
      return applyMockUserDataCommand<T>(cmd, args);

    default:
      return undefined as T;
  }
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
  credentialUnlock = { ...defaultCredentialUnlock };
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
  if (canUseStorage()) {
    window.localStorage.removeItem(MOCK_INVOKE_CONTROLS_KEY);
  }
  saveMockState();
}
