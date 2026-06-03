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
import { ExperienceLevel, JobType, RemoteType, SiteCategory } from "../types/deeplinks";
import type { DeepLink, SearchCriteria, SiteInfo } from "../types/deeplinks";
import type { PostedDateFilter, ScoreFilter, SortOption } from "../pages/DashboardTypes";
import type { NotificationPreferences, SourceNotificationConfig } from "../utils/notificationPreferences";

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
type MockTemplateCategory =
  | "general"
  | "tech"
  | "creative"
  | "finance"
  | "healthcare"
  | "sales"
  | "custom"
  | "thankyou"
  | "followup"
  | "withdrawal";
interface MockCoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: MockTemplateCategory;
  createdAt: string;
  updatedAt: string;
}
interface MockSavedSearch {
  id: string;
  name: string;
  sortBy: SortOption;
  scoreFilter: ScoreFilter;
  sourceFilter: string;
  remoteFilter: string;
  bookmarkFilter: string;
  notesFilter: string;
  postedDateFilter: PostedDateFilter | null;
  salaryMinFilter: number | null;
  salaryMaxFilter: number | null;
  ghostFilter: string | null;
  textSearch: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}
const SORT_OPTIONS: readonly SortOption[] = [
  "score-desc",
  "score-asc",
  "date-desc",
  "date-asc",
  "company-asc",
];
const SCORE_FILTERS: readonly ScoreFilter[] = ["all", "high", "medium", "low"];
const POSTED_DATE_FILTERS: readonly PostedDateFilter[] = ["all", "24h", "7d", "30d"];
const TEMPLATE_CATEGORIES: readonly MockTemplateCategory[] = [
  "general",
  "tech",
  "creative",
  "finance",
  "healthcare",
  "sales",
  "custom",
  "thankyou",
  "followup",
  "withdrawal",
];
type MockCredentialKey =
  | "slack_webhook"
  | "smtp_password"
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
  parsed_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type MockResumeSummary = Omit<MockResumeData, "file_path" | "parsed_text"> & {
  format_label: string;
  has_readable_text: boolean;
  readable_text_chars: number;
};

