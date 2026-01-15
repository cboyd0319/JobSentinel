/**
 * Extract a user-friendly error message from an unknown error.
 * 
 * @param error - The caught error (unknown type from catch block)
 * @returns A string message suitable for displaying to users
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}

/**
 * Log an error in development, optionally with context.
 * In production, this could be extended to send to an error tracking service.
 * 
 * @param message - Context message describing where the error occurred
 * @param error - The error to log
 */
export function logError(message: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
  // In production, you could send to Sentry, LogRocket, etc.
}
