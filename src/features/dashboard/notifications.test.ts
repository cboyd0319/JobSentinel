import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifyNewJob,
  notifyReminder,
  notifyScrapingComplete,
  selectNotificationCandidates,
} from "./notifications";
import {
  DEFAULT_PREFERENCES,
  loadNotificationPreferencesAsync,
} from "../../shared/notificationPreferences";
import type { Job } from "./types";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("../../shared/notificationPreferences", async () => {
  const actual = await vi.importActual<
    typeof import("../../shared/notificationPreferences")
  >("../../shared/notificationPreferences");
  return {
    ...actual,
    loadNotificationPreferencesAsync: vi.fn(),
  };
});

const notificationPlugin = await import("@tauri-apps/plugin-notification");
const isPermissionGranted = vi.mocked(notificationPlugin.isPermissionGranted);
const requestPermission = vi.mocked(notificationPlugin.requestPermission);
const sendNotification = vi.mocked(notificationPlugin.sendNotification);
const loadPreferences = vi.mocked(loadNotificationPreferencesAsync);
const job: Job = {
  id: 1,
  title: "Private Role",
  company: "Sensitive Employer",
  location: "Remote",
  url: "https://example.com/jobs/1",
  source: "indeed",
  score: 0.9,
  created_at: "2026-07-17T12:00:00Z",
  remote: true,
};

describe("desktop notification privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPermissionGranted.mockResolvedValue(true);
    requestPermission.mockResolvedValue("granted");
    loadPreferences.mockResolvedValue(DEFAULT_PREFERENCES);
  });

  it("does not expose job title, company, or score in new-job notifications", async () => {
    await notifyNewJob("Private Role", "Sensitive Employer", 0.97);

    expect(sendNotification).toHaveBeenCalledWith({
      title: "JobSentinel update",
      body: "A strong job match is ready to review in JobSentinel.",
    });

    const payload = JSON.stringify(sendNotification.mock.calls[0]?.[0]);
    expect(payload).not.toContain("Private Role");
    expect(payload).not.toContain("Sensitive Employer");
    expect(payload).not.toContain("97");
  });

  it("does not expose job title, company, or reminder text in reminder notifications", async () => {
    await notifyReminder(
      "Confidential Analyst",
      "Quiet Search Inc.",
      "Ask Jordan about salary floor after interview",
    );

    expect(sendNotification).toHaveBeenCalledWith({
      title: "JobSentinel reminder",
      body: "Open JobSentinel to review your saved reminder.",
    });

    const payload = JSON.stringify(sendNotification.mock.calls[0]?.[0]);
    expect(payload).not.toContain("Confidential Analyst");
    expect(payload).not.toContain("Quiet Search Inc.");
    expect(payload).not.toContain("salary floor");
  });

  it("keeps search-complete notifications count-only", async () => {
    await notifyScrapingComplete([job]);

    expect(loadPreferences).toHaveBeenCalledOnce();
    expect(sendNotification).toHaveBeenCalledWith({
      title: "JobSentinel update",
      body: "New matches are ready to review. 1 need attention.",
    });

    const payload = JSON.stringify(sendNotification.mock.calls[0]?.[0]);
    expect(payload).not.toContain("Private Role");
    expect(payload).not.toContain("Sensitive Employer");
  });

  it("does not request permission or notify when saved alerts are off", async () => {
    loadPreferences.mockResolvedValue({
      ...DEFAULT_PREFERENCES,
      global: {
        ...DEFAULT_PREFERENCES.global,
        enabled: false,
      },
    });

    await notifyScrapingComplete([job]);

    expect(isPermissionGranted).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does not repeat unchanged jobs", () => {
    expect(selectNotificationCandidates([job], [job])).toEqual([]);
    expect(
      selectNotificationCandidates(
        [{ ...job, score: 0.7 }],
        [{ ...job, score: 0.9 }],
      ),
    ).toEqual([job]);
  });
});