interface MockResumeTextPreview {
  resume_id: number;
  name: string;
  has_text: boolean;
  text_preview: string;
  text_chars: number;
  is_truncated: boolean;
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

interface MockBuilderContact {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  website: string | null;
}

interface MockBuilderExperience {
  id: number;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  achievements: string[];
}

interface MockBuilderEducation {
  id: number;
  degree: string;
  institution: string;
  location: string | null;
  graduation_date: string | null;
  gpa: string | null;
  honors: string[];
}

interface MockBuilderSkill {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
}

interface MockResumeDraft {
  id: number;
  contact: MockBuilderContact;
  summary: string;
  experience: MockBuilderExperience[];
  education: MockBuilderEducation[];
  skills: MockBuilderSkill[];
  certifications: string[];
  projects: string[];
  created_at: string;
  updated_at: string;
}

interface MockResumeTemplate {
  id: "Classic" | "Modern" | "Technical" | "Executive" | "Military";
  name: string;
  description: string;
  preview_image: string;
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

interface MockMarketAlert {
  id: number;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  related_entity: string | null;
  metric_value: number | null;
  metric_change_pct: number | null;
  is_read: boolean;
  created_at: string;
}

interface MockApplicationProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  defaultResumeId: number | null;
  hasResumeFile: boolean;
  resumeFileName: string | null;
  defaultCoverLetterTemplate: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

type MockApplicationProfilePreview = Pick<
  MockApplicationProfile,
  | "fullName"
  | "email"
  | "phone"
  | "linkedinUrl"
  | "githubUrl"
  | "portfolioUrl"
  | "websiteUrl"
  | "usWorkAuthorized"
  | "requiresSponsorship"
>;

type MockApplicationProfileEdit = Pick<
  MockApplicationProfile,
  | "fullName"
  | "email"
  | "phone"
  | "linkedinUrl"
  | "githubUrl"
  | "portfolioUrl"
  | "websiteUrl"
  | "hasResumeFile"
  | "resumeFileName"
  | "usWorkAuthorized"
  | "requiresSponsorship"
  | "maxApplicationsPerDay"
  | "requireManualApproval"
>;

interface MockScreeningAnswer {
  id: number;
  questionPattern: string;
  answer: string;
  answerType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  timesUsed?: number;
  timesModified?: number;
  confidenceScore?: number;
  lastUsedAt?: string | null;
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

interface MockJobImportPreview {
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  salary: string | null;
  date_posted: string | null;
  valid_through: string | null;
  employment_types: string[];
  remote: boolean;
  missing_fields: string[];
  already_exists: boolean;
}

interface MockJobImportResult {
  jobId: number;
}

interface MockDashboardPreferences {
  autoRefresh: MockConfig["auto_refresh"];
  salaryFloorUsd: number;
  anyJobSourceEnabled: boolean;
}

type MockFeedbackCategory = "bug" | "feature" | "question";
type MockScraperType = "api" | "html" | "rss" | "graphql" | "hybrid";
type MockHealthStatus = "healthy" | "degraded" | "down" | "disabled" | "unknown";
type MockSelectorHealth = "healthy" | "degraded" | "broken" | "unknown";
type MockScraperRunStatus = "running" | "success" | "error" | "rate_limited";
type MockSourceRequestOutcome = "started" | "success" | "failure" | "timeout";

interface MockScraperDefinition {
  scraper_name: string;
  display_name: string;
  requires_auth: boolean;
  scraper_type: MockScraperType;
  rate_limit_per_hour: number;
}

interface MockScraperHealthMetrics extends MockScraperDefinition {
  is_enabled: boolean;
  health_status: MockHealthStatus;
  selector_health: MockSelectorHealth;
  success_rate_24h: number;
  avg_duration_ms: number | null;
  last_success: string | null;
  last_error: string | null;
  total_runs_24h: number;
  jobs_found_24h: number;
}

interface MockScraperRun {
  id: number;
  scraper_name: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: MockScraperRunStatus;
  jobs_found: number;
  jobs_new: number;
  error_message: string | null;
  error_code: string | null;
  retry_attempt: number;
}

interface MockSmokeTestResult {
  scraper_name: string;
  test_type: "connectivity" | "selector" | "auth" | "rate_limit";
  passed: boolean;
  duration_ms: number;
  details: Record<string, unknown> | null;
  error: string | null;
}

interface MockSourceRequestSummary {
  id: number;
  source: string;
  sentAt: string;
  endpointHost: string | null;
  titleCount: number;
  hasLocation: boolean;
  remoteOnly: boolean;
  resultLimit: number;
  outcome: MockSourceRequestOutcome;
}

interface MockCredentialHealth {
  key: string;
  created_at: string | null;
  last_validated: string | null;
  expires_at: string | null;
  status: "valid" | "expiring" | "expired" | "unknown";
  days_until_expiry: number | null;
}

interface MockPrepChecklistItem {
  itemId: string;
  completed: boolean;
  completedAt: string | null;
}

interface MockFollowUpReminder {
  interviewId: number;
  thankYouSent: boolean;
  sentAt: string | null;
}

interface MockSalaryBenchmark {
  job_title: string;
  location: string;
  seniority_level: string;
  min_salary: number;
  p25_salary: number;
  median_salary: number;
  p75_salary: number;
  max_salary: number;
  average_salary: number;
  sample_size: number;
  last_updated: string;
}

interface MockAtsDetectionResponse {
  platform: string;
  commonFields: string[];
  automationNotes: string | null;
}

interface MockFillResultWithAttempt {
  filledFields: string[];
  unfilledFields: string[];
  captchaDetected: boolean;
  readyForReview: boolean;
  errorMessage: string | null;
  attemptId: number | null;
  durationMs: number;
  atsPlatform: string;
}

interface MockAnswerSuggestion {
  answer: string;
  confidence: number;
  source: {
    type: "manual";
    answerId: number;
  };
  timesUsed: number;
  timesModified: number;
  lastUsedDaysAgo: number | null;
  modificationRate: number;
}

type MockKeywordImportance = "Required" | "Preferred" | "Industry";
type MockIssueSeverity = "Critical" | "Warning" | "Info";
type MockRequirementMatchState = "Direct" | "Strong" | "Partial" | "Implied" | "Missing";
type MockHardConstraintCategory =
  | "WorkAuthorization"
  | "SecurityClearance"
  | "LicenseOrCertification"
  | "Education"
  | "Experience"
  | "PhysicalRequirement"
  | "Location";
type MockSuggestionCategory =
  | "AddKeyword"
  | "RewordBullet"
  | "AddSection"
  | "ReorderContent"
  | "FormatFix";

interface MockKeywordMatch {
  keyword: string;
  found_in: string[];
  frequency: number;
  importance: MockKeywordImportance;
}

interface MockFormatIssue {
  severity: MockIssueSeverity;
  issue: string;
  fix: string;
}

interface MockRequirementReview {
  keyword: string;
  importance: MockKeywordImportance;
  match_state: MockRequirementMatchState;
  evidence_sections: string[];
  hard_constraint: boolean;
  recommendation: string;
}

interface MockHardConstraintRisk {
  requirement: string;
  category: MockHardConstraintCategory;
  score_cap: number;
  reason: string;
  action: string;
}

interface MockAtsSuggestion {
  category: MockSuggestionCategory;
  suggestion: string;
  impact: string;
}

interface MockAtsAnalysisResult {
  overall_score: number;
  keyword_score: number;
  format_score: number;
  completeness_score: number;
  keyword_matches: MockKeywordMatch[];
  missing_keywords: string[];
  missing_keyword_details: MockAtsKeyword[];
  requirement_reviews: MockRequirementReview[];
  hard_constraint_risks: MockHardConstraintRisk[];
  format_issues: MockFormatIssue[];
  suggestions: MockAtsSuggestion[];
}

interface MockAtsKeyword {
  keyword: string;
  importance: MockKeywordImportance;
}

const ATS_POWER_WORDS = [
  "led",
  "managed",
  "directed",
  "coordinated",
  "supervised",
  "mentored",
  "achieved",
  "accomplished",
  "delivered",
  "exceeded",
  "developed",
  "created",
  "designed",
  "built",
  "implemented",
  "launched",
  "improved",
  "optimized",
  "enhanced",
  "streamlined",
  "organized",
  "trained",
  "increased",
  "reduced",
  "saved",
  "generated",
  "analyzed",
  "researched",
  "evaluated",
  "collaborated",
  "partnered",
  "supported",
] as const;

const ATS_KNOWN_KEYWORDS = [
  "forecasting",
  "workflow improvement",
  "quality assurance",
  "customer service",
  "crm",
  "salesforce",
  "leadership",
  "scheduling",
  "case management",
  "client intake",
  "customer support",
  "project coordination",
  "pmp",
  "project management professional",
  "inventory",
  "budgeting",
  "data entry",
  "bilingual",
  "data analysis",
  "training",
  "security clearance",
  "work authorization",
  "driver's license",
  "bachelor's degree",
  "high school diploma",
  "ged",
  "high school equivalency",
  "degree",
  "patient care",
  "cna",
  "certified nursing assistant",
  "lpn",
  "licensed practical nurse",
  "medication administration",
  "vital signs",
  "care plans",
  "medical records",
  "charting",
  "lesson planning",
  "classroom management",
  "curriculum",
  "iep",
  "student support",
  "parent communication",
  "forklift",
  "welding",
  "equipment maintenance",
  "safety inspections",
  "food safety",
  "food safety certification",
  "servsafe",
  "food handler certification",
  "first aid",
  "first aid certification",
  "cash handling",
  "forklift certification",
  "osha 10",
  "osha 10 certification",
  "osha 30",
  "osha 30 certification",
  "document review",
  "case files",
  "legal research",
  "records management",
  "policy analysis",
  "grant administration",
  "public benefits",
  "financial reconciliation",
  "reconciliation",
  "invoicing",
  "loan processing",
  "financial reporting",
] as const;

const MOCK_SCRAPERS: readonly MockScraperDefinition[] = [
  { scraper_name: "greenhouse", display_name: "Greenhouse", requires_auth: false, scraper_type: "api", rate_limit_per_hour: 60 },
  { scraper_name: "lever", display_name: "Lever", requires_auth: false, scraper_type: "api", rate_limit_per_hour: 60 },
  { scraper_name: "remoteok", display_name: "Remote OK", requires_auth: false, scraper_type: "api", rate_limit_per_hour: 120 },
  { scraper_name: "hn_hiring", display_name: "Startup and tech job posts", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 30 },
  { scraper_name: "weworkremotely", display_name: "We Work Remotely", requires_auth: false, scraper_type: "rss", rate_limit_per_hour: 60 },
  { scraper_name: "indeed", display_name: "Indeed", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 60 },
  { scraper_name: "wellfound", display_name: "Wellfound", requires_auth: true, scraper_type: "html", rate_limit_per_hour: 45 },
  { scraper_name: "builtin", display_name: "Built In", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 60 },
  { scraper_name: "jobswithgpt", display_name: "JobsWithGPT", requires_auth: false, scraper_type: "api", rate_limit_per_hour: 60 },
  { scraper_name: "dice", display_name: "Dice", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 45 },
  { scraper_name: "yc_startup", display_name: "YC Startup Jobs", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 45 },
  { scraper_name: "ziprecruiter", display_name: "ZipRecruiter", requires_auth: false, scraper_type: "rss", rate_limit_per_hour: 45 },
  { scraper_name: "usajobs", display_name: "USAJOBS", requires_auth: true, scraper_type: "api", rate_limit_per_hour: 120 },
  { scraper_name: "simplyhired", display_name: "SimplyHired", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 45 },
  { scraper_name: "glassdoor", display_name: "Glassdoor", requires_auth: false, scraper_type: "html", rate_limit_per_hour: 45 },
] as const;

const MOCK_DEEP_LINK_SITES = [
  {
    id: "indeed",
    name: "Indeed",
    category: SiteCategory.General,
    requires_login: false,
    logo_url: "https://www.indeed.com/apple-touch-icon.png",
    notes: "Largest job board with millions of listings",
  },
  {
    id: "monster",
    name: "Monster",
    category: SiteCategory.General,
    requires_login: false,
    logo_url: "https://www.monster.com/favicon.ico",
    notes: "Established job board with career resources",
  },
  {
    id: "careerbuilder",
    name: "CareerBuilder",
    category: SiteCategory.General,
    requires_login: false,
    logo_url: "https://www.careerbuilder.com/favicon.ico",
  },
  {
    id: "simplyhired",
    name: "SimplyHired",
    category: SiteCategory.General,
    requires_login: false,
    logo_url: "https://www.simplyhired.com/favicon.ico",
    notes: "Job aggregator with salary estimates",
  },
  {
    id: "ziprecruiter",
    name: "ZipRecruiter",
    category: SiteCategory.General,
    requires_login: false,
    logo_url: "https://www.ziprecruiter.com/favicon.ico",
    notes: "General job board with Application Assist support",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: SiteCategory.Professional,
    requires_login: true,
    logo_url: "https://www.linkedin.com/favicon.ico",
    notes: "Professional network with extensive job listings",
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    category: SiteCategory.Professional,
    requires_login: true,
    logo_url: "https://www.glassdoor.com/favicon.ico",
    notes: "Job board with company reviews and salaries",
  },
  {
    id: "dice",
    name: "Dice",
    category: SiteCategory.Tech,
    requires_login: false,
    logo_url: "https://www.dice.com/favicon.ico",
    notes: "Technology and IT-focused job board",
  },
  {
    id: "usajobs",
    name: "USAJobs",
    category: SiteCategory.Government,
    requires_login: false,
    logo_url: "https://www.usajobs.gov/favicon.ico",
    notes: "Official federal government job board",
  },
  {
    id: "governmentjobs",
    name: "GovernmentJobs",
    category: SiteCategory.Government,
    requires_login: false,
    logo_url: "https://www.governmentjobs.com/favicon.ico",
    notes: "State and local government positions",
  },
  {
    id: "cajobs",
    name: "CalCareers (California)",
    category: SiteCategory.Government,
    requires_login: false,
    notes: "California state government jobs",
  },
  {
    id: "texasjobs",
    name: "CAPPS (Texas)",
    category: SiteCategory.Government,
    requires_login: false,
    notes: "Texas state government jobs",
  },
  {
    id: "clearancejobs",
    name: "ClearanceJobs",
    category: SiteCategory.Cleared,
    requires_login: false,
    logo_url: "https://www.clearancejobs.com/favicon.ico",
    notes: "Jobs requiring security clearances",
  },
  {
    id: "flexjobs",
    name: "FlexJobs",
    category: SiteCategory.Remote,
    requires_login: true,
    logo_url: "https://www.flexjobs.com/favicon.ico",
    notes: "Curated remote and flexible jobs (subscription)",
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    category: SiteCategory.Remote,
    requires_login: false,
    logo_url: "https://weworkremotely.com/favicon.ico",
    notes: "Popular remote job board",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    category: SiteCategory.Remote,
    requires_login: false,
    logo_url: "https://remoteok.com/favicon.ico",
    notes: "Remote jobs aggregator",
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList)",
    category: SiteCategory.Startups,
    requires_login: true,
    logo_url: "https://wellfound.com/favicon.ico",
    notes: "Startup jobs with equity information",
  },
  {
    id: "ycombinator",
    name: "Y Combinator Jobs",
    category: SiteCategory.Startups,
    requires_login: false,
    logo_url: "https://www.ycombinator.com/favicon.ico",
    notes: "Jobs at Y Combinator companies",
  },
] as const satisfies readonly SiteInfo[];

const LINKEDIN_JOB_TYPE_PARAMS: Partial<Record<JobType, string>> = {
  [JobType.FullTime]: "F",
  [JobType.PartTime]: "P",
  [JobType.Contract]: "C",
  [JobType.Temporary]: "T",
  [JobType.Internship]: "I",
};

const LINKEDIN_REMOTE_TYPE_PARAMS: Record<RemoteType, string> = {
  [RemoteType.Remote]: "2",
  [RemoteType.Hybrid]: "3",
  [RemoteType.Onsite]: "1",
};

const INDEED_JOB_TYPE_PARAMS: Partial<Record<JobType, string>> = {
  [JobType.FullTime]: "fulltime",
  [JobType.PartTime]: "parttime",
  [JobType.Contract]: "contract",
  [JobType.Temporary]: "temporary",
  [JobType.Internship]: "internship",
};

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
let applicationProfile: MockApplicationProfile | null = getDefaultApplicationProfile();
let screeningAnswers: MockScreeningAnswer[] = getDefaultScreeningAnswers();
let scraperEnabledOverrides: Record<string, boolean> = {};
let interviewPrepChecklists: Record<string, MockPrepChecklistItem[]> = {};
let interviewFollowups: Record<string, MockFollowUpReminder> = {};
let automationBrowserRunning = false;
let nextAutomationAttemptId = 1;

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

interface MockState {
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
  ghostConfig: MockGhostConfig;
  bookmarkletConfig: MockBookmarkletConfig;
  resumes: MockResumeData[];
  userSkills: MockUserSkill[];
  resumeDrafts: MockResumeDraft[];
  recentMatches: MockMatchResult[];
  marketAlerts: MockMarketAlert[];
  applicationProfile: MockApplicationProfile | null;
  screeningAnswers: MockScreeningAnswer[];
  scraperEnabledOverrides: Record<string, boolean>;
  interviewPrepChecklists: Record<string, MockPrepChecklistItem[]>;
  interviewFollowups: Record<string, MockFollowUpReminder>;
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
      coverLetterTemplates = state.coverLetterTemplates.map(normalizeCoverLetterTemplate);
    }
    if (Array.isArray(state.savedSearches)) {
      savedSearches = state.savedSearches.map(normalizeSavedSearch);
    }
    if (Array.isArray(state.searchHistory)) {
      searchHistory = state.searchHistory.filter(
        (query): query is string => typeof query === "string" && query.trim().length >= 2,
      );
    }
    if (state.notificationPreferences && typeof state.notificationPreferences === "object") {
      notificationPreferences = normalizeNotificationPreferences(state.notificationPreferences);
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
          ? normalizeApplicationProfile(state.applicationProfile)
          : null;
    }
    if (Array.isArray(state.screeningAnswers)) {
      screeningAnswers = state.screeningAnswers
        .filter((answer) => answer && typeof answer === "object")
        .map((answer) => normalizeScreeningAnswer(answer));
    }
    if (state.scraperEnabledOverrides && typeof state.scraperEnabledOverrides === "object") {
      scraperEnabledOverrides = state.scraperEnabledOverrides;
    }
    if (state.interviewPrepChecklists && typeof state.interviewPrepChecklists === "object") {
      interviewPrepChecklists = normalizeInterviewPrepState(state.interviewPrepChecklists);
    }
    if (state.interviewFollowups && typeof state.interviewFollowups === "object") {
      interviewFollowups = normalizeFollowUpState(state.interviewFollowups);
    }
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

function getDefaultMarketAlerts(): MockMarketAlert[] {
  return [
    {
      id: 1,
      alert_type: "skill_surge",
      title: "Customer support demand is rising",
      description: "Customer support and client success postings are up across remote and hybrid roles.",
      severity: "warning",
      related_entity: "Customer Support",
      metric_value: 384,
      metric_change_pct: 18,
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      alert_type: "location_boom",
      title: "Remote roles are expanding",
      description: "Remote listings now represent a larger share of active job postings.",
      severity: "info",
      related_entity: "Remote",
      metric_value: 42,
      metric_change_pct: 8.5,
      is_read: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

function getDefaultApplicationProfile(): MockApplicationProfile {
  const now = "2026-05-19T16:00:00.000Z";
  return {
    id: 1,
    fullName: "Jordan Lee",
    email: "jordan@example.com",
    phone: "+1 (555) 123-4567",
    linkedinUrl: "https://linkedin.com/in/jordanlee",
    githubUrl: null,
    portfolioUrl: "https://jordanlee.example.com/work",
    websiteUrl: "https://jordanlee.example.com",
    defaultResumeId: null,
    hasResumeFile: false,
    resumeFileName: null,
    defaultCoverLetterTemplate: null,
    usWorkAuthorized: true,
    requiresSponsorship: false,
    maxApplicationsPerDay: 10,
    requireManualApproval: true,
    createdAt: now,
    updatedAt: now,
  };
}

function getDefaultScreeningAnswers(): MockScreeningAnswer[] {
  const now = "2026-05-19T16:00:00.000Z";
  return [
    {
      id: 1,
      questionPattern: "work authorized",
      answer: "Yes",
      answerType: "yes_no",
      notes: "US work authorization",
      timesUsed: 4,
      timesModified: 0,
      confidenceScore: 0.92,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function getMockSupportedSites(): SiteInfo[] {
  return MOCK_DEEP_LINK_SITES.map((site) => ({ ...site }));
}

function getMockSitesByCategory(args?: Record<string, unknown>): SiteInfo[] {
  const category = getArg(args, "category");
  if (!isSiteCategory(category)) {
    return [];
  }

  return getMockSupportedSites().filter((site) => site.category === category);
}

function getSearchCriteriaArg(args?: Record<string, unknown>): SearchCriteria {
  const source = getArg(args, "criteria");
  if (!isRecord(source)) {
    return { query: "" };
  }

  return {
    query: typeof source.query === "string" ? source.query : "",
    location: typeof source.location === "string" ? source.location : undefined,
    experience_level: isExperienceLevel(source.experience_level)
      ? source.experience_level
      : undefined,
    job_type: isJobType(source.job_type) ? source.job_type : undefined,
    remote_type: isRemoteType(source.remote_type) ? source.remote_type : undefined,
  };
}

function generateMockDeepLinks(args?: Record<string, unknown>): DeepLink[] {
  const criteria = getSearchCriteriaArg(args);
  return getMockSupportedSites().map((site) => ({
    site,
    url: generateMockDeepLinkUrl(site.id, criteria),
  }));
}

function generateMockDeepLink(args?: Record<string, unknown>): DeepLink {
  const siteId = getStringArg(args, "siteId") ?? getStringArg(args, "site_id");
  const site = getMockSupportedSites().find((candidate) => candidate.id === siteId);
  if (!site) {
    throw new Error(`Unknown site ID: ${siteId ?? ""}`);
  }

  return {
    site,
    url: generateMockDeepLinkUrl(site.id, getSearchCriteriaArg(args)),
  };
}

function generateMockDeepLinkUrl(siteId: string, criteria: SearchCriteria): string {
  switch (siteId) {
    case "indeed":
      return buildIndeedUrl(criteria);
    case "linkedin":
      return buildLinkedinUrl(criteria);
    case "glassdoor":
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeQuery(criteria.query)}`;
    case "monster":
      return appendLocation(
        `https://www.monster.com/jobs/search?q=${encodeQuery(criteria.query)}`,
        "where",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&jobtype=WORK_FROM_HOME" : "");
    case "careerbuilder":
      return appendLocation(
        `https://www.careerbuilder.com/jobs?keywords=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&emp=JTFT,JTFR" : "");
    case "simplyhired":
      return appendLocation(
        `https://www.simplyhired.com/search?q=${encodeQuery(criteria.query)}`,
        "l",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&job=z-remote" : "");
    case "ziprecruiter":
      return appendLocation(
        `https://www.ziprecruiter.com/jobs-search?search=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&refine_by_location_type=only_remote" : "");
    case "dice":
      return appendLocation(
        `https://www.dice.com/jobs?q=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&filters.isRemote=true" : "");
    case "usajobs":
      return appendLocation(
        `https://www.usajobs.gov/Search/Results?k=${encodeQuery(criteria.query)}`,
        "l",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&p=1" : "");
    case "governmentjobs":
      return appendLocation(
        `https://www.governmentjobs.com/jobs?keyword=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      );
    case "cajobs":
      return `https://www.calcareers.ca.gov/CalHrPublic/Jobs/JobPosting.aspx?searchStr=${encodeQuery(criteria.query)}`;
    case "texasjobs":
      return `https://capps.taleo.net/careersection/ex/jobsearch.ftl?lang=en&keyword=${encodeQuery(criteria.query)}`;
    case "clearancejobs":
      return appendLocation(
        `https://www.clearancejobs.com/jobs?keywords=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      );
    case "flexjobs":
      return appendLocation(
        `https://www.flexjobs.com/search?search=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      );
    case "weworkremotely":
      return `https://weworkremotely.com/remote-jobs/search?term=${encodeQuery(criteria.query)}`;
    case "remoteok":
      return `https://remoteok.com/remote-jobs?search=${encodeQuery(criteria.query)}`;
    case "wellfound":
      return appendLocation(
        `https://wellfound.com/jobs?keywords=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      ) + (criteria.remote_type === RemoteType.Remote ? "&remote=true" : "");
    case "ycombinator":
      return `https://www.ycombinator.com/jobs?q=${encodeQuery(criteria.query)}`;
    default:
      throw new Error(`Unsupported site: ${siteId}`);
  }
}

function buildIndeedUrl(criteria: SearchCriteria): string {
  let url = appendLocation(
    `https://www.indeed.com/jobs?q=${encodeQuery(criteria.query)}`,
    "l",
    criteria,
  );
  const jobType = criteria.job_type ? INDEED_JOB_TYPE_PARAMS[criteria.job_type] : undefined;
  if (jobType) {
    url += `&jt=${jobType}`;
  }
  if (criteria.remote_type === RemoteType.Remote) {
    url += "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11";
  }
  return url;
}

function buildLinkedinUrl(criteria: SearchCriteria): string {
  let url = appendLocation(
    `https://www.linkedin.com/jobs/search/?keywords=${encodeQuery(criteria.query)}`,
    "location",
    criteria,
  );
  const jobType = criteria.job_type ? LINKEDIN_JOB_TYPE_PARAMS[criteria.job_type] : undefined;
  if (jobType) {
    url += `&f_JT=${jobType}`;
  }
  if (criteria.remote_type) {
    url += `&f_WT=${LINKEDIN_REMOTE_TYPE_PARAMS[criteria.remote_type]}`;
  }
  return url;
}

function appendLocation(url: string, key: string, criteria: SearchCriteria): string {
  return criteria.location ? `${url}&${key}=${encodeQuery(criteria.location)}` : url;
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value);
}

function assertMockDeepLinkUrl(url: string | undefined): void {
  if (!url || !isExternalHttpUrl(url)) {
    throw new Error("This job-site link is not safe to open");
  }
}

function previewMockJobImport(args?: Record<string, unknown>): MockJobImportPreview {
  const url = getJobImportUrl(args);
  const title = getMockImportTitle(url);
  const company = getMockImportCompany(url);

  return {
    title,
    company,
    url,
    location: "Remote",
    description_preview: `${title} role imported from ${company}. Review details before saving.`,
    salary: "$55k-$72k",
    date_posted: new Date().toISOString(),
    valid_through: null,
    employment_types: ["FULL_TIME"],
    remote: true,
    missing_fields: [],
    already_exists: jobs.some((job) => job.url === url),
  };
}

function importMockJobFromUrl(args?: Record<string, unknown>): MockJobImportResult {
  const preview = previewMockJobImport(args);
  if (preview.already_exists) {
    throw new Error("This job is already in your saved jobs");
  }

  const now = new Date().toISOString();
  const job: MockJob = {
    id: getNextId(jobs),
    hash: `mock-import-${hashString(preview.url)}`,
    title: preview.title,
    company: preview.company,
    location: preview.location ?? "Remote",
    description: preview.description_preview ?? "",
    url: preview.url,
    source: "import",
    salary_min: 55000,
    salary_max: 72000,
    remote: preview.remote,
    score: 1,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: now,
  };

  jobs = [job, ...jobs];
  saveMockState();
  return { jobId: job.id };
}

function getJobImportUrl(args?: Record<string, unknown>): string {
  const url = getStringArg(args, "url")?.trim();
  if (!url || !isExternalHttpUrl(url)) {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  return canonicalizeMockJobImportUrl(url);
}

const STRIPPED_JOB_IMPORT_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "referrer",
  "source",
]);

const STRIPPED_JOB_IMPORT_QUERY_MARKERS = [
  "token",
  "session",
  "auth",
  "credential",
  "password",
  "email",
  "candidate",
];

function canonicalizeMockJobImportUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";

  const keptParams = new URLSearchParams();
  parsed.searchParams.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.startsWith("utm_") ||
      STRIPPED_JOB_IMPORT_QUERY_KEYS.has(normalizedKey) ||
      STRIPPED_JOB_IMPORT_QUERY_MARKERS.some((marker) => normalizedKey.includes(marker))
    ) {
      return;
    }
    keptParams.append(key, value);
  });

  const query = keptParams.toString();
  parsed.search = query ? `?${query}` : "";
  return parsed.toString();
}

function getMockImportTitle(url: string): string {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter((part) => part.length > 0);
  const slug = parts[parts.length - 1] ?? "imported-job";
  return slug
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || "Imported Job";
}

function getMockImportCompany(url: string): string {
  return new URL(url).hostname;
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
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
    MOCK_SCRAPERS.some((scraper) => hasEnabledMockSource(configRecord, scraper.scraper_name)) ||
    hasConfiguredUrlList(configRecord, "greenhouse_urls") ||
    hasConfiguredUrlList(configRecord, "lever_urls") ||
    hasConfiguredJobsWithGpt(configRecord)
  );
}

function hasEnabledMockSource(configRecord: Record<string, unknown>, key: string): boolean {
  const value = configRecord[key];
  return (
    typeof value === "object" &&
    value !== null &&
    "enabled" in value &&
    (value as { enabled?: unknown }).enabled === true
  );
}

function hasConfiguredUrlList(configRecord: Record<string, unknown>, key: string): boolean {
  const value = configRecord[key];
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim());
}

function hasConfiguredJobsWithGpt(configRecord: Record<string, unknown>): boolean {
  const endpoint = configRecord.jobswithgpt_endpoint;
  const titles = configRecord.title_allowlist;
  const approval = configRecord.jobswithgpt_approval;
  if (
    typeof endpoint !== "string" ||
    endpoint.trim().length === 0 ||
    !Array.isArray(titles)
  ) {
    return false;
  }

  const payloadTitles = titles
    .filter((title): title is string => typeof title === "string")
    .map((title) => title.trim())
    .filter((title) => title.length > 0);
  if (payloadTitles.length === 0 || !isRecord(approval)) return false;

  const payload = approval.payload;
  if (approval.enabled !== true || !isRecord(payload)) return false;
  const locationPreferences = configRecord.location_preferences;
  const remoteOnly =
    isRecord(locationPreferences) &&
    locationPreferences.allow_remote === true &&
    locationPreferences.allow_onsite !== true;

  return (
    payload.endpoint === endpoint.trim() &&
    Array.isArray(payload.titles) &&
    payload.titles.length === payloadTitles.length &&
    payload.titles.every((title, index) => title === payloadTitles[index]) &&
    (payload.location ?? null) === null &&
    payload.remote_only === remoteOnly &&
    payload.limit === 100
  );
}

function getMockApplicationProfilePreview(): MockApplicationProfilePreview | null {
  if (!applicationProfile) return null;

  return {
    fullName: applicationProfile.fullName,
    email: applicationProfile.email,
    phone: applicationProfile.phone,
    linkedinUrl: applicationProfile.linkedinUrl,
    githubUrl: applicationProfile.githubUrl,
    portfolioUrl: applicationProfile.portfolioUrl,
    websiteUrl: applicationProfile.websiteUrl,
    usWorkAuthorized: applicationProfile.usWorkAuthorized,
    requiresSponsorship: applicationProfile.requiresSponsorship,
  };
}

function getMockApplicationProfileEdit(): MockApplicationProfileEdit | null {
  if (!applicationProfile) return null;

  return {
    fullName: applicationProfile.fullName,
    email: applicationProfile.email,
    phone: applicationProfile.phone,
    linkedinUrl: applicationProfile.linkedinUrl,
    githubUrl: applicationProfile.githubUrl,
    portfolioUrl: applicationProfile.portfolioUrl,
    websiteUrl: applicationProfile.websiteUrl,
    hasResumeFile: applicationProfile.hasResumeFile,
    resumeFileName: applicationProfile.resumeFileName,
    usWorkAuthorized: applicationProfile.usWorkAuthorized,
    requiresSponsorship: applicationProfile.requiresSponsorship,
    maxApplicationsPerDay: applicationProfile.maxApplicationsPerDay,
    requireManualApproval: applicationProfile.requireManualApproval,
  };
}

function generateMockFeedbackReport(args?: Record<string, unknown>): string {
  const category = getMockFeedbackCategory(args);
  const description = sanitizeMockSupportReportText(
    getStringArg(args, "description") ?? "",
  );
  const includeDebugInfo = booleanValue(getArg(args, "includeDebugInfo"), false);
  const systemInfo = getMockSystemInfo();
  const configSummary = getMockConfigSummary();
  const timestamp = new Date().toISOString();

  const lines = [
    "JOBSENTINEL SAFE SUPPORT REPORT",
    "",
    `Report type: ${getMockFeedbackCategoryLabel(category)}`,
    `Created: ${timestamp}`,
    "",
    "WHAT YOU WROTE",
    "",
    description,
    "",
    "APP AND DEVICE (common private details hidden)",
    "",
    `App version: ${systemInfo.app_version}`,
    `Device: ${systemInfo.platform} ${systemInfo.os_version}`,
    `System type: ${systemInfo.architecture}`,
  ];

  if (includeDebugInfo) {
    lines.push(
      "",
      "JOBSENTINEL SETUP (counts only)",
      "",
      `Job sources turned on: ${configSummary.scrapers_enabled}`,
      `Search words saved: ${configSummary.keywords_count}`,
      `Location preferences: ${configSummary.has_location_prefs ? "configured" : "not set"}`,
      `Salary preferences: ${configSummary.has_salary_prefs ? "configured" : "not set"}`,
      `Notifications: ${configSummary.notifications_configured} channel(s)`,
    );
  }

  lines.push(
    "",
    "SUPPORT SUMMARY",
    "",
    JSON.stringify(
      {
        schema_version: "1.0",
        app_version: systemInfo.app_version,
        category,
        timestamp,
        platform: {
          os: systemInfo.platform,
          os_version: systemInfo.os_version,
          arch: systemInfo.architecture,
        },
        config_summary: includeDebugInfo ? configSummary : null,
        debug_events_count: 0,
      },
      null,
      2,
    ),
    "",
    "END OF SAFE SUPPORT REPORT",
  );

  return lines.join("\n");
}

function getMockFeedbackFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `jobsentinel-feedback-${year}-${month}-${day}-${hour}${minute}.txt`;
}

function saveMockFeedbackFile(args?: Record<string, unknown>): {
  fileName: string;
  revealToken: string;
} | null {
  const suggestedFilename =
    getStringArg(args, "suggestedFilename") ??
    getStringArg(args, "suggested_filename") ??
    getMockFeedbackFilename();
  const fileName = sanitizeMockFilename(suggestedFilename);
  return {
    fileName,
    revealToken: `mock-feedback:${fileName}`,
  };
}

function sanitizeMockFilename(filename: string): string {
  const pathSegments = filename.split(/[\\/]+/).filter((segment) => segment.length > 0);
  const basename = pathSegments[pathSegments.length - 1] ?? getMockFeedbackFilename();
  return basename.replace(/[^a-zA-Z0-9._-]/g, "-") || getMockFeedbackFilename();
}

function sanitizeMockSupportReportText(content: string): string {
  let result = content;

  result = result.replace(
    /https:\/\/(?:hooks\.slack\.com|discord(?:app)?\.com\/api\/webhooks|outlook\.office(?:365)?\.com\/webhook|hooks\.discord\.com\/api\/webhooks|hooks\.teams\.com\/workflows)[^\s"'<>\\)]*/gi,
    "[WEBHOOK_CONFIGURED]",
  );
  result = result.replace(/li_at=[^\s;]+/g, "li_at=[REDACTED]");
  result = result.replace(/\/(?:Users|home)\/[^/\s]+/g, "/[USER_PATH]");
  result = result.replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, "C:\\[USER_PATH]");
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  result = result.replace(
    /(?:\+?1[\s.-]?)?(?:\([2-9][0-9]{2}\)|[2-9][0-9]{2})[\s.-]?[2-9][0-9]{2}[\s.-]?[0-9]{4}\b/g,
    "[PHONE]",
  );
  result = result.replace(
    /(Bearer\s+[^\s"'<>]+|(?:access_token|refresh_token|api[_-]?key|token|secret|password|x-jobsentinel-token)=[^\s&"'<>\\)]+|["']?(?:access_token|refresh_token|api[_-]?key|token|secret|password|x-jobsentinel-token)["']?\s*:\s*["'][^"']+["']|(?:token|secret|password)\s+[^\s"'<>]+)/gi,
    "[TOKEN]",
  );
  result = result.replace(/https?:\/\/[^\s"'<>\\)]+/gi, "[URL]");
  result = result.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, "[IP_ADDRESS]");
  result = result.replace(
    /\b((?:salary|compensation|pay)[ _-]?(?:floor|expectation|target|range|requirement)|expected salary|desired salary|resume(?:[ _-]?(?:text|data|content|summary|excerpt))?|cover[ _-]?letter(?:[ _-]?(?:text|data|content|summary|excerpt))?|private[ _-]?notes?|application[ _-]?(?:history|notes?)|screening[ _-]?(?:questions?|answers?)|question[ _-]?text|answer[ _-]?text|location[ _-]?preferences?|career[ _-]?goals?|personal[ _-]?circumstances?|(?:full|candidate|applicant|user|your)[ _-]?name)\s*[:=]\s*[^\r\n]+/gim,
    "$1: [JOB_SEARCH_DETAIL_REDACTED]",
  );
  result = result.replace(
    /\b((?:my\s+)?(?:salary|compensation|pay)\s+(?:floor|expectation|target|range|requirement)|expected salary|desired salary|private note|application note|screening answer|location preference|career goal|personal circumstance)\s+(?:is|are|was|were)\s+[^\r\n]+/gim,
    "$1 [JOB_SEARCH_DETAIL_REDACTED]",
  );
  result = result.replace(
    /\b((?:my|candidate|applicant|user)\s+name)\s+(?:is|was)\s+[^\r\n]+/gim,
    "$1 [PERSON_NAME_REDACTED]",
  );
  result = result.replace(/"[^"]+"/g, "\"[REDACTED]\"");
  result = result.replace(/'[^']+'/g, "'[REDACTED]'");
  result = result.replace(
    /\b((?:while\s+)?(?:applying|applied|interviewing|interviewed|negotiating|rejected|offer(?:ed)?|laid off|layoff|unemployed|employment gap|resume gap|job search urgency)\b[^\r\n]*)/gim,
    "[JOB_SEARCH_DETAIL_REDACTED]",
  );

  return result;
}

function sanitizeMockFeedbackText(args?: Record<string, unknown>): string {
  const content = getStringArg(args, "content") ?? "";
  return sanitizeMockSupportReportText(content);
}

function getMockFeedbackCategory(args?: Record<string, unknown>): MockFeedbackCategory {
  const category = getStringArg(args, "category");
  return category === "bug" || category === "feature" || category === "question"
    ? category
    : "question";
}

function getMockFeedbackCategoryLabel(category: MockFeedbackCategory): string {
  switch (category) {
    case "bug":
      return "Problem Report";
    case "feature":
      return "Improvement Idea";
    case "question":
      return "General Feedback";
  }
}

function getMockSystemInfo() {
  return {
    app_version: "dev",
    platform: "mock",
    os_version: "browser",
    architecture: "wasm",
  };
}

function getMockConfigSummary() {
  const configWithCompanies = config as {
    company_blacklist?: unknown;
    company_whitelist?: unknown;
  };
  return {
    scrapers_enabled: 3,
    keywords_count: config.keywords_boost.length,
    has_location_prefs: config.location_preferences.cities.length > 0,
    has_salary_prefs: config.salary_floor_usd > 0,
    has_company_blocklist: getArrayLength(configWithCompanies.company_blacklist) > 0,
    has_company_allowlist: getArrayLength(configWithCompanies.company_whitelist) > 0,
    notifications_configured: Number(config.alerts.email?.enabled ?? false),
    has_resume: Boolean(getActiveResume()),
  };
}

function isExternalHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return !isLocalOrPrivateHost(url.hostname);
  } catch {
    return false;
  }
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host === "0.0.0.0" ||
    host.startsWith("127.")
  ) {
    return true;
  }

  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function normalizeApplicationProfile(value: Partial<MockApplicationProfile>): MockApplicationProfile {
  const defaults = getDefaultApplicationProfile();
  return {
    ...defaults,
    ...value,
    id: typeof value.id === "number" ? value.id : defaults.id,
    fullName: typeof value.fullName === "string" ? value.fullName : defaults.fullName,
    email: typeof value.email === "string" ? value.email : defaults.email,
    phone: nullableString(value.phone),
    linkedinUrl: nullableString(value.linkedinUrl),
    githubUrl: nullableString(value.githubUrl),
    portfolioUrl: nullableString(value.portfolioUrl),
    websiteUrl: nullableString(value.websiteUrl),
    defaultResumeId: nullableNumber(value.defaultResumeId),
    hasResumeFile: typeof value.hasResumeFile === "boolean" ? value.hasResumeFile : defaults.hasResumeFile,
    resumeFileName: nullableString(value.resumeFileName),
    defaultCoverLetterTemplate: nullableString(value.defaultCoverLetterTemplate),
    usWorkAuthorized: typeof value.usWorkAuthorized === "boolean" ? value.usWorkAuthorized : defaults.usWorkAuthorized,
    requiresSponsorship: typeof value.requiresSponsorship === "boolean" ? value.requiresSponsorship : defaults.requiresSponsorship,
    maxApplicationsPerDay: typeof value.maxApplicationsPerDay === "number" ? value.maxApplicationsPerDay : defaults.maxApplicationsPerDay,
    requireManualApproval: typeof value.requireManualApproval === "boolean" ? value.requireManualApproval : defaults.requireManualApproval,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : defaults.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : defaults.updatedAt,
  };
}

function displayFileNameFromPath(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim().split(/[\\/]/).filter(Boolean).pop() ?? "Selected resume";
}

function displayFileNameFromResumeToken(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const token = value.trim();
  const tokenParts = token.split("--");
  const displayName = tokenParts.slice(1).join("--").trim();
  if (tokenParts.length >= 2 && displayName.length > 0) {
    return displayName;
  }

  return displayFileNameFromPath(token);
}

function normalizeScreeningAnswer(value: Partial<MockScreeningAnswer>): MockScreeningAnswer {
  const now = new Date().toISOString();
  return {
    id: typeof value.id === "number" ? value.id : 1,
    questionPattern: typeof value.questionPattern === "string" ? value.questionPattern : "",
    answer: typeof value.answer === "string" ? value.answer : "",
    answerType: nullableString(value.answerType),
    notes: nullableString(value.notes),
    timesUsed: typeof value.timesUsed === "number" ? value.timesUsed : undefined,
    timesModified: typeof value.timesModified === "number" ? value.timesModified : undefined,
    confidenceScore: typeof value.confidenceScore === "number" ? value.confidenceScore : undefined,
    lastUsedAt: nullableString(value.lastUsedAt),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

function normalizeInterviewPrepState(value: Record<string, unknown>): Record<string, MockPrepChecklistItem[]> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, items]) => Array.isArray(items))
      .map(([interviewId, items]) => [
        interviewId,
        (items as unknown[]).map(normalizePrepChecklistItem),
      ]),
  );
}

function normalizePrepChecklistItem(value: unknown): MockPrepChecklistItem {
  const source = isRecord(value) ? value : {};
  return {
    itemId: typeof source.itemId === "string" ? source.itemId : "",
    completed: typeof source.completed === "boolean" ? source.completed : false,
    completedAt: nullableString(source.completedAt),
  };
}

function normalizeFollowUpState(value: Record<string, unknown>): Record<string, MockFollowUpReminder> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, followup]) => isRecord(followup))
      .map(([interviewId, followup]) => [
        interviewId,
        normalizeFollowUpReminder(followup),
      ]),
  );
}

