import type { PostedDateFilter, ScoreFilter, SortOption } from "../../features/dashboard/types";
import type {
  NotificationPreferences,
  SourceNotificationConfig,
} from "../../utils/notificationPreferences";

export type MockTemplateCategory =
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

export interface MockCoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: MockTemplateCategory;
  createdAt: string;
  updatedAt: string;
}

export interface MockSavedSearch {
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

export function getNextMockCoverLetterTemplateId(
  templates: MockCoverLetterTemplate[],
): string {
  const maxId = templates.reduce((max, template) => {
    const match = /^mock-cover-letter-template-(\d+)$/.exec(template.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mock-cover-letter-template-${maxId + 1}`;
}

export function normalizeMockCoverLetterTemplate(
  value: unknown,
  fallbackId: string,
): MockCoverLetterTemplate {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "string" && source.id.length > 0
      ? source.id
      : fallbackId,
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

export function getDefaultMockCoverLetterTemplates(): MockCoverLetterTemplate[] {
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

export function getNextMockSavedSearchId(searches: MockSavedSearch[]): string {
  const maxId = searches.reduce((max, search) => {
    const match = /^mock-saved-search-(\d+)$/.exec(search.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mock-saved-search-${maxId + 1}`;
}

export function normalizeMockSavedSearch(
  value: unknown,
  fallbackId: string,
): MockSavedSearch {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "string" && source.id.length > 0
      ? source.id
      : fallbackId,
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

export function normalizeMockNotificationPreferences(value: unknown): NotificationPreferences {
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

function normalizeSourceNotificationConfig(
  value: unknown,
  fallback: SourceNotificationConfig,
): SourceNotificationConfig {
  const source = isRecord(value) ? value : {};
  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : fallback.enabled,
    minScoreThreshold: numberValue(source.minScoreThreshold, fallback.minScoreThreshold),
    soundEnabled: typeof source.soundEnabled === "boolean" ? source.soundEnabled : fallback.soundEnabled,
  };
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

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
