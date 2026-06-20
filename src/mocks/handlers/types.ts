import type {
  mockApplications,
  mockConfig,
  mockJobs,
  mockPendingReminders,
} from "../data";
import type { NotificationPreferences } from "../../utils/notificationPreferences";
import type {
  MockApplicationProfile,
  MockScreeningAnswer,
} from "./applicationProfile";
import type {
  MockCoverLetterTemplate,
  MockSavedSearch,
} from "./coreCommands";
import type {
  MockInterviewFollowUpState,
  MockInterviewPrepState,
} from "./interviewProgress";
import type { MockMarketAlert } from "./marketIntelligence";
import type { MockBuilderSkill, MockResumeDraft } from "./resumeBuilder";
import type { MockScraperEnabledOverrides } from "./scraperHealth";

export type MockJob = typeof mockJobs[number];
export type MockConfig = typeof mockConfig;
export type MockApplicationStatus = keyof typeof mockApplications;

export interface MockApplication {
  id: number;
  job_hash: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string | null;
  notes: string | null;
  last_contact: string | null;
}

export type MockApplications = Record<MockApplicationStatus, MockApplication[]>;
export type MockPendingReminder = typeof mockPendingReminders[number];

export type MockCredentialKey =
  | "slack_webhook"
  | "smtp_password"
  | "discord_webhook"
  | "teams_webhook"
  | "telegram_bot_token"
  | "usajobs_api_key"
  | "external_ai_openai_api_key"
  | "external_ai_anthropic_api_key"
  | "external_ai_google_api_key"
  | "external_ai_github_copilot_api_key"
  | "external_ai_custom_api_key";

export interface MockCredentialUnlockState {
  mode: "system" | "passphrase";
  configured: boolean;
  unlocked: boolean;
}

export interface MockGhostConfig {
  stale_threshold_days: number;
  repost_threshold: number;
  min_description_length: number;
  penalize_missing_salary: boolean;
  warning_threshold: number;
  hide_threshold: number;
}

export interface MockBookmarkletConfig {
  port: number;
  enabled: boolean;
}

export interface MockPendingBookmarkletImport {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  remote: boolean;
  received_at: string;
}

export interface MockResumeData {
  id: number;
  name: string;
  file_path: string;
  parsed_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MockResumeSummary = Omit<
  MockResumeData,
  "file_path" | "parsed_text"
> & {
  format_label: string;
  has_readable_text: boolean;
  readable_text_chars: number;
};

export interface MockResumeTextPreview {
  resume_id: number;
  name: string;
  has_text: boolean;
  text_preview: string;
  text_chars: number;
  is_truncated: boolean;
}

export interface MockUserSkill {
  id: number;
  resume_id: number;
  skill_name: string;
  skill_category: string | null;
  confidence_score: number;
  years_experience: number | null;
  proficiency_level: string | null;
  source: string;
}

export interface MockSkillInput {
  skill_name?: unknown;
  skill_category?: unknown;
  proficiency_level?: unknown;
  years_experience?: unknown;
}

export interface MockMatchResult {
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

export interface MockInterview {
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

export interface MockDashboardPreferences {
  autoRefresh: MockConfig["auto_refresh"];
  salaryFloorUsd: number;
  anyJobSourceEnabled: boolean;
}

export interface MockFillResultWithAttempt {
  filledFields: string[];
  unfilledFields: string[];
  captchaDetected: boolean;
  readyForReview: boolean;
  errorMessage: string | null;
  attemptId: number | null;
  durationMs: number;
  atsPlatform: string;
}

export interface MockState {
  jobs: MockJob[];
  config: MockConfig;
  interviews: MockInterview[];
  applications: MockApplications;
  pendingReminders: MockPendingReminder[];
  coverLetterTemplates: MockCoverLetterTemplate[];
  savedSearches: MockSavedSearch[];
  searchHistory: string[];
  notificationPreferences: NotificationPreferences | null;
  credentials: Partial<Record<MockCredentialKey, string>>;
  credentialUnlock: MockCredentialUnlockState;
  ghostConfig: MockGhostConfig;
  bookmarkletConfig: MockBookmarkletConfig;
  pendingBookmarkletImports: MockPendingBookmarkletImport[];
  resumes: MockResumeData[];
  userSkills: MockUserSkill[];
  resumeDrafts: MockResumeDraft[];
  recentMatches: MockMatchResult[];
  marketAlerts: MockMarketAlert[];
  applicationProfile: MockApplicationProfile | null;
  screeningAnswers: MockScreeningAnswer[];
  scraperEnabledOverrides: MockScraperEnabledOverrides;
  interviewPrepChecklists: MockInterviewPrepState;
  interviewFollowups: MockInterviewFollowUpState;
}

export type {
  MockApplicationProfile,
  MockBuilderSkill,
  MockCoverLetterTemplate,
  MockInterviewFollowUpState,
  MockInterviewPrepState,
  MockMarketAlert,
  MockResumeDraft,
  MockSavedSearch,
  MockScreeningAnswer,
  MockScraperEnabledOverrides,
  NotificationPreferences,
};