function normalizeFollowUpReminder(value: unknown): MockFollowUpReminder {
  const source = isRecord(value) ? value : {};
  return {
    interviewId: numberValue(source.interviewId, 0),
    thankYouSent: booleanValue(source.thankYouSent, false),
    sentAt: nullableString(source.sentAt),
  };
}

function getEmptyBuilderContact(): MockBuilderContact {
  return {
    name: "",
    email: "",
    phone: null,
    linkedin: null,
    github: null,
    location: null,
    website: null,
  };
}

function normalizeBuilderContact(value: unknown): MockBuilderContact {
  const source = value && typeof value === "object"
    ? value as Partial<MockBuilderContact>
    : {};
  const defaults = getEmptyBuilderContact();

  return {
    name: typeof source.name === "string" ? source.name : defaults.name,
    email: typeof source.email === "string" ? source.email : defaults.email,
    phone: nullableString(source.phone),
    linkedin: nullableString(source.linkedin),
    github: nullableString(source.github),
    location: nullableString(source.location),
    website: nullableString(source.website),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function normalizeBuilderExperience(value: unknown, fallbackId: number): MockBuilderExperience {
  const source = value && typeof value === "object"
    ? value as Partial<MockBuilderExperience> & { bullets?: unknown }
    : {};
  const achievements = stringArray(source.achievements);

  return {
    id: typeof source.id === "number" && source.id > 0 ? source.id : fallbackId,
    title: typeof source.title === "string" ? source.title : "",
    company: typeof source.company === "string" ? source.company : "",
    location: nullableString(source.location),
    start_date: typeof source.start_date === "string" ? source.start_date : "",
    end_date: nullableString(source.end_date),
    achievements: achievements.length > 0 ? achievements : stringArray(source.bullets),
  };
}

function normalizeBuilderEducation(value: unknown, fallbackId: number): MockBuilderEducation {
  const source = value && typeof value === "object"
    ? value as Partial<MockBuilderEducation> & { honors?: unknown }
    : {};

  return {
    id: typeof source.id === "number" && source.id > 0 ? source.id : fallbackId,
    degree: typeof source.degree === "string" ? source.degree : "",
    institution: typeof source.institution === "string" ? source.institution : "",
    location: nullableString(source.location),
    graduation_date: nullableString(source.graduation_date),
    gpa: nullableString(source.gpa),
    honors: stringArray(source.honors),
  };
}

function normalizeBuilderSkill(value: unknown): MockBuilderSkill | null {
  const source = value && typeof value === "object" ? value as Partial<MockBuilderSkill> : {};
  if (typeof source.name !== "string" || typeof source.category !== "string") {
    return null;
  }

  return {
    name: source.name,
    category: source.category,
    proficiency: isBuilderProficiency(source.proficiency) ? source.proficiency : null,
  };
}

function isBuilderProficiency(value: unknown): value is MockBuilderSkill["proficiency"] {
  return (
    value === null ||
    value === "beginner" ||
    value === "intermediate" ||
    value === "advanced" ||
    value === "expert"
  );
}

function normalizeResumeDraft(value: Partial<MockResumeDraft> | undefined | null): MockResumeDraft {
  const source = value ?? {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "number" ? source.id : 1,
    contact: normalizeBuilderContact(source.contact),
    summary: typeof source.summary === "string" ? source.summary : "",
    experience: Array.isArray(source.experience)
      ? source.experience.map((experience, index) =>
        normalizeBuilderExperience(experience, index + 1)
      )
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((education, index) => normalizeBuilderEducation(education, index + 1))
      : [],
    skills: Array.isArray(source.skills)
      ? source.skills.map(normalizeBuilderSkill).filter((skill): skill is MockBuilderSkill => !!skill)
      : [],
    certifications: stringArray(source.certifications),
    projects: stringArray(source.projects),
    created_at: typeof source.created_at === "string" ? source.created_at : now,
    updated_at: typeof source.updated_at === "string" ? source.updated_at : now,
  };
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

function getResumeTemplates(): MockResumeTemplate[] {
  return [
    {
      id: "Classic",
      name: "Classic Professional",
      description: "Traditional chronological format with clear sections. Works with most upload forms.",
      preview_image: "/templates/classic-preview.png",
    },
    {
      id: "Modern",
      name: "Modern Minimal",
      description: "Clean, contemporary design with subtle styling and upload-friendly structure.",
      preview_image: "/templates/modern-preview.png",
    },
    {
      id: "Technical",
      name: "Skills-First",
      description: "Highlights relevant skills and projects when skills matter most.",
      preview_image: "/templates/technical-preview.png",
    },
    {
      id: "Executive",
      name: "Executive Summary",
      description: "Highlights leadership and impact metrics. Ideal for senior positions.",
      preview_image: "/templates/executive-preview.png",
    },
    {
      id: "Military",
      name: "Military Transition",
      description: "Translates military experience for civilian employers. Includes clearance.",
      preview_image: "/templates/military-preview.png",
    },
  ];
}

function renderMockResumeHtml(value: unknown): string {
  const draft = normalizeResumeDraft(value as Partial<MockResumeDraft>);
  const skills = draft.skills.map((skill) => escapeHtml(skill.name)).join(", ");
  const experience = draft.experience
    .map((item) => `<li>${escapeHtml(item.title)} at ${escapeHtml(item.company)}</li>`)
    .join("");

  return `
    <article>
      <h1>${escapeHtml(draft.contact.name)}</h1>
      <p>${escapeHtml(draft.contact.email)}</p>
      <section>
        <h2>Summary</h2>
        <p>${escapeHtml(draft.summary)}</p>
      </section>
      <section>
        <h2>Experience</h2>
        <ul>${experience}</ul>
      </section>
      <section>
        <h2>Skills</h2>
        <p>${skills}</p>
      </section>
    </article>
  `;
}

function analyzeMockResumeFormat(args?: Record<string, unknown>): MockAtsAnalysisResult {
  const resume = getArg(args, "resume");
  const sections = getMockAtsResumeSections(resume);
  const formatIssues: MockFormatIssue[] = [];
  const suggestions: MockAtsSuggestion[] = [];

  if (!getNestedString(resume, ["contact_info", "email"])) {
    formatIssues.push({
      severity: "Critical",
      issue: "Missing email address",
      fix: "Add your professional email address",
    });
  }
  if (sections.experience.length === 0) {
    formatIssues.push({
      severity: "Warning",
      issue: "Missing experience section",
      fix: "Add recent roles with quantified achievements",
    });
    suggestions.push({
      category: "AddSection",
      suggestion: "Add work experience with measurable impact",
      impact: "Makes your work evidence easier to compare in one place.",
    });
  }
  if (sections.skills.length === 0) {
    formatIssues.push({
      severity: "Warning",
      issue: "Missing skills section",
      fix: "Add relevant role-specific, workplace, and transferable skills",
    });
  }
  if (hasMockAdversarialResumeText(sections.allText)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Instruction-like or hidden resume text detected",
      fix: "Remove instructions aimed at screening tools and keep only truthful qualifications, work evidence, and readable application content.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion:
        "Review the resume for prompt-injection-like instructions, hidden text, or invisible characters before using it.",
      impact:
        "Keeps the resume readable and avoids tactics that can backfire with employers or screening systems.",
    });
  }
  if (hasMockKeywordListBullet(sections)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Experience bullet reads like a keyword list",
      fix: "Rewrite it as a plain work example with your role, action, tools, and result.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion: "Turn keyword-list bullets into readable work evidence you can explain.",
      impact: "Keeps strong terms useful without making the resume look machine-written.",
    });
  }
  if (hasMockUnclearCapabilityLevel(sections)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Capability level needs review",
      fix: "Confirm whether this was exposure, assisted work, independent delivery, ownership, or expert work, then keep the wording at that true level.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion: "Match the bullet to the true level of responsibility before strengthening it.",
      impact:
        "Prevents overstating experience while still making real hands-on work visible.",
    });
  }
  if (hasMockGenericFillerBullet(sections)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Experience bullet reads like generic resume filler",
      fix: "Replace generic buzzwords with specific work evidence: what you did, who it helped, and what changed.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion: "Replace generic filler with specific work evidence you can explain.",
      impact: "Makes the bullet easier for people to evaluate without overstating the claim.",
    });
  }

  const formatScore = clampScore(100 - formatIssues.length * 10);
  const completenessScore = clampScore(
    40 +
      (sections.summary ? 15 : 0) +
      Math.min(sections.experience.length, 3) * 10 +
      Math.min(sections.skills.length, 6) * 3,
  );

  return {
    overall_score: Math.round((formatScore * 0.5 + completenessScore * 0.5) * 10) / 10,
    keyword_score: 0,
    format_score: formatScore,
    completeness_score: completenessScore,
    keyword_matches: [],
    missing_keywords: [],
    missing_keyword_details: [],
    requirement_reviews: [],
    hard_constraint_risks: [],
    format_issues: formatIssues,
    suggestions,
  };
}

