import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifyNewJob,
  notifyReminder,
  notifyScrapingComplete,
} from "./notifications";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

const notificationPlugin = await import("@tauri-apps/plugin-notification");
const isPermissionGranted = vi.mocked(notificationPlugin.isPermissionGranted);
const requestPermission = vi.mocked(notificationPlugin.requestPermission);
const sendNotification = vi.mocked(notificationPlugin.sendNotification);

describe("desktop notification privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPermissionGranted.mockResolvedValue(true);
    requestPermission.mockResolvedValue("granted");
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
    await notifyScrapingComplete(12, 3);

    expect(sendNotification).toHaveBeenCalledWith({
      title: "JobSentinel update",
      body: "New matches are ready to review. 3 need attention.",
    });

    const payload = JSON.stringify(sendNotification.mock.calls[0]?.[0]);
    expect(payload).not.toContain("Private Role");
    expect(payload).not.toContain("Sensitive Employer");
  });
});
