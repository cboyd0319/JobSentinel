import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import {
  handleMockNotificationCommand,
} from "./notificationCommands";
import type { NotificationPreferences } from "../../../features/settings/notifications/notificationPreferencesStore";

const notificationPreferencesInput: NotificationPreferences = {
  linkedin: { enabled: false, minScoreThreshold: 70, soundEnabled: false },
  indeed: { enabled: false, minScoreThreshold: 85, soundEnabled: false },
  greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
  global: {
    enabled: true,
    quietHoursStart: "21:00",
    quietHoursEnd: "07:00",
    quietHoursEnabled: true,
  },
  advancedFilters: {
    includeKeywords: ["Support"],
    excludeKeywords: ["Contract"],
    minSalary: 55000,
    remoteOnly: true,
    includedCompanies: ["CareBridge Health"],
    excludedCompanies: ["Legacy Staffing"],
  },
};

describe("Settings notification-preference mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("stores notification preferences with the backend command names", async () => {
    const defaults = await mockInvoke<NotificationPreferences>(
      "get_notification_preferences",
    );

    expect(defaults.indeed).toEqual({
      enabled: true,
      minScoreThreshold: 70,
      soundEnabled: true,
    });
    expect(defaults.linkedin).toEqual({
      enabled: false,
      minScoreThreshold: 70,
      soundEnabled: false,
    });

    await mockInvoke<void>("save_notification_preferences", {
      prefs: notificationPreferencesInput,
    });

    expect(
      await mockInvoke<NotificationPreferences>("get_notification_preferences"),
    ).toEqual(notificationPreferencesInput);
  });

  it("rejects commands owned by another feature", () => {
    const state = { notificationPreferences: null };

    expect(
      handleMockNotificationCommand("list_saved_searches", undefined, state),
    ).toMatchObject({ handled: false, shouldSave: false, state });
  });
});