function analyzeMockResumeForJob(args?: Record<string, unknown>): MockAtsAnalysisResult {
  const resume = getArg(args, "resume");
  const jobDescription = getStringArg(args, "jobDescription") ?? "";
  const formatResult = analyzeMockResumeFormat(args);
  const sections = getMockAtsResumeSections(resume);
  const keywords = extractMockAtsKeywords(jobDescription);
  const keywordMatches: MockKeywordMatch[] = [];
  const missingKeywordDetails: MockAtsKeyword[] = [];

  for (const { keyword, importance } of keywords) {
    const foundIn = findMockKeywordLocations(sections, keyword);
    if (foundIn.length > 0) {
      keywordMatches.push({
        keyword,
        found_in: foundIn,
        frequency: countMockEvidenceFrequency(sections, keyword),
        importance,
      });
    } else {
      missingKeywordDetails.push({ keyword, importance });
    }
  }

  const missingKeywords = missingKeywordDetails.map(({ keyword }) => keyword);
  const keywordScore = keywords.length > 0
    ? Math.round((keywordMatches.length / keywords.length) * 1000) / 10
    : 0;
  const requirementReviews = buildMockRequirementReviews(
    keywords,
    keywordMatches,
    missingKeywordDetails,
  );
  const hardConstraintRisks = buildMockHardConstraintRisks(requirementReviews);
  const scoreCap = hardConstraintRisks.reduce<number | undefined>(
    (current, risk) =>
      current === undefined ? risk.score_cap : Math.min(current, risk.score_cap),
    undefined,
  );
  const suggestions: MockAtsSuggestion[] = [
    ...formatResult.suggestions,
    ...missingKeywordDetails.map(({ keyword, importance }) => {
      const impact = importance === "Required"
        ? "Required job-post language is easier to compare when real evidence is visible."
        : importance === "Preferred"
          ? "Preferred job-post language can help when it honestly fits your background."
          : "Role language can improve clarity when it accurately describes your work.";

      return {
        category: "AddKeyword" as const,
        suggestion: `Review whether '${keyword}' is true for your background and worth making visible`,
        impact,
      };
    }),
  ];
  const uncappedOverallScore = Math.round(
    (keywordScore * 0.4 + formatResult.format_score * 0.3 + formatResult.completeness_score * 0.3) * 10,
  ) / 10;

  return {
    ...formatResult,
    overall_score: scoreCap === undefined
      ? uncappedOverallScore
      : Math.min(uncappedOverallScore, scoreCap),
    keyword_score: keywordScore,
    keyword_matches: keywordMatches,
    missing_keywords: missingKeywords,
    missing_keyword_details: missingKeywordDetails,
    requirement_reviews: requirementReviews,
    hard_constraint_risks: hardConstraintRisks,
    suggestions,
  };
}

