import {
  sanitizeContext,
  sanitizeTextForStorage,
} from "./errorReporter";

/**
 * Log an error in development, optionally with context.
 * Production support uses locally generated safe support reports.
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
