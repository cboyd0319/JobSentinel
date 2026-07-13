import { getArg } from "../../../mocks/handlers/commandHelpers";
import type {
  NotificationPreferences,
  SourceNotificationConfig,
} from "./notificationPreferencesStore";

interface MockNotificationCommandState {
  notificationPreferences: NotificationPreferences | null;
}

export interface MockNotificationCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockNotificationCommandState;
  value: unknown;
}

export function handleMockNotificationCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockNotificationCommandState,
): MockNotificationCommandResult {
  switch (command) {
    case "get_notification_preferences": {
      const notificationPreferences =
        state.notificationPreferences ?? normalizeMockNotificationPreferences(null);
      return {
        handled: true,
        shouldSave: !state.notificationPreferences,
        state: { notificationPreferences },
        value: normalizeMockNotificationPreferences(notificationPreferences),
      };
    }
    case "save_notification_preferences":
      return {
        handled: true,
        shouldSave: true,
        state: {
          notificationPreferences: normalizeMockNotificationPreferences(
            getArg(args, "prefs"),
          ),
        },
        value: undefined,
      };
    default:
      return { handled: false, shouldSave: false, state, value: undefined };
  }
}

export function normalizeMockNotificationPreferences(
  value: unknown,
): NotificationPreferences {
  const source = isRecord(value) ? value : {};
  const defaults = getDefaultNotificationPreferences();
  const global = isRecord(source.global) ? source.global : {};
  const advancedFilters = isRecord(source.advancedFilters)
    ? source.advancedFilters
    : {};

  return {
    linkedin: {
      ...normalizeSourceNotificationConfig(source.linkedin, defaults.linkedin),
      enabled: false,
      soundEnabled: false,
    },
    indeed: normalizeSourceNotificationConfig(source.indeed, defaults.indeed),
    greenhouse: normalizeSourceNotificationConfig(
      source.greenhouse,
      defaults.greenhouse,
    ),
    lever: normalizeSourceNotificationConfig(source.lever, defaults.lever),
    jobswithgpt: normalizeSourceNotificationConfig(
      source.jobswithgpt,
      defaults.jobswithgpt,
    ),
    global: {
      enabled: typeof global.enabled === "boolean"
        ? global.enabled
        : defaults.global.enabled,
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
      remoteOnly: booleanValue(
        advancedFilters.remoteOnly,
        defaults.advancedFilters.remoteOnly,
      ),
      includedCompanies: stringArray(advancedFilters.includedCompanies),
      excludedCompanies: stringArray(advancedFilters.excludedCompanies),
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
      includedCompanies: [],
      excludedCompanies: [],
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
    minScoreThreshold: numberValue(
      source.minScoreThreshold,
      fallback.minScoreThreshold,
    ),
    soundEnabled: typeof source.soundEnabled === "boolean"
      ? source.soundEnabled
      : fallback.soundEnabled,
  };
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
