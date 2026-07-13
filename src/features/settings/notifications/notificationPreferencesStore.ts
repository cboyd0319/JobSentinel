import { safeInvoke } from "../../../shared/tauri/commandClient";

const SALARY_INPUT_MULTIPLIER = 1000;

export interface SourceNotificationConfig {
  enabled: boolean;
  minScoreThreshold: number; // 0-100
  soundEnabled: boolean;
}

export interface AdvancedFilters {
  // Keyword filters
  includeKeywords: string[]; // Only notify if title contains any of these
  excludeKeywords: string[]; // Never notify if title contains any of these
  // Salary filter
  minSalary: number | null; // Only notify if salary >= this (in thousands)
  // Location filters
  remoteOnly: boolean;
  // Company filters
  includedCompanies: string[]; // Favorite companies - only notify for these (empty = all)
  excludedCompanies: string[]; // Companies to skip - never notify for these
}

export interface NotificationPreferences {
  linkedin: SourceNotificationConfig;
  indeed: SourceNotificationConfig;
  greenhouse: SourceNotificationConfig;
  lever: SourceNotificationConfig;
  jobswithgpt: SourceNotificationConfig;
  global: {
    enabled: boolean;
    quietHoursStart: string; // HH:MM format
    quietHoursEnd: string;
    quietHoursEnabled: boolean;
  };
  // Advanced filters (v1.3)
  advancedFilters: AdvancedFilters;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  includeKeywords: [],
  excludeKeywords: [],
  minSalary: null,
  remoteOnly: false,
  includedCompanies: [],
  excludedCompanies: [],
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  linkedin: { enabled: false, minScoreThreshold: 70, soundEnabled: false },
  indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: false },
  greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: false },
  lever: { enabled: true, minScoreThreshold: 80, soundEnabled: false },
  jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: false },
  global: {
    enabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    quietHoursEnabled: false,
  },
  advancedFilters: DEFAULT_ADVANCED_FILTERS,
};

// Type for source keys only (excluding global and advancedFilters)
type SourceKey = "linkedin" | "indeed" | "greenhouse" | "lever" | "jobswithgpt";

// Extended job info for advanced filtering
export interface JobForNotification {
  title: string;
  company: string;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
  location?: string | null;
}

// Async load from backend
export async function loadNotificationPreferencesAsync(): Promise<NotificationPreferences> {
  const stored = await safeInvoke<NotificationPreferences | null>(
    "get_notification_preferences",
    {},
    {
      logContext: "Load notification preferences",
      silent: true,
    },
  );
  if (stored) {
    // Merge with defaults to handle new fields
    return normalizeNotificationPreferences({
      ...DEFAULT_PREFERENCES,
      ...stored,
    });
  }
  return DEFAULT_PREFERENCES;
}

export function normalizeNotificationPreferences(
  prefs: NotificationPreferences,
): NotificationPreferences {
  return {
    ...prefs,
    linkedin: {
      ...DEFAULT_PREFERENCES.linkedin,
      ...prefs.linkedin,
      enabled: false,
      soundEnabled: false,
    },
    indeed: {
      ...DEFAULT_PREFERENCES.indeed,
      ...prefs.indeed,
      soundEnabled: prefs.indeed?.soundEnabled ?? false,
    },
    greenhouse: {
      ...DEFAULT_PREFERENCES.greenhouse,
      ...prefs.greenhouse,
      soundEnabled: prefs.greenhouse?.soundEnabled ?? false,
    },
    lever: {
      ...DEFAULT_PREFERENCES.lever,
      ...prefs.lever,
      soundEnabled: prefs.lever?.soundEnabled ?? false,
    },
    jobswithgpt: {
      ...DEFAULT_PREFERENCES.jobswithgpt,
      ...prefs.jobswithgpt,
      soundEnabled: prefs.jobswithgpt?.soundEnabled ?? false,
    },
    advancedFilters: {
      ...DEFAULT_ADVANCED_FILTERS,
      ...prefs.advancedFilters,
    },
  };
}

// Async save to backend
export async function saveNotificationPreferencesAsync(
  prefs: NotificationPreferences,
): Promise<boolean> {
  try {
    await safeInvoke(
      "save_notification_preferences",
      { prefs: normalizeNotificationPreferences(prefs) },
      {
        logContext: "Save notification preferences",
      },
    );
    return true;
  } catch {
    // Error already logged
    return false;
  }
}

export function shouldNotifyForJob(
  source: string,
  score: number,
  prefs: NotificationPreferences,
  job?: JobForNotification,
): boolean {
  // Check global enable
  if (!prefs.global.enabled) return false;

  // Check quiet hours
  if (prefs.global.quietHoursEnabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const start = prefs.global.quietHoursStart;
    const end = prefs.global.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  // Check source-specific settings
  const sourceKey = source.toLowerCase().replace(/\s+/g, "") as SourceKey;
  if (sourceKey === "linkedin") return false;

  const sourceConfig = prefs[sourceKey];
  const scorePercent = score * 100;

  if (!sourceConfig) {
    // Unknown source, use default threshold
    return scorePercent >= 70;
  }

  if (!sourceConfig.enabled) return false;

  // Score is 0-1, threshold is 0-100
  if (scorePercent < sourceConfig.minScoreThreshold) return false;

  // Apply advanced filters if job info is provided
  if (job && prefs.advancedFilters) {
    const { advancedFilters } = prefs;
    const titleLower = job.title.toLowerCase();
    const companyLower = job.company.toLowerCase();

    // Include keywords filter (if set, title must contain at least one)
    if (advancedFilters.includeKeywords.length > 0) {
      const hasIncludeKeyword = advancedFilters.includeKeywords.some(
        (keyword) => titleLower.includes(keyword.toLowerCase()),
      );
      if (!hasIncludeKeyword) return false;
    }

    // Exclude keywords filter (if title contains any, skip)
    if (advancedFilters.excludeKeywords.length > 0) {
      const hasExcludeKeyword = advancedFilters.excludeKeywords.some(
        (keyword) => titleLower.includes(keyword.toLowerCase()),
      );
      if (hasExcludeKeyword) return false;
    }

    // Salary filter
    if (advancedFilters.minSalary !== null) {
      const minSalaryThreshold =
        advancedFilters.minSalary * SALARY_INPUT_MULTIPLIER;
      const jobMaxSalary = job.salary_max ?? job.salary_min ?? 0;
      if (jobMaxSalary > 0 && jobMaxSalary < minSalaryThreshold) return false;
    }

    // Remote-only filter
    if (advancedFilters.remoteOnly) {
      const isRemote =
        job.remote ||
        job.location?.toLowerCase().includes("remote") ||
        titleLower.includes("remote");
      if (!isRemote) return false;
    }

    // Favorite companies (if set, company must be in list)
    if (advancedFilters.includedCompanies.length > 0) {
      const isFavorite = advancedFilters.includedCompanies.some((company) =>
        companyLower.includes(company.toLowerCase()),
      );
      if (!isFavorite) return false;
    }

    // Companies to skip (if company is in list, skip)
    if (advancedFilters.excludedCompanies.length > 0) {
      const shouldSkip = advancedFilters.excludedCompanies.some((company) =>
        companyLower.includes(company.toLowerCase()),
      );
      if (shouldSkip) return false;
    }
  }

  return true;
}
