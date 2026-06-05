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
  isExternalHttpUrl,
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
import {
  toMockResumeSummary,
  toMockResumeTextPreview,
} from "./handlers/resumeSummaryViews";
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
  cloneApplications,
  getArg,
  getDefaultGhostConfig,
  getNextId,
  getNumericArg,
  getResumeIdArg,
  getSkillIdArg,
  getStringArg,
  hasOwnInputKey,
  normalizeApplications,
  normalizeProfileInput,
  normalizeSkillInput,
  skillYearsOrNull,
  toScoreFraction,
  trimmedStringOrNull,
} from "./handlers/commandHelpers";
import type {
  MockApplications,
  MockApplicationProfile,
  MockBookmarkletConfig,
  MockBuilderSkill,
  MockCoverLetterTemplate,
  MockCredentialKey,
  MockFillResultWithAttempt,
  MockGhostConfig,
  MockInterview,
  MockInterviewFollowUpState,
  MockInterviewPrepState,
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
      ghostConfig,
      bookmarkletConfig,
    },
    Boolean(getActiveResume()),
  );

  if (!result.handled) {
    return undefined as T;
  }

  config = result.state.config;
  credentials = result.state.credentials;
  ghostConfig = result.state.ghostConfig;
  bookmarkletConfig = result.state.bookmarkletConfig;

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

/**
 * Mock implementation of Tauri invoke
 */
export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Simulate network latency
  await delay(100 + Math.random() * 200);

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
    case "has_credential":
    case "store_credential":
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
    case "seed_default_templates":
    case "list_cover_letter_templates":
    case "get_cover_letter_template":
    case "create_cover_letter_template":
    case "update_cover_letter_template":
    case "delete_cover_letter_template":
    case "get_notification_preferences":
    case "save_notification_preferences":
    case "get_search_history":
    case "list_saved_searches":
    case "create_saved_search":
    case "use_saved_search":
    case "delete_saved_search":
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
