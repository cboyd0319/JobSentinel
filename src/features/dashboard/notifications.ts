/**
 * Desktop Notification Utilities
 *
 * Provides a clean API for desktop notifications using Tauri's notification plugin.
 * Falls back gracefully if notifications are not available.
 */

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "../../platform/tauri/notifications";
import { logError } from "../../shared/errorReporting/logger";
import {
  loadNotificationPreferencesAsync,
  shouldNotifyForJob,
} from "../../shared/notificationPreferences";
import type { Job } from "./types";

/**
 * Check if notification permissions are granted.
 * Returns true if notifications can be sent.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    return permissionGranted;
  } catch {
    // Notifications not available (e.g., in development)
    return false;
  }
}

/**
 * Request notification permission from the user.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await requestPermission();
    return permission === "granted";
  } catch {
    return false;
  }
}

/**
 * Send a desktop notification for a new high-match job.
 */
export async function notifyNewJob(
  _title: string,
  _company: string,
  _score: number
): Promise<void> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    sendNotification({
      title: "JobSentinel update",
      body: "A strong job match is ready to review in JobSentinel.",
    });
  } catch (error: unknown) {
    logError("Failed to send notification:", error);
  }
}

/**
 * Send a desktop notification for application reminder.
 */
export async function notifyReminder(
  _jobTitle: string,
  _company: string,
  _message: string
): Promise<void> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    sendNotification({
      title: "JobSentinel reminder",
      body: "Open JobSentinel to review your saved reminder.",
    });
  } catch (error: unknown) {
    logError("Failed to send notification:", error);
  }
}

/**
 * Select jobs that are new or have a higher score than the prior snapshot.
 */
export function selectNotificationCandidates(
  previousJobs: readonly Job[],
  currentJobs: readonly Job[],
): Job[] {
  const previousScores = new Map(
    previousJobs.map((job) => [job.id, job.score ?? 0]),
  );

  return currentJobs.filter((job) => {
    if (!previousScores.has(job.id)) return true;
    return (job.score ?? 0) > (previousScores.get(job.id) ?? 0);
  });
}

/**
 * Send a count-only desktop notification for jobs allowed by saved alert rules.
 */
export async function notifyScrapingComplete(
  jobs: readonly Job[],
): Promise<void> {
  let matchingJobs: Job[];
  try {
    const preferences = await loadNotificationPreferencesAsync();
    matchingJobs = jobs.filter(
      (job) =>
        job.score !== null &&
        shouldNotifyForJob(job.source, job.score, preferences, job),
    );
  } catch (error: unknown) {
    logError("Failed to load notification preferences:", error);
    return;
  }

  if (matchingJobs.length === 0) return;

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    sendNotification({
      title: "JobSentinel update",
      body: `New matches are ready to review. ${matchingJobs.length} need attention.`,
    });
  } catch (error: unknown) {
    logError("Failed to send notification:", error);
  }
}