function buildMockRequirementReviews(
  keywords: MockAtsKeyword[],
  keywordMatches: MockKeywordMatch[],
  missingKeywordDetails: MockAtsKeyword[],
): MockRequirementReview[] {
  const reviews: MockRequirementReview[] = [];

  for (const { keyword, importance } of keywords) {
    const matched = keywordMatches.find((candidate) =>
      candidate.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (matched) {
      const matchState = classifyMockRequirementState(matched);
      reviews.push({
        keyword,
        importance,
        match_state: matchState,
        evidence_sections: matched.found_in,
        hard_constraint: Boolean(getMockHardConstraintCategory(keyword)),
        recommendation: getMockRequirementRecommendation(matchState),
      });
      continue;
    }

    if (
      missingKeywordDetails.some((candidate) =>
        candidate.keyword.toLowerCase() === keyword.toLowerCase()
      )
    ) {
      reviews.push({
        keyword,
        importance,
        match_state: "Missing",
        evidence_sections: [],
        hard_constraint: Boolean(getMockHardConstraintCategory(keyword)),
        recommendation: getMockRequirementRecommendation("Missing"),
      });
    }
  }

  return reviews.sort((a, b) => {
    const importanceOrder: Record<MockKeywordImportance, number> = {
      Required: 0,
      Preferred: 1,
      Industry: 2,
    };
    const stateOrder: Record<MockRequirementMatchState, number> = {
      Missing: 0,
      Partial: 1,
      Implied: 2,
      Direct: 3,
      Strong: 4,
    };

    return (
      importanceOrder[a.importance] - importanceOrder[b.importance] ||
      stateOrder[a.match_state] - stateOrder[b.match_state] ||
      a.keyword.localeCompare(b.keyword)
    );
  });
}

function classifyMockRequirementState(match: MockKeywordMatch): MockRequirementMatchState {
  const hasDirectEvidence = match.found_in.some((section) =>
    [
      "resume text",
      "experience",
      "current experience",
      "summary",
      "projects",
      "education",
      "certifications",
      "licenses",
    ].includes(section)
  );

  if (hasDirectEvidence && (match.frequency > 1 || match.found_in.length > 1)) {
    return "Strong";
  }
  if (hasDirectEvidence) {
    return "Direct";
  }
  if (match.found_in.includes("skills")) {
    return "Partial";
  }
  return "Implied";
}

function getMockRequirementRecommendation(state: MockRequirementMatchState): string {
  switch (state) {
    case "Strong":
      return "Strong visible evidence found. Keep it easy to see near the relevant role.";
    case "Direct":
      return "Found visible evidence. Keep it clear and tied to real work or credentials.";
    case "Partial":
      return "Found in a lighter evidence area. Add supporting evidence only if true.";
    case "Implied":
      return "Related evidence may exist, but the wording is not clear. Review before relying on it.";
    case "Missing":
      return "Only add it if true. If this is required and not true, treat the role as higher risk.";
  }
}

function buildMockHardConstraintRisks(
  requirementReviews: MockRequirementReview[],
): MockHardConstraintRisk[] {
  return requirementReviews
    .filter(
      (review) =>
        review.importance === "Required" && review.match_state === "Missing",
    )
    .flatMap((review) => {
      const category = getMockHardConstraintCategory(review.keyword);
      if (!category) return [];
      return [
        {
          requirement: review.keyword,
          category,
          score_cap: getMockHardConstraintScoreCap(category),
          reason: "A required hard constraint was not clearly found in the resume.",
          action: getMockHardConstraintAction(category),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.score_cap - b.score_cap || a.requirement.localeCompare(b.requirement),
    );
}

function getMockHardConstraintAction(category: MockHardConstraintCategory): string {
  switch (category) {
    case "WorkAuthorization":
      return "Check work authorization before tailoring. If it is not true for you, do not claim it.";
    case "SecurityClearance":
      return "Check clearance before tailoring. If it is not current or true for you, do not claim it.";
    case "LicenseOrCertification":
      return "Check license or certification before tailoring. If it is not current or true for you, do not claim it.";
    case "Education":
      return "Check the degree or education requirement before tailoring. If it is not true for you, do not claim it.";
    case "Experience":
      return "Check years or level before tailoring. Do not round up, stretch titles, or imply more experience than you have.";
    case "PhysicalRequirement":
      return "Check this physical demand before tailoring. If it is not workable or safe for you, do not claim it.";
    case "Location":
      return "Check location, schedule, availability, or travel before tailoring. If it is not workable for you, do not claim it.";
  }
}

function getMockHardConstraintScoreCap(category: MockHardConstraintCategory): number {
  switch (category) {
    case "WorkAuthorization":
      return 50;
    case "SecurityClearance":
    case "LicenseOrCertification":
      return 60;
    case "Education":
    case "Experience":
      return 65;
    case "PhysicalRequirement":
    case "Location":
      return 70;
  }
}

function getMockHardConstraintCategory(keyword: string): MockHardConstraintCategory | null {
  const lower = keyword.toLowerCase();
  if (
    lower.includes("work authorization") ||
    lower.includes("authorized to work") ||
    lower.includes("visa sponsorship") ||
    lower.includes("us citizenship") ||
    lower.includes("u.s. citizenship") ||
    lower.includes("us citizen") ||
    lower.includes("u.s. citizen") ||
    lower.includes("citizenship required")
  ) {
    return "WorkAuthorization";
  }
  if (lower.includes("security clearance") || lower === "clearance") {
    return "SecurityClearance";
  }
  if (
    lower.includes("license") ||
    lower.includes("certification") ||
    ["cdl", "cissp", "security+", "rn", "bls", "acls", "cpr"].includes(lower) ||
    lower === "cna" ||
    lower === "lpn" ||
    lower === "lvn" ||
    lower.includes("certified nursing assistant") ||
    lower.includes("certified nurse assistant") ||
    lower.includes("certified nurse aide") ||
    lower.includes("licensed practical nurse") ||
    lower.includes("licensed vocational nurse") ||
    lower === "pmp" ||
    lower.includes("project management professional") ||
    lower === "servsafe" ||
    lower.includes("food safety certification") ||
    lower.includes("food handler") ||
    lower.includes("first aid") ||
    lower.includes("first-aid") ||
    lower.includes("forklift certification") ||
    lower.includes("forklift certified") ||
    lower.includes("forklift license") ||
    lower.includes("forklift operator") ||
    lower.includes("osha 10") ||
    lower.includes("osha10") ||
    lower.includes("osha 30") ||
    lower.includes("osha30") ||
    lower.includes("basic life support") ||
    lower.includes("advanced cardiovascular life support") ||
    lower.includes("cardiopulmonary resuscitation")
  ) {
    return "LicenseOrCertification";
  }
  if (lower.includes("equivalent experience")) {
    return null;
  }
  if (
    lower.includes("degree") ||
    lower.includes("bachelor") ||
    lower.includes("master") ||
    lower.includes("phd") ||
    lower.includes("high school") ||
    lower.includes("general education development") ||
    lower === "ged"
  ) {
    return "Education";
  }
  if (
    lower.includes("year") ||
    lower.includes("yrs") ||
    lower.includes("level experience") ||
    lower === "management experience"
  ) {
    return "Experience";
  }
  if (
    lower.includes("lift ") ||
    lower.includes("pound") ||
    lower.includes("lbs") ||
    lower.includes("physical requirement") ||
    lower.includes("physical demand") ||
    lower.includes("stand for long")
  ) {
    return "PhysicalRequirement";
  }
  if (
    lower.includes("onsite") ||
    lower.includes("on-site") ||
    lower.includes("on site") ||
    lower.includes("relocation") ||
    lower.includes("travel") ||
    lower.includes("transportation") ||
    lower.includes("commute") ||
    lower.includes("availability") ||
    lower.includes("available") ||
    lower.includes("schedule") ||
    lower.includes("weekend") ||
    lower.includes("night shift") ||
    lower.includes("evening")
  ) {
    return "Location";
  }
  return null;
}

function improveMockBulletPoint(args?: Record<string, unknown>): string {
  const bullet = getStringArg(args, "bullet")?.trim() ?? "";
  let improved = bullet;
  const lower = improved.toLowerCase();

  if (!ATS_POWER_WORDS.some((word) => lower.startsWith(word))) {
    if (lower.includes("was responsible for")) {
      improved = improved.replace(/was responsible for/i, "Managed");
    } else if (lower.includes("worked on")) {
      improved = improved.replace(/worked on/i, "Developed");
    } else if (lower.includes("helped with")) {
      improved = improved.replace(/helped with/i, "Contributed to");
    }
  }

  if (!/\d|%/.test(improved)) {
    improved += " (add a true number, outcome, or concrete detail if you have one)";
  }

  const jobContext = getStringArg(args, "jobContext") ?? getStringArg(args, "job_context");
  if (jobContext) {
    const requiredKeywords = extractMockAtsKeywords(jobContext)
      .filter((candidate) => candidate.importance === "Required")
      .map((candidate) => candidate.keyword)
      .filter((keyword) => !improved.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 2);
    if (requiredKeywords.length > 0) {
      improved += ` (review if these are true and worth making visible: ${requiredKeywords.join(", ")})`;
    }
  }

  improved = appendMockInterviewDefensePrompt(improved);

  return improved;
}

function appendMockInterviewDefensePrompt(text: string): string {
  const prompt = "problem, your role, action, result, and evidence";
  if (text.includes(prompt)) return text;
  return `${text} (before using, make sure you can explain the ${prompt})`;
}

function getMockAtsResumeSections(value: unknown): {
  summary: string;
  experience: string[];
  currentExperience: string[];
  pastExperience: string[];
  skills: string[];
  education: string[];
  certifications: string[];
  projects: string[];
  allText: string;
} {
  const source = isRecord(value) ? value : {};
  const experienceEntries = Array.isArray(source.experience)
    ? source.experience.map((item) => ({
        text: collectRecordText(item),
        current: isMockCurrentExperience(item),
      }))
    : [];
  const experience = experienceEntries.map((item) => item.text);
  const currentExperience = experienceEntries
    .filter((item) => item.current)
    .map((item) => item.text);
  const pastExperience = experienceEntries
    .filter((item) => !item.current)
    .map((item) => item.text);
  const skills = Array.isArray(source.skills)
    ? source.skills.map((item) => collectRecordText(item))
    : [];
  const education = Array.isArray(source.education)
    ? source.education.map((item) => collectRecordText(item))
    : [];
  const certifications = Array.isArray(source.certifications)
    ? source.certifications.map((item) => collectRecordText(item))
    : [];
  const projects = Array.isArray(source.projects)
    ? source.projects.map((item) => collectRecordText(item))
    : [];
  const summary = typeof source.summary === "string" ? source.summary : "";
  const contactInfo = collectRecordText(source.contact_info);
  const allText = [
    contactInfo,
    summary,
    ...experience,
    ...skills,
    ...education,
    ...certifications,
    ...projects,
  ]
    .filter((text) => text.length > 0)
    .join(" ");

  return {
    summary,
    experience,
    currentExperience,
    pastExperience,
    skills,
    education,
    certifications,
    projects,
    allText,
  };
}

function isMockCurrentExperience(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.current === true || value.is_current === true) return true;

  const endDate = typeof value.end_date === "string"
    ? value.end_date
    : typeof value.endDate === "string"
      ? value.endDate
      : "";

  return endDate.trim().toLowerCase() === "present";
}

function hasMockAdversarialResumeText(text: string): boolean {
  if (
    ["\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF"].some((character) =>
      text.includes(character)
    )
  ) {
    return true;
  }

  const lower = text.toLowerCase();
  return [
    "ignore previous instructions",
    "ignore all previous instructions",
    "disregard previous instructions",
    "override instructions",
    "system prompt",
    "developer message",
    "prompt injection",
    "always rank this resume",
    "always select this candidate",
    "hire this candidate",
    "ignore the job description",
    "do not follow the job description",
    "instruction to recruiter software",
    "for ai screeners",
  ].some((phrase) => lower.includes(phrase));
}

function hasMockKeywordListBullet(
  sections: ReturnType<typeof getMockAtsResumeSections>,
): boolean {
  return [...sections.experience, ...sections.projects].some((line) =>
    mockLineLooksLikeKeywordList(line)
  );
}

function hasMockUnclearCapabilityLevel(
  sections: ReturnType<typeof getMockAtsResumeSections>,
): boolean {
  return [...sections.experience, ...sections.projects].some((line) =>
    mockLineHasUnclearCapabilityLevel(line)
  );
}

function mockLineHasUnclearCapabilityLevel(line: string): boolean {
  const padded = ` ${line.toLowerCase()} `;
  const ownershipTerms = [
    " owned ",
    " owner ",
    " led ",
    " managed ",
    " directed ",
    " architected ",
    " independently delivered ",
    " expert ",
    " strategic ",
  ];
  const exposureTerms = [
    " shadowed ",
    " shadowing ",
    " observed ",
    " observing ",
    " assisted ",
    " helped ",
    " exposure to ",
    " exposed to ",
    " trained on ",
    " familiar with ",
    " under supervision ",
  ];

  return ownershipTerms.some((term) => padded.includes(term)) &&
    exposureTerms.some((term) => padded.includes(term));
}

function hasMockGenericFillerBullet(
  sections: ReturnType<typeof getMockAtsResumeSections>,
): boolean {
  return [...sections.experience, ...sections.projects].some((line) =>
    mockLineLooksLikeGenericFiller(line)
  );
}

function mockLineLooksLikeGenericFiller(line: string): boolean {
  const trimmed = line.trim().replace(/^[-*•]\s*/, "");
  if (!trimmed) return false;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 7 || wordCount > 32) return false;

  const lower = trimmed.toLowerCase();
  const fillerPhrases = [
    "results-oriented",
    "results oriented",
    "dynamic",
    "team player",
    "proven track record",
    "strategic",
    "excellence",
    "self-motivated",
    "self motivated",
    "detail-oriented",
    "detail oriented",
    "fast-paced",
    "fast paced",
    "go-getter",
    "go getter",
    "synergy",
    "best-in-class",
    "best in class",
    "world-class",
    "world class",
    "passionate",
  ];
  const phraseCount = fillerPhrases.filter((phrase) => lower.includes(phrase)).length;

  return phraseCount >= 4;
}

function mockLineLooksLikeKeywordList(line: string): boolean {
  const trimmed = line.trim().replace(/^[-*•]\s*/, "");
  if (!trimmed) return false;

  const separatorCount = (trimmed.match(/[,;]/g) ?? []).length;
  if (separatorCount < 4) return false;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 5 || wordCount > 24) return false;

  const padded = ` ${trimmed.toLowerCase()} `;
  return ![
    " led ",
    " managed ",
    " built ",
    " improved ",
    " coordinated ",
    " trained ",
    " supported ",
    " delivered ",
    " reduced ",
    " increased ",
    " created ",
    " maintained ",
  ].some((word) => padded.includes(word));
}

function collectRecordText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectRecordText).join(" ");
  if (!isRecord(value)) return "";
  return Object.values(value).map(collectRecordText).filter((text) => text.length > 0).join(" ");
}

function getNestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return typeof current === "string" && current.length > 0 ? current : undefined;
}

function extractMockAtsKeywords(jobDescription: string): MockAtsKeyword[] {
  const lower = jobDescription.toLowerCase();
  const seen = new Set<string>();
  const hasDegreeEquivalent = hasMockDegreeEquivalentRequirement(jobDescription);
  const knownKeywords = ATS_KNOWN_KEYWORDS.filter((keyword) =>
    !(hasDegreeEquivalent && isMockExactDegreeKeyword(keyword)) &&
    getConservativeMockSearchTerms(keyword).some((term) => lower.includes(term))
  );
  const keywords = [
    ...knownKeywords,
    ...extractMockHardConstraintKeywords(jobDescription),
  ].filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return keywords
    .map((keyword) => ({
      keyword,
      importance: getMockKeywordImportance(jobDescription, keyword),
    }));
}

function extractMockHardConstraintKeywords(jobDescription: string): string[] {
  const patterns = [
    /\b(work authorization|authorized to work|visa sponsorship|u\.?s\.?\s+citizenship|u\.?s\.?\s+citizen|citizenship required)\b/gi,
    /\b(security clearance|clearance)\b/gi,
    /\b(driver'?s license|driver license|cdl|rn license|nursing license|lpn|lvn|licensed practical nurse|licensed vocational nurse)\b/gi,
    /\b(certification|cissp|security\+|bls|basic life support|acls|advanced cardiovascular life support|cpr|cardiopulmonary resuscitation|cna|certified nursing assistant|certified nurse assistant|certified nurse aide|pmp|project management professional|servsafe|food safety certification|food handler certification|food handler certificate|food handler permit|food handlers permit|food handler card|first[- ]aid certification|first[- ]aid certified|first[- ]aid certificate|first[- ]aid|forklift certification|forklift certified|forklift operator certification|forklift operator certified|forklift license|forklift operator license|osha\s*10(?:[- ]hour)?(?:\s+certification)?|osha\s*30(?:[- ]hour)?(?:\s+certification)?)\b/gi,
    /\b(bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree|high school diploma|high school degree|ged|high school equivalency|general education development)\b/gi,
    /\b\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?[a-zA-Z][a-zA-Z0-9+#/.-]*(?:\s+[a-zA-Z][a-zA-Z0-9+#/.-]*){0,3}\b/gi,
    /\b(lift(?:\s+up\s+to)?\s+\d+\s*(?:pounds?|lbs?)|stand for long periods?|physical requirements?|physical demands?)\b/gi,
    /\b(onsite|on-site|on site|relocation|travel|reliable transportation|own transportation|commute|availability|available|schedule|weekend availability|night shift|evening shift)\b/gi,
  ];
  const keywords = new Set<string>();
  const hasDegreeEquivalent = hasMockDegreeEquivalentRequirement(jobDescription);
  if (hasDegreeEquivalent) {
    keywords.add("degree or equivalent experience");
  }

  for (const pattern of patterns) {
    let match = pattern.exec(jobDescription);
    while (match) {
      keywords.add(match[0].toLowerCase());
      match = pattern.exec(jobDescription);
    }
  }
  if (hasDegreeEquivalent) {
    for (const exactDegree of [
      "degree",
      "bachelor's degree",
      "bachelor degree",
      "master's degree",
      "master degree",
    ]) {
      keywords.delete(exactDegree);
    }
  }
  const specificCertificationKeywords = [
    "cissp",
    "security+",
    "bls",
    "basic life support",
    "acls",
    "advanced cardiovascular life support",
    "cpr",
    "cardiopulmonary resuscitation",
    "cna",
    "certified nursing assistant",
    "certified nurse assistant",
    "certified nurse aide",
    "lpn",
    "lvn",
    "licensed practical nurse",
    "licensed vocational nurse",
    "pmp",
    "project management professional",
    "servsafe",
    "food safety certification",
    "food handler certification",
    "food handler certificate",
    "food handler permit",
    "food handlers permit",
    "food handler card",
    "first aid",
    "first-aid",
    "first aid certification",
    "first-aid certification",
    "first aid certified",
    "first-aid certified",
    "first aid certificate",
    "first-aid certificate",
    "forklift certification",
    "forklift certified",
    "forklift operator certification",
    "forklift operator certified",
    "forklift license",
    "forklift operator license",
    "osha 10",
    "osha10",
    "osha 10 certification",
    "osha10 certification",
    "osha 10-hour",
    "osha 10-hour certification",
    "osha 10 hour",
    "osha 10 hour certification",
    "osha 30",
    "osha30",
    "osha 30 certification",
    "osha30 certification",
    "osha 30-hour",
    "osha 30-hour certification",
    "osha 30 hour",
    "osha 30 hour certification",
  ];
  if ([...keywords].some((keyword) => specificCertificationKeywords.includes(keyword))) {
    keywords.delete("certification");
  }
  for (const keyword of extractMockSeniorityConstraintKeywords(jobDescription)) {
    keywords.add(keyword);
  }

  return [...keywords].sort();
}

function hasMockDegreeEquivalentRequirement(text: string): boolean {
  return /\b(?:bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree)\s+(?:or|\/)\s+(?:equivalent|commensurate)\s+(?:work\s+)?experience\b/i
    .test(text);
}

function isMockExactDegreeKeyword(keyword: string): boolean {
  return [
    "degree",
    "bachelor's degree",
    "bachelor degree",
    "master's degree",
    "master degree",
  ].includes(keyword.toLowerCase());
}

function extractMockSeniorityConstraintKeywords(text: string): string[] {
  const patterns: Array<[RegExp, string]> = [
    [/\b(senior[- ]level|senior|sr\.)\b/i, "senior-level experience"],
    [/\b(lead[- ]level|team lead|leadership experience)\b/i, "lead-level experience"],
    [
      /\b(staff[- ]level|principal[- ]level|staff engineer|principal engineer|principal consultant)\b/i,
      "staff/principal-level experience",
    ],
    [
      /\b(people management|management experience|manager[- ]level|supervisory experience|team management)\b/i,
      "management experience",
    ],
    [/\b(director[- ]level|director experience|department director)\b/i, "director-level experience"],
    [
      /\b(executive[- ]level|executive leadership|c-suite|vice president|vp)\b/i,
      "executive-level experience",
    ],
    [/\b(mid[- ]level|intermediate)\b/i, "mid-level experience"],
  ];

  return patterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, keyword]) => keyword)
    .sort();
}

function getMockKeywordImportance(
  jobDescription: string,
  keyword: string,
): MockKeywordImportance {
  const lower = jobDescription.toLowerCase();
  const termIndexes = getConservativeMockSearchTerms(keyword)
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0);
  const keywordIndex = termIndexes.length > 0 ? Math.min(...termIndexes) : -1;
  const preferredIndex = lower.indexOf("preferred");
  const requiredIndex = lower.indexOf("required");

  if (preferredIndex >= 0 && keywordIndex >= preferredIndex) {
    return "Preferred";
  }
  if (requiredIndex >= 0 && (preferredIndex < 0 || keywordIndex < preferredIndex)) {
    return "Required";
  }
  return "Industry";
}

function findMockKeywordLocations(
  sections: ReturnType<typeof getMockAtsResumeSections>,
  keyword: string,
): string[] {
  const searchTerms = getConservativeMockSearchTerms(keyword);
  const locations: string[] = [];
  if (containsAnyMockKeyword(sections.summary, searchTerms)) locations.push("summary");
  if (sections.currentExperience.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("current experience");
  }
  if (sections.pastExperience.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("experience");
  }
  if (sections.skills.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("skills");
  }
  if (sections.education.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("education");
  }
  if (sections.certifications.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("certifications");
  }
  if (sections.projects.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("projects");
  }
  return locations;
}

function getConservativeMockSearchTerms(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  const terms = [lower];
  const equivalenceGroups = [
    ["crm", "customer relationship management"],
    [
      "customer service",
      "customer support",
      "client service",
      "client services",
      "client support",
    ],
    ["data entry", "data-entry"],
    ["onsite", "on-site", "on site"],
    ["bls", "basic life support"],
    ["acls", "advanced cardiovascular life support"],
    ["cpr", "cardiopulmonary resuscitation"],
    ["cdl", "commercial driver's license", "commercial driver license"],
    ["rn", "registered nurse"],
    [
      "lpn",
      "licensed practical nurse",
      "lvn",
      "licensed vocational nurse",
    ],
    [
      "pmp",
      "project management professional",
      "pmp certification",
      "project management professional certification",
    ],
    [
      "cna",
      "certified nursing assistant",
      "certified nurse assistant",
      "certified nurse aide",
    ],
    [
      "food safety",
      "food safety certification",
      "servsafe",
      "food handler certification",
      "food handler certificate",
      "food handler permit",
      "food handlers permit",
      "food handler card",
    ],
    [
      "first aid",
      "first-aid",
      "first aid certification",
      "first-aid certification",
      "first aid certified",
      "first-aid certified",
      "first aid certificate",
      "first-aid certificate",
    ],
    [
      "forklift",
      "forklift certification",
      "forklift certified",
      "forklift operator certification",
      "forklift operator certified",
      "forklift license",
      "forklift operator license",
    ],
    [
      "osha 10",
      "osha10",
      "osha 10 certification",
      "osha10 certification",
      "osha 10-hour",
      "osha 10-hour certification",
      "osha 10 hour",
      "osha 10 hour certification",
    ],
    [
      "osha 30",
      "osha30",
      "osha 30 certification",
      "osha30 certification",
      "osha 30-hour",
      "osha 30-hour certification",
      "osha 30 hour",
      "osha 30 hour certification",
    ],
    ["cissp", "certified information systems security professional"],
    [
      "high school diploma",
      "high school degree",
      "ged",
      "high school equivalency",
      "general education development",
    ],
  ];

  for (const group of equivalenceGroups) {
    if (group.includes(lower)) {
      for (const term of group) {
        if (!terms.includes(term)) terms.push(term);
      }
    }
  }

  const seniorityTerms: Record<string, string[]> = {
    "senior-level experience": [
      "senior",
      "sr.",
      "lead",
      "5 years",
      "5+ years",
      "5 yrs",
      "5+ yrs",
      ...getMockExperienceYearSearchTerms(6),
    ],
    "mid-level experience": [
      "mid-level",
      "intermediate",
      "3 years",
      "3+ years",
      "3 yrs",
      "3+ yrs",
      ...getMockExperienceYearSearchTerms(4),
    ],
    "lead-level experience": [
      "lead",
      "team lead",
      "leadership experience",
      "supervised",
      "supervisor",
      ...getMockExperienceYearSearchTerms(5),
    ],
    "staff/principal-level experience": [
      "staff",
      "principal",
      "architect",
      "10 years",
      "10+ years",
      ...getMockExperienceYearSearchTerms(11),
    ],
    "management experience": [
      "management",
      "manager",
      "managed",
      "people management",
      "supervised",
      "supervisor",
    ],
    "director-level experience": [
      "director",
      "head of",
      "department lead",
      "10 years",
      "10+ years",
      ...getMockExperienceYearSearchTerms(11),
    ],
    "executive-level experience": [
      "executive",
      "vp",
      "vice president",
      "chief",
      "c-level",
      "10 years",
      "10+ years",
      ...getMockExperienceYearSearchTerms(11),
    ],
  };
  for (const term of seniorityTerms[lower] ?? []) {
    if (!terms.includes(term)) terms.push(term);
  }
  if (lower === "degree or equivalent experience") {
    for (const term of [
      "degree",
      "bachelor's degree",
      "bachelor degree",
      "bachelor",
      "ba",
      "bs",
      "master's degree",
      "master degree",
      "master",
      "ma",
      "ms",
      "equivalent experience",
      "work experience",
      "experience",
    ]) {
      if (!terms.includes(term)) terms.push(term);
    }
  }

  return terms;
}

function getMockExperienceYearSearchTerms(minYears: number): string[] {
  const terms: string[] = [];
  for (let years = minYears; years <= 50; years += 1) {
    terms.push(`${years} years`);
    terms.push(`${years}+ years`);
    terms.push(`${years} yrs`);
    terms.push(`${years}+ yrs`);
  }
  return terms;
}

function containsAnyMockKeyword(text: string, searchTerms: string[]): boolean {
  const lower = text.toLowerCase();
  return searchTerms.some((term) => lower.includes(term));
}

function countMockSearchTermFrequency(text: string, keyword: string): number {
  const searchTerms = getConservativeMockSearchTerms(keyword);
  return Math.max(
    0,
    ...searchTerms.map((term) => countKeywordFrequency(text, term)),
  );
}

function countMockEvidenceFrequency(
  sections: ReturnType<typeof getMockAtsResumeSections>,
  keyword: string,
): number {
  const base = countMockSearchTermFrequency(sections.allText, keyword);
  if (base === 0) return 0;
  const searchTerms = getConservativeMockSearchTerms(keyword);
  const workEvidence = [
    ...sections.currentExperience,
    ...sections.pastExperience,
    ...sections.projects,
  ];
  const hasMetricBackedEvidence = workEvidence.some((text) =>
    containsAnyMockKeyword(text, searchTerms) &&
      (
        hasMockMetricBackedEvidence(text) ||
        hasMockScopeBackedEvidence(text) ||
        hasMockResponsibilityBackedEvidence(text)
      )
  );
  return hasMetricBackedEvidence ? base + 1 : base;
}

