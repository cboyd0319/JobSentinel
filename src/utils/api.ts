/**
 * API utilities for request deduplication and caching.
 * Prevents duplicate concurrent calls to the same Tauri command.
 */

import { invoke } from "@tauri-apps/api/core";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
}

// In-flight request tracking (prevents duplicate concurrent calls)
const inFlightRequests = new Map<string, InFlightRequest<unknown>>();

// Response cache with TTL
const responseCache = new Map<string, CacheEntry<unknown>>();

// Default cache TTL: 30 seconds
const DEFAULT_CACHE_TTL = 30_000;

/**
 * Generate a cache key from command name and arguments
 */
function getCacheKey(cmd: string, args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) {
    return cmd;
  }
  // Sort keys for consistent hashing
  const sortedArgs = Object.keys(args)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = args[key];
        return acc;
      },
      {} as Record<string, unknown>
    );
  return `${cmd}:${JSON.stringify(sortedArgs)}`;
}

/**
 * Deduplicated invoke - prevents duplicate concurrent calls.
 * If a request with the same command/args is already in flight,
 * returns the same promise instead of making a new request.
 */
export async function deduplicatedInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const key = getCacheKey(cmd, args);

  // Check if request is already in flight
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight.promise as Promise<T>;
  }

  // Create new request
  const promise = invoke<T>(cmd, args).finally(() => {
    // Remove from in-flight tracking when complete
    inFlightRequests.delete(key);
  });

  // Track the in-flight request
  inFlightRequests.set(key, { promise });

  return promise;
}

/**
 * Cached invoke - caches responses for a specified TTL.
 * Also deduplicates concurrent requests.
 *
 * @param cmd - Tauri command name
 * @param args - Command arguments
 * @param ttl - Cache TTL in milliseconds (default: 30 seconds)
 */
export async function cachedInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  const key = getCacheKey(cmd, args);

  // Check cache first
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }

  // Use deduplicated invoke
  const result = await deduplicatedInvoke<T>(cmd, args);

  // Cache the result
  responseCache.set(key, {
    data: result,
    timestamp: Date.now(),
  });

  return result;
}

/**
 * Invalidate cache for a specific command/args combination
 */
export function invalidateCache(cmd: string, args?: Record<string, unknown>): void {
  const key = getCacheKey(cmd, args);
  responseCache.delete(key);
}

/**
 * Invalidate all cached responses for a command (regardless of args)
 */
export function invalidateCacheByCommand(cmd: string): void {
  for (const key of responseCache.keys()) {
    if (key === cmd || key.startsWith(`${cmd}:`)) {
      responseCache.delete(key);
    }
  }
}

/**
 * Clear all cached responses
 */
export function clearCache(): void {
  responseCache.clear();
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats(): {
  cacheSize: number;
  inFlightCount: number;
  entries: Array<{ key: string; age: number }>;
} {
  const now = Date.now();
  const entries = Array.from(responseCache.entries()).map(([key, entry]) => ({
    key,
    age: now - entry.timestamp,
  }));

  return {
    cacheSize: responseCache.size,
    inFlightCount: inFlightRequests.size,
    entries,
  };
}

/**
 * Type-safe error handler for Tauri invoke calls.
 * Extracts user-friendly error messages and handles logging.
 */
export interface InvokeError {
  message: string;
  technical?: string;
  userFriendly?: {
    title: string;
    message: string;
    action?: string;
  };
}

/**
 * Safe invoke wrapper with consistent error handling.
 * Automatically logs errors and returns typed results with error info.
 *
 * @param cmd - Tauri command name
 * @param args - Command arguments
 * @param options - Error handling options
 * @returns Promise with data or throws with enhanced error
 *
 * @example
 * ```typescript
 * const jobs = await safeInvoke<Job[]>("get_jobs", { limit: 10 });
 * ```
 */
export async function safeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  options?: {
    logContext?: string;
    silent?: boolean; // Don't log errors (for expected failures)
  }
): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    // Import utilities here to avoid circular dependencies
    const { logError: log } = await import("./errorUtils");
    const { getUserFriendlyError } = await import("./errorMessages");

    const context = options?.logContext || `invoke(${cmd})`;

    // Log error unless silent mode
    if (!options?.silent) {
      log(context, error);
    }

    // Create enhanced error with user-friendly message
    const friendlyError = getUserFriendlyError(error);
    const enhancedError = Object.assign(
      error instanceof Error ? error : new Error(String(error)),
      {
        userFriendly: friendlyError,
        invokeCommand: cmd,
        invokeArgs: args,
      }
    );

    throw enhancedError;
  }
}

/**
 * Safe invoke with automatic toast error notification.
 * Best for user-initiated actions where errors should be shown.
 *
 * @param cmd - Tauri command name
 * @param args - Command arguments
 * @param toast - Toast context from useToast()
 * @param options - Error handling options
 * @returns Promise with data or throws
 *
 * @example
 * ```typescript
 * const toast = useToast();
 * try {
 *   await safeInvokeWithToast("delete_job", { id: 123 }, toast, {
 *     successMessage: "Job deleted successfully"
 *   });
 * } catch (error) {
 *   // Error already shown to user via toast
 * }
 * ```
 */
export async function safeInvokeWithToast<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  toast: { error: (title: string, message?: string) => void },
  options?: {
    logContext?: string;
    silent?: boolean;
    errorTitle?: string; // Custom error title
    showTechnical?: boolean; // Show technical details in dev mode
  }
): Promise<T> {
  try {
    const result = await safeInvoke<T>(cmd, args, options);
    return result;
  } catch (error) {
    // Extract user-friendly error
    const enhancedError = error as Error & {
      userFriendly?: { title: string; message: string; action?: string };
    };

    const title = options?.errorTitle || enhancedError.userFriendly?.title || "Operation Failed";
    const message = enhancedError.userFriendly?.message;
    const action = enhancedError.userFriendly?.action;

    // Show technical details in dev mode if requested
    const fullMessage = options?.showTechnical && import.meta.env.DEV && enhancedError.message
      ? `${message || "An error occurred"}\n\nTechnical: ${enhancedError.message}`
      : action
        ? `${message}\n\n${action}`
        : message;

    toast.error(title, fullMessage);
    throw error;
  }
}

// Re-export invoke for convenience
export { invoke };
