/** Owns native privacy control calls and their bounded status contract. */

import { invoke as nativeInvoke } from "@tauri-apps/api/core";

type AppPrivacyCommand = "get_app_privacy_status" | "set_shared_computer_mode" |
  "lock_app" | "unlock_app" | "clear_private_session";

// Privacy control replies remain usable when their operation advances the private session.
export function invokeAppPrivacy<T>(...args: [AppPrivacyCommand, args?: Record<string, unknown>]): Promise<T> {
  return nativeInvoke<T>(...args);
}

export const SESSION_CLEANUP_FAILED_EVENT = "jobsentinel-session-cleanup-failed";

export interface AppPrivacyStatus {
  enabled: boolean;
  locked: boolean;
  unlock_method: "system" | "passphrase" | "unavailable";
}

export function parseAppPrivacyStatus(value: unknown): AppPrivacyStatus {
  if (value && typeof value === "object" &&
    "enabled" in value && typeof value.enabled === "boolean" &&
    "locked" in value && typeof value.locked === "boolean" &&
    "unlock_method" in value &&
    (value.unlock_method === "system" || value.unlock_method === "passphrase" ||
      value.unlock_method === "unavailable")) {
    return { enabled: value.enabled, locked: value.locked, unlock_method: value.unlock_method };
  }
  throw new Error("Application privacy status is unavailable.");
}