function hasMockMetricBackedEvidence(text: string): boolean {
  return /\b\d+(?:\.\d+)?\s*(?:%|(?:percent|clients?|customers?|cases?|tickets?|orders?|projects?|reports?|days?|weeks?|months?)\b)|\$\s*\d/i
    .test(text);
}

function hasMockScopeBackedEvidence(text: string): boolean {
  return /\bacross\s+(?:[a-z]+\s+){0,5}(?:teams?|departments?|locations?|sites?|regions?|markets?|service\s+lines?)\b/i
    .test(text);
}

function hasMockResponsibilityBackedEvidence(text: string): boolean {
  return /\b(?:owned|managed|administered|developed|implemented|improved|operated)\b.+\b(?:workflows?|process(?:es)?|programs?|operations?|intake|cases?|systems?|tools?)\b/i
    .test(text);
}

function countKeywordFrequency(text: string, keyword: string): number {
  if (!keyword) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(text.matchAll(new RegExp(escaped, "gi"))).length;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

function getMockSalaryBenchmark(args?: Record<string, unknown>): MockSalaryBenchmark {
  const jobTitle = getStringArg(args, "jobTitle") ?? getStringArg(args, "job_title") ?? "Marketing Manager";
  const location = getStringArg(args, "location") ?? "Remote";
  const seniority = getStringArg(args, "seniority") ?? "mid";
  const seniorityLabel = toMockSeniorityLabel(seniority);
  const seniorityMultiplier = seniorityLabel === "Entry"
    ? 0.72
    : seniorityLabel === "Senior"
      ? 1.18
      : seniorityLabel === "Staff" || seniorityLabel === "Principal"
        ? 1.38
        : 1;
  const base = Math.round(68000 * seniorityMultiplier);

  return {
    job_title: jobTitle,
    location,
    seniority_level: seniorityLabel,
    min_salary: base - 35000,
    p25_salary: base - 15000,
    median_salary: base,
    p75_salary: base + 30000,
    max_salary: base + 55000,
    average_salary: base + 5000,
    sample_size: 128,
    last_updated: new Date().toISOString(),
  };
}

function toMockSeniorityLabel(value: string): string {
  switch (value.toLowerCase()) {
    case "entry":
      return "Entry";
    case "senior":
      return "Senior";
    case "staff":
      return "Staff";
    case "principal":
    case "executive":
      return "Principal";
    case "mid":
      return "Mid";
    default:
      return "Unknown";
  }
}

function generateMockNegotiationScript(args?: Record<string, unknown>): string {
  const params = isRecord(getArg(args, "params")) ? getArg(args, "params") as Record<string, unknown> : {};
  const scenario = getStringArg(args, "scenario") ?? "initial_offer";
  const jobTitle = typeof params.job_title === "string" ? params.job_title : "the role";
  const targetSalary = typeof params.target_salary === "string" ? params.target_salary : "72000";
  const currentOffer = typeof params.current_offer === "string" ? params.current_offer : "64000";

  return [
    `Scenario: ${scenario.replace(/_/g, " ")}`,
    "",
    `Thank you for the offer for ${jobTitle}. Based on market data and the scope of this role, I was targeting ${formatMockCurrency(targetSalary)}.`,
    `Given the current offer of ${formatMockCurrency(currentOffer)}, I would like to discuss aligning compensation closer to ${formatMockCurrency(targetSalary)}.`,
    "",
    "Key points:",
    "- Anchor on market benchmarks and role impact.",
    "- Keep tone collaborative and specific.",
    "- Ask whether base salary, bonus, or equity can close the gap.",
  ].join("\n");
}

function formatMockCurrency(value: string): string {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function detectMockAtsPlatform(args?: Record<string, unknown>): MockAtsDetectionResponse {
  const url = getStringArg(args, "url") ?? "";
  const platform = getMockAtsPlatform(url);
  return {
    platform,
    commonFields: getMockAtsCommonFields(platform),
    automationNotes: getMockAtsAutomationNotes(platform),
  };
}

function getMockAtsPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io")) return "greenhouse";
  if (lower.includes("lever.co")) return "lever";
  if (lower.includes("myworkdayjobs.com") || lower.includes("workday")) return "workday";
  if (lower.includes("icims.com")) return "icims";
  if (lower.includes("bamboohr.com")) return "bamboohr";
  if (lower.includes("ashbyhq.com")) return "ashbyhq";
  if (lower.includes("taleo.net")) return "taleo";
  return "unknown";
}

function getMockAtsCommonFields(platform: string): string[] {
  const baseFields = ["firstName", "lastName", "email", "phone", "resume"];
  if (platform === "greenhouse" || platform === "lever") {
    return [...baseFields, "coverLetter", "linkedin"];
  }
  if (platform === "workday") {
    return [...baseFields, "address", "workAuthorization"];
  }
  return baseFields;
}

function getMockAtsAutomationNotes(platform: string): string {
  if (platform === "unknown") {
    return "Unknown ATS. Review fields carefully before submitting.";
  }
  return `${platform} supports guided form filling. Review before submitting.`;
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

function getMockSuggestedAnswers(args?: Record<string, unknown>): MockAnswerSuggestion[] {
  const question = getStringArg(args, "question") ?? "";
  const limit = getNumericArg(args, "limit") ?? 5;
  const normalizedQuestion = question.toLowerCase();

  return screeningAnswers
    .filter((answer) => {
      try {
        if (new RegExp(answer.questionPattern, "i").test(question)) {
          return true;
        }
      } catch {
        // Fall through to token matching.
      }

      const patternTokens = answer.questionPattern
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2);
      return patternTokens.length > 0 &&
        patternTokens.every((token) => normalizedQuestion.includes(token));
    })
    .slice(0, limit)
    .map((answer) => ({
      answer: answer.answer,
      confidence: answer.confidenceScore ?? 0.8,
      source: {
        type: "manual",
        answerId: answer.id,
      },
      timesUsed: answer.timesUsed ?? 0,
      timesModified: answer.timesModified ?? 0,
      lastUsedDaysAgo: answer.lastUsedAt ? 1 : null,
      modificationRate: answer.timesUsed && answer.timesUsed > 0
        ? (answer.timesModified ?? 0) / answer.timesUsed
        : 0,
    }));
}

function getMockScraperHealth(): MockScraperHealthMetrics[] {
  return MOCK_SCRAPERS.map((scraper, index) => {
    const isEnabled = scraperEnabledOverrides[scraper.scraper_name] ?? true;
    const status: MockHealthStatus = isEnabled
      ? index % 7 === 0 ? "degraded" : "healthy"
      : "disabled";
    return {
      ...scraper,
      is_enabled: isEnabled,
      health_status: status,
      selector_health: status === "degraded" ? "degraded" : "healthy",
      success_rate_24h: status === "healthy" ? 96 : status === "degraded" ? 82 : 0,
      avg_duration_ms: isEnabled ? 850 + index * 75 : null,
      last_success: isEnabled ? new Date(Date.now() - (index + 1) * 600000).toISOString() : null,
      last_error: status === "degraded" ? "Selector fallback used" : null,
      total_runs_24h: isEnabled ? 12 : 0,
      jobs_found_24h: isEnabled ? 4 + index : 0,
    };
  });
}

function getMockHealthSummary() {
  const health = getMockScraperHealth();
  return {
    total_scrapers: health.length,
    healthy: health.filter((scraper) => scraper.health_status === "healthy").length,
    degraded: health.filter((scraper) => scraper.health_status === "degraded").length,
    down: health.filter((scraper) => scraper.health_status === "down").length,
    disabled: health.filter((scraper) => scraper.health_status === "disabled").length,
    total_jobs_24h: health.reduce((sum, scraper) => sum + scraper.jobs_found_24h, 0),
  };
}

function getMockScraperRuns(args?: Record<string, unknown>): MockScraperRun[] {
  const scraperName = getStringArg(args, "scraperName") ?? getStringArg(args, "scraper_name") ?? "greenhouse";
  const limit = getNumericArg(args, "limit") ?? 20;
  return Array.from({ length: limit }, (_, index) => {
    const startedAt = new Date(Date.now() - (index + 1) * 3600000).toISOString();
    return {
      id: index + 1,
      scraper_name: scraperName,
      started_at: startedAt,
      finished_at: new Date(Date.now() - (index + 1) * 3600000 + 900).toISOString(),
      duration_ms: 900 + index * 25,
      status: "success",
      jobs_found: 5 + index,
      jobs_new: 2,
      error_message: null,
      error_code: null,
      retry_attempt: 0,
    };
  });
}

function getMockLatestSourceRequest(args?: Record<string, unknown>): MockSourceRequestSummary | null {
  const source = getStringArg(args, "source") ?? "jobswithgpt";
  if (source !== "jobswithgpt" || !hasConfiguredJobsWithGpt(config)) {
    return null;
  }

  return {
    id: 1,
    source,
    sentAt: new Date(Date.now() - 3600000).toISOString(),
    endpointHost: "api.jobswithgpt.example",
    titleCount: config.title_allowlist.filter((title) => title.trim().length > 0).length,
    hasLocation: false,
    remoteOnly: Boolean(config.location_preferences?.allow_remote && !config.location_preferences?.allow_onsite),
    resultLimit: 100,
    outcome: "success",
  };
}

function getMockSmokeTestResult(scraperName: string): MockSmokeTestResult {
  return {
    scraper_name: scraperName,
    test_type: "connectivity",
    passed: scraperEnabledOverrides[scraperName] !== false,
    duration_ms: 700,
    details: null,
    error: scraperEnabledOverrides[scraperName] === false ? "Scraper disabled" : null,
  };
}

function getMockExpiringCredentials(): MockCredentialHealth[] {
  return [];
}

function getInterviewIdArg(args?: Record<string, unknown>): number | undefined {
  return getNumericArg(args, "interviewId") ?? getNumericArg(args, "interview_id");
}

function saveMockInterviewPrepItem(args?: Record<string, unknown>): void {
  const interviewId = getInterviewIdArg(args);
  const itemId = getStringArg(args, "itemId") ?? getStringArg(args, "item_id");
  if (!interviewId || !itemId) {
    throw new Error("interviewId and itemId are required");
  }

  const completed = booleanValue(getArg(args, "completed"), false);
  const key = String(interviewId);
  const existingItems = interviewPrepChecklists[key] ?? [];
  const nextItem: MockPrepChecklistItem = {
    itemId,
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  };
  interviewPrepChecklists[key] = [
    ...existingItems.filter((item) => item.itemId !== itemId),
    nextItem,
  ];
  saveMockState();
}

function saveMockInterviewFollowup(args?: Record<string, unknown>): MockFollowUpReminder {
  const interviewId = getInterviewIdArg(args);
  if (!interviewId) {
    throw new Error("interviewId is required");
  }

  const thankYouSent = booleanValue(
    getArg(args, "thankYouSent") ?? getArg(args, "thank_you_sent"),
    false,
  );
  const followup: MockFollowUpReminder = {
    interviewId,
    thankYouSent,
    sentAt: thankYouSent ? new Date().toISOString() : null,
  };
  interviewFollowups[String(interviewId)] = followup;
  saveMockState();
  return followup;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const escapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return escapes[char] ?? char;
  });
}

