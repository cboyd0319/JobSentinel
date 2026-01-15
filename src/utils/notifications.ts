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
} from "@tauri-apps/plugin-notification";

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
  title: string,
  company: string,
  score: number
): Promise<void> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    sendNotification({
      title: "New High-Match Job Found!",
      body: `${title} at ${company} - ${Math.round(score * 100)}% match`,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

/**
 * Send a desktop notification for application reminder.
 */
export async function notifyReminder(
  jobTitle: string,
  company: string,
  message: string
): Promise<void> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    sendNotification({
      title: `Reminder: ${jobTitle} at ${company}`,
      body: message,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

/**
 * Send a desktop notification for a scraping cycle completion.
 */
export async function notifyScrapingComplete(
  newJobs: number,
  highMatches: number
): Promise<void> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  // Only notify if there are new high matches
  if (highMatches === 0) return;

  try {
    sendNotification({
      title: "Job Search Complete",
      body: `Found ${newJobs} new jobs, ${highMatches} high matches!`,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

/**
 * Send a generic desktop notification.
 */
export async function notify(title: string, body: string): Promise<void> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    sendNotification({ title, body });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
