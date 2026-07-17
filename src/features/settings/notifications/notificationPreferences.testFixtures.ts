import type { NotificationPreferences } from "../../../shared/notificationPreferences";

export const DEFAULT_PREFS: NotificationPreferences = {
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
  advancedFilters: {
    includeKeywords: [],
    excludeKeywords: [],
    minSalary: null,
    remoteOnly: false,
    includedCompanies: [],
    excludedCompanies: [],
  },
};