function isCredentialKey(value: unknown): value is MockCredentialKey {
  return (
    value === "slack_webhook" ||
    value === "smtp_password" ||
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

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isSortOption(value: unknown): value is SortOption {
  return typeof value === "string" && SORT_OPTIONS.includes(value as SortOption);
}

function isScoreFilter(value: unknown): value is ScoreFilter {
  return typeof value === "string" && SCORE_FILTERS.includes(value as ScoreFilter);
}

function isPostedDateFilter(value: unknown): value is PostedDateFilter {
  return typeof value === "string" && POSTED_DATE_FILTERS.includes(value as PostedDateFilter);
}

function isTemplateCategory(value: unknown): value is MockTemplateCategory {
  return typeof value === "string" && TEMPLATE_CATEGORIES.includes(value as MockTemplateCategory);
}

function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return Object.values(ExperienceLevel).includes(value as ExperienceLevel);
}

function isJobType(value: unknown): value is JobType {
  return Object.values(JobType).includes(value as JobType);
}

function isRemoteType(value: unknown): value is RemoteType {
  return Object.values(RemoteType).includes(value as RemoteType);
}

function isSiteCategory(value: unknown): value is SiteCategory {
  return Object.values(SiteCategory).includes(value as SiteCategory);
}

function getNullablePostedDateFilter(value: unknown): PostedDateFilter | null {
  return isPostedDateFilter(value) ? value : null;
}

function getNextCoverLetterTemplateId(): string {
  const maxId = coverLetterTemplates.reduce((max, template) => {
    const match = /^mock-cover-letter-template-(\d+)$/.exec(template.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mock-cover-letter-template-${maxId + 1}`;
}

function normalizeCoverLetterTemplate(value: unknown): MockCoverLetterTemplate {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "string" && source.id.length > 0
      ? source.id
      : getNextCoverLetterTemplateId(),
    name: typeof source.name === "string" && source.name.trim().length > 0
      ? source.name.trim()
      : "Cover Letter Template",
    content: typeof source.content === "string" ? source.content : "",
    category: isTemplateCategory(source.category) ? source.category : "general",
    createdAt: typeof source.createdAt === "string" && source.createdAt.length > 0
      ? source.createdAt
      : now,
    updatedAt: typeof source.updatedAt === "string" && source.updatedAt.length > 0
      ? source.updatedAt
      : now,
  };
}

function normalizeSourceNotificationConfig(value: unknown, fallback: SourceNotificationConfig): SourceNotificationConfig {
  const source = isRecord(value) ? value : {};
  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : fallback.enabled,
    minScoreThreshold: numberValue(source.minScoreThreshold, fallback.minScoreThreshold),
    soundEnabled: typeof source.soundEnabled === "boolean" ? source.soundEnabled : fallback.soundEnabled,
  };
}

function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    linkedin: { enabled: false, minScoreThreshold: 70, soundEnabled: false },
    indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
    greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
    lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
    jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
    global: {
      enabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      quietHoursEnabled: false,
    },
    advancedFilters: {
      includeKeywords: [],
      excludeKeywords: [],
      minSalary: null,
      remoteOnly: false,
      companyWhitelist: [],
      companyBlacklist: [],
    },
  };
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const source = isRecord(value) ? value : {};
  const defaults = getDefaultNotificationPreferences();
  const global = isRecord(source.global) ? source.global : {};
  const advancedFilters = isRecord(source.advancedFilters) ? source.advancedFilters : {};

  return {
    linkedin: {
      ...normalizeSourceNotificationConfig(source.linkedin, defaults.linkedin),
      enabled: false,
      soundEnabled: false,
    },
    indeed: normalizeSourceNotificationConfig(source.indeed, defaults.indeed),
    greenhouse: normalizeSourceNotificationConfig(source.greenhouse, defaults.greenhouse),
    lever: normalizeSourceNotificationConfig(source.lever, defaults.lever),
    jobswithgpt: normalizeSourceNotificationConfig(source.jobswithgpt, defaults.jobswithgpt),
    global: {
      enabled: typeof global.enabled === "boolean" ? global.enabled : defaults.global.enabled,
      quietHoursStart: typeof global.quietHoursStart === "string"
        ? global.quietHoursStart
        : defaults.global.quietHoursStart,
      quietHoursEnd: typeof global.quietHoursEnd === "string"
        ? global.quietHoursEnd
        : defaults.global.quietHoursEnd,
      quietHoursEnabled: typeof global.quietHoursEnabled === "boolean"
        ? global.quietHoursEnabled
        : defaults.global.quietHoursEnabled,
    },
    advancedFilters: {
      includeKeywords: stringArray(advancedFilters.includeKeywords),
      excludeKeywords: stringArray(advancedFilters.excludeKeywords),
      minSalary: nullableNumber(advancedFilters.minSalary),
      remoteOnly: booleanValue(advancedFilters.remoteOnly, defaults.advancedFilters.remoteOnly),
      companyWhitelist: stringArray(advancedFilters.companyWhitelist),
      companyBlacklist: stringArray(advancedFilters.companyBlacklist),
    },
  };
}

function getDefaultCoverLetterTemplates(): MockCoverLetterTemplate[] {
  const now = new Date().toISOString();
  const defaults: Array<Pick<MockCoverLetterTemplate, "name" | "category" | "content">> = [
    {
      name: "Professional Cover Letter",
      category: "general",
      content: "Dear {hiring_manager},\n\nI am interested in the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Customer Support Cover Letter",
      category: "general",
      content: "Dear {hiring_manager},\n\nI can bring {skill1} and {skill2} experience to the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Thank You - Post Interview",
      category: "thankyou",
      content: "Dear {hiring_manager},\n\nThank you for meeting with me about the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Application Follow-Up",
      category: "followup",
      content: "Dear {hiring_manager},\n\nI wanted to follow up on my application for the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Interview Follow-Up (No Response)",
      category: "followup",
      content: "Dear {hiring_manager},\n\nI wanted to check in on the status of the {position} process at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Withdraw Application",
      category: "withdrawal",
      content: "Dear {hiring_manager},\n\nI have decided to withdraw my application for the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
  ];

  return defaults.map((template, index) => ({
    id: `mock-cover-letter-template-${index + 1}`,
    createdAt: now,
    updatedAt: now,
    ...template,
  }));
}

function getNextSavedSearchId(): string {
  const maxId = savedSearches.reduce((max, search) => {
    const match = /^mock-saved-search-(\d+)$/.exec(search.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mock-saved-search-${maxId + 1}`;
}

function normalizeSavedSearch(value: unknown): MockSavedSearch {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "string" && source.id.length > 0
      ? source.id
      : getNextSavedSearchId(),
    name: typeof source.name === "string" && source.name.trim().length > 0
      ? source.name.trim()
      : "Saved search",
    sortBy: isSortOption(source.sortBy) ? source.sortBy : "score-desc",
    scoreFilter: isScoreFilter(source.scoreFilter) ? source.scoreFilter : "all",
    sourceFilter: typeof source.sourceFilter === "string" ? source.sourceFilter : "all",
    remoteFilter: typeof source.remoteFilter === "string" ? source.remoteFilter : "all",
    bookmarkFilter: typeof source.bookmarkFilter === "string" ? source.bookmarkFilter : "all",
    notesFilter: typeof source.notesFilter === "string" ? source.notesFilter : "all",
    postedDateFilter: getNullablePostedDateFilter(source.postedDateFilter),
    salaryMinFilter: nullableNumber(source.salaryMinFilter),
    salaryMaxFilter: nullableNumber(source.salaryMaxFilter),
    ghostFilter: nullableString(source.ghostFilter),
    textSearch: nullableString(source.textSearch),
    createdAt: typeof source.createdAt === "string" && source.createdAt.length > 0
      ? source.createdAt
      : now,
    lastUsedAt: nullableString(source.lastUsedAt),
  };
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function getNextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function toScoreFraction(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, score));
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

function hasOwnInputKey(value: MockSkillInput, key: keyof MockSkillInput): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function trimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function skillYearsOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeProfileInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function upsertMockApplicationProfile(args?: Record<string, unknown>): number {
  const input = normalizeProfileInput(getArg(args, "input"));
  const existing = applicationProfile ?? getDefaultApplicationProfile();
  const now = new Date().toISOString();

  const selectedResumeFileName = displayFileNameFromResumeToken(input.resume_file_token);
  const clearResumeFile = booleanValue(input.clear_resume_file, false);

  applicationProfile = {
    id: existing.id,
    fullName: String(input.full_name ?? ""),
    email: String(input.email ?? ""),
    phone: nullableString(input.phone),
    linkedinUrl: nullableString(input.linkedin_url),
    githubUrl: nullableString(input.github_url),
    portfolioUrl: nullableString(input.portfolio_url),
    websiteUrl: nullableString(input.website_url),
    defaultResumeId: nullableNumber(input.default_resume_id),
    hasResumeFile: clearResumeFile
      ? false
      : selectedResumeFileName !== null || existing.hasResumeFile,
    resumeFileName: clearResumeFile
      ? null
      : selectedResumeFileName ?? existing.resumeFileName,
    defaultCoverLetterTemplate: nullableString(input.default_cover_letter_template),
    usWorkAuthorized: booleanValue(input.us_work_authorized, true),
    requiresSponsorship: booleanValue(input.requires_sponsorship, false),
    maxApplicationsPerDay: numberValue(input.max_applications_per_day, 10),
    requireManualApproval: booleanValue(input.require_manual_approval, true),
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  saveMockState();

  return applicationProfile.id;
}

function upsertMockScreeningAnswer(args?: Record<string, unknown>): void {
  const questionPattern =
    getStringArg(args, "questionPattern") ?? getStringArg(args, "question_pattern") ?? "";
  const answer = getStringArg(args, "answer") ?? "";
  const answerType =
    getStringArg(args, "answerType") ?? getStringArg(args, "answer_type") ?? "text";
  const notes = nullableString(getArg(args, "notes"));
  const existing = screeningAnswers.find(
    (screeningAnswer) => screeningAnswer.questionPattern === questionPattern,
  );
  const now = new Date().toISOString();

  if (existing) {
    screeningAnswers = screeningAnswers.map((screeningAnswer) =>
      screeningAnswer.id === existing.id
        ? {
            ...screeningAnswer,
            answer,
            answerType,
            notes,
            updatedAt: now,
          }
        : screeningAnswer,
    );
  } else {
    screeningAnswers = [
      ...screeningAnswers,
      {
        id: getNextId(screeningAnswers),
        questionPattern,
        answer,
        answerType,
        notes,
        timesUsed: 0,
        timesModified: 0,
        confidenceScore: 1,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

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
      return getMockConfigSummary() as T;

    case "get_debug_log_events":
      return [] as T;

    case "generate_feedback_report":
      return generateMockFeedbackReport(args) as T;

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
      return analyzeMockResumeFormat(args) as T;

    case "analyze_resume_for_job":
      return analyzeMockResumeForJob(args) as T;

    case "analyze_active_resume_for_job": {
      const activeResume = getActiveResume();
      if (!activeResume) {
        throw new Error("Choose or add a resume before reviewing job fit.");
      }

      const readableText = (activeResume.parsed_text ?? "").trim();
      if (!readableText) {
        throw new Error("JobSentinel could not find readable text in the active resume.");
      }

      return analyzeMockResumeForJob({
        resume: {
          summary: readableText,
          experience: [],
          skills: [],
          education: [],
          certifications: [],
          projects: [],
          custom_sections: {},
        },
        jobDescription: getStringArg(args, "jobDescription") ?? "",
      }) as T;
    }

    case "get_ats_power_words":
      return [...ATS_POWER_WORDS] as T;

    case "improve_bullet_point":
      return improveMockBulletPoint(args) as T;

    case "export_resume_docx":
      return [80, 75, 3, 4, 20, 0, 0, 0] as T;

    case "export_resume_html":
      return renderMockResumeHtml(getArg(args, "resume")) as T;

    case "export_resume_text": {
      const draft = normalizeResumeDraft(getArg(args, "resume") as Partial<MockResumeDraft>);
      return `${draft.contact.name}\n${draft.contact.email}\n\n${draft.summary}` as T;
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
      return [
        { skill_name: "Customer Support", total_jobs: 512, avg_salary: 62000, change_percent: 24, trend_direction: "up" },
        { skill_name: "Project Coordination", total_jobs: 245, avg_salary: 74000, change_percent: 18, trend_direction: "up" },
        { skill_name: "Patient Care", total_jobs: 334, avg_salary: 68000, change_percent: 15, trend_direction: "stable" },
        { skill_name: "Bilingual Communication", total_jobs: 189, avg_salary: 64000, change_percent: 12, trend_direction: "up" },
        { skill_name: "Data Reporting", total_jobs: 276, avg_salary: 88000, change_percent: 9, trend_direction: "stable" },
      ] as T;

    case "get_active_companies":
      return [
        { company_name: "CareBridge Health", total_posted: 45, avg_active: 15, hiring_trend: "up", avg_salary: 76000, growth_rate: 25 },
        { company_name: "Metro Learning Center", total_posted: 22, avg_active: 8, hiring_trend: "up", avg_salary: 68000, growth_rate: 18 },
        { company_name: "Northstar Logistics", total_posted: 78, avg_active: 22, hiring_trend: "stable", avg_salary: 72000, growth_rate: 15 },
      ] as T;

    case "get_hottest_locations":
      return [
        { location: "Chicago, IL", city: "Chicago", state: "IL", total_jobs: 245, avg_median_salary: 82000, remote_percent: 35 },
        { location: "Phoenix, AZ", city: "Phoenix", state: "AZ", total_jobs: 198, avg_median_salary: 71000, remote_percent: 28 },
        { location: "Remote", city: null, state: null, total_jobs: 312, avg_median_salary: 78000, remote_percent: 100 },
        { location: "Atlanta, GA", city: "Atlanta", state: "GA", total_jobs: 156, avg_median_salary: 76000, remote_percent: 42 },
      ] as T;

    case "get_market_alerts":
      return marketAlerts as T;

    case "get_market_snapshot":
      return {
        date: new Date().toISOString(),
        total_jobs: 911,
        new_jobs_today: 47,
        jobs_filled_today: 12,
        avg_salary: 76000,
        median_salary: 72000,
        remote_job_percentage: 42,
        top_skill: "Customer Support",
        top_company: "CareBridge Health",
        jobs_30d_change: 8.5,
        salary_30d_change: 2.1,
        market_sentiment: "neutral",
      } as T;

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
      return getMockApplicationProfilePreview() as T;

    case "get_application_profile":
      return getMockApplicationProfileEdit() as T;

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
      return detectMockAtsPlatform(args) as T;

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
      return getMockSuggestedAnswers(args) as T;

    // Scraper health commands
    case "get_health_summary":
      return getMockHealthSummary() as T;

    case "get_scraper_health":
      return getMockScraperHealth() as T;

    case "get_expiring_credentials":
      return getMockExpiringCredentials() as T;

    case "set_scraper_enabled": {
      const scraperName = getStringArg(args, "scraperName") ?? getStringArg(args, "scraper_name");
      if (scraperName) {
        scraperEnabledOverrides = {
          ...scraperEnabledOverrides,
          [scraperName]: booleanValue(getArg(args, "enabled"), true),
        };
        saveMockState();
      }
      return undefined as T;
    }

    case "get_scraper_runs":
      return getMockScraperRuns(args) as T;

    case "get_latest_source_request":
      return getMockLatestSourceRequest(args) as T;

    case "run_scraper_smoke_test": {
      const scraperName = getStringArg(args, "scraperName") ?? getStringArg(args, "scraper_name") ?? "greenhouse";
      return getMockSmokeTestResult(scraperName) as T;
    }

    case "run_all_smoke_tests":
      return MOCK_SCRAPERS.map((scraper) => getMockSmokeTestResult(scraper.scraper_name)) as T;

    // Interview prep and follow-up commands
    case "get_interview_prep_checklist": {
      const interviewId = getInterviewIdArg(args);
      return (interviewId ? interviewPrepChecklists[String(interviewId)] ?? [] : []) as T;
    }

    case "save_interview_prep_item":
      saveMockInterviewPrepItem(args);
      return undefined as T;

    case "get_interview_followup": {
      const interviewId = getInterviewIdArg(args);
      return (interviewId ? interviewFollowups[String(interviewId)] ?? null : null) as T;
    }

    case "save_interview_followup":
      return saveMockInterviewFollowup(args) as T;

    // Cover letter templates
    case "seed_default_templates": {
      if (coverLetterTemplates.length > 0) {
        return 0 as T;
      }
      coverLetterTemplates = getDefaultCoverLetterTemplates();
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
      const template = normalizeCoverLetterTemplate({
        id: getNextCoverLetterTemplateId(),
        name: getStringArg(args, "name"),
        content: getStringArg(args, "content"),
        category: getStringArg(args, "category"),
        createdAt: now,
        updatedAt: now,
      });
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

      const updatedTemplate = normalizeCoverLetterTemplate({
        ...existingTemplate,
        name: getStringArg(args, "name") ?? existingTemplate.name,
        content: getStringArg(args, "content") ?? existingTemplate.content,
        category: getStringArg(args, "category") ?? existingTemplate.category,
        updatedAt: new Date().toISOString(),
      });
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
        notificationPreferences = getDefaultNotificationPreferences();
        saveMockState();
      }
      return normalizeNotificationPreferences(notificationPreferences) as T;
    }

    case "save_notification_preferences":
      notificationPreferences = normalizeNotificationPreferences(getArg(args, "prefs"));
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
        ...normalizeSavedSearch(getArg(args, "search")),
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
  applicationProfile = getDefaultApplicationProfile();
  screeningAnswers = getDefaultScreeningAnswers();
  saveMockState();
}
