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
import type { PostedDateFilter, ScoreFilter, SortOption } from "../pages/DashboardTypes";

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
  authToken: string;
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
  resumeFilePath: string | null;
  defaultCoverLetterTemplate: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

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
let credentials: Partial<Record<MockCredentialKey, string>> = {};
let ghostConfig: MockGhostConfig = getDefaultGhostConfig();
let bookmarkletConfig: MockBookmarkletConfig = {
  port: 4321,
  enabled: false,
  authToken: "mock-bookmarklet-token",
};
let resumes: MockResumeData[] = [];
let userSkills: MockUserSkill[] = [];
let resumeDrafts: MockResumeDraft[] = [];
let recentMatches: MockMatchResult[] = [];
let marketAlerts: MockMarketAlert[] = getDefaultMarketAlerts();
let applicationProfile: MockApplicationProfile | null = getDefaultApplicationProfile();
let screeningAnswers: MockScreeningAnswer[] = getDefaultScreeningAnswers();

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
      title: "TypeScript demand is surging",
      description: "TypeScript job postings are up across senior frontend and full-stack roles.",
      severity: "warning",
      related_entity: "TypeScript",
      metric_value: 512,
      metric_change_pct: 32,
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
    fullName: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    linkedinUrl: "https://linkedin.com/in/johndoe",
    githubUrl: "https://github.com/johndoe",
    portfolioUrl: "https://johndoe.com",
    websiteUrl: "https://blog.johndoe.com",
    defaultResumeId: null,
    resumeFilePath: null,
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
      questionPattern: "work.*authorized",
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
    resumeFilePath: nullableString(value.resumeFilePath),
    defaultCoverLetterTemplate: nullableString(value.defaultCoverLetterTemplate),
    usWorkAuthorized: typeof value.usWorkAuthorized === "boolean" ? value.usWorkAuthorized : defaults.usWorkAuthorized,
    requiresSponsorship: typeof value.requiresSponsorship === "boolean" ? value.requiresSponsorship : defaults.requiresSponsorship,
    maxApplicationsPerDay: typeof value.maxApplicationsPerDay === "number" ? value.maxApplicationsPerDay : defaults.maxApplicationsPerDay,
    requireManualApproval: typeof value.requireManualApproval === "boolean" ? value.requireManualApproval : defaults.requireManualApproval,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : defaults.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : defaults.updatedAt,
  };
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
  if (typeof resumeId !== "number") return;

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
      description: "Traditional chronological format with clear sections. Works with any ATS.",
      preview_image: "/templates/classic-preview.png",
    },
    {
      id: "Modern",
      name: "Modern Minimal",
      description: "Clean, contemporary design with subtle styling. ATS-compatible.",
      preview_image: "/templates/modern-preview.png",
    },
    {
      id: "Technical",
      name: "Technical Skills-First",
      description: "Emphasizes technical skills and projects. Perfect for engineering roles.",
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

function getDefaultCoverLetterTemplates(): MockCoverLetterTemplate[] {
  const now = new Date().toISOString();
  const defaults: Array<Pick<MockCoverLetterTemplate, "name" | "category" | "content">> = [
    {
      name: "Professional Cover Letter",
      category: "general",
      content: "Dear {hiring_manager},\n\nI am interested in the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Tech/Engineering Cover Letter",
      category: "tech",
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

function normalizeProfileInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function upsertMockApplicationProfile(args?: Record<string, unknown>): number {
  const input = normalizeProfileInput(getArg(args, "input"));
  const existing = applicationProfile ?? getDefaultApplicationProfile();
  const now = new Date().toISOString();

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
    resumeFilePath: nullableString(input.resume_file_path),
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
      resumeDrafts = resumeDrafts.filter((draft) => draft.id !== resumeId);
      saveMockState();
      return undefined as T;
    }

    case "list_resume_templates":
      return getResumeTemplates() as T;

    case "render_resume_html":
      return renderMockResumeHtml(getArg(args, "resume")) as T;

    case "analyze_resume_format":
      return {
        format_score: 88,
        issues: ["Add more quantified achievements"],
        recommendations: ["Keep sections clear and use standard headings"],
      } as T;

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
      return marketAlerts as T;

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

    // Automation / One-Click Apply
    case "get_application_profile":
      return applicationProfile as T;

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
  credentials = {};
  ghostConfig = getDefaultGhostConfig();
  bookmarkletConfig = {
    port: 4321,
    enabled: false,
    authToken: "mock-bookmarklet-token",
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
