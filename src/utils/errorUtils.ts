import { sanitizeContext, sanitizeTextForStorage } from "./errorReporting";
import { getUserFriendlyError } from "./errorMessages";

/**
 * Extract a user-friendly error message from an unknown error.
 *
 * This helper is display-safe. It must not return raw exception text because
 * caught errors can include paths, tokens, emails, provider responses, or local
 * job-search details.
 *
 * @param error - The caught error (unknown type from catch block)
 * @returns A string message suitable for displaying to users
 */
export function getErrorMessage(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action
    ? `${friendly.message}\n\n${friendly.action}`
    : friendly.message;
}

/**
 * Log an error in development, optionally with context.
 * Production support uses locally generated safe debug reports.
 * 
 * @param message - Context message describing where the error occurred
 * @param error - The error to log
 */
export function logError(message: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(sanitizeTextForStorage(message), sanitizeLoggedError(error));
  }
}

interface SanitizedLoggedError {
  name: string;
  message: string;
  stack?: string;
}

function sanitizeLoggedError(error: unknown): SanitizedLoggedError | unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeTextForStorage(error.message),
      stack: error.stack ? sanitizeTextForStorage(error.stack) : undefined,
    };
  }

  if (typeof error === "string") {
    return sanitizeTextForStorage(error);
  }

  if (error && typeof error === "object") {
    return sanitizeContext({ error })?.error ?? "[UNAVAILABLE]";
  }

  return error;
}
