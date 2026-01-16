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

// Re-export invoke for convenience
export { invoke };
