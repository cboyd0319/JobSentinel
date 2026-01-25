/**
 * Advanced caching strategies for JobSentinel
 *
 * Implements:
 * - Stale-while-revalidate for critical data
 * - Cache warming on app startup
 * - Smart invalidation on mutations
 * - Per-command TTL configuration
 */

import { cachedInvoke, invalidateCacheByCommand } from "./api";

// Cache TTL configuration per command (in milliseconds)
export const CACHE_TTL = {
  // Fast-changing data - short TTL
  get_scraping_status: 5_000,       // 5 seconds
  get_recent_jobs: 10_000,          // 10 seconds

  // Medium-changing data - moderate TTL
  get_statistics: 30_000,           // 30 seconds
  get_jobs_by_source: 30_000,       // 30 seconds
  get_bookmarked_jobs: 30_000,      // 30 seconds

  // Slow-changing data - long TTL
  get_config: 60_000,               // 1 minute
  get_application_stats: 60_000,    // 1 minute
  get_salary_distribution: 300_000, // 5 minutes
  get_ghost_statistics: 60_000,     // 1 minute
  get_automation_stats: 60_000,     // 1 minute

  // Very slow-changing - very long TTL
  get_salary_benchmark: 600_000,    // 10 minutes
  get_company_research: 600_000,    // 10 minutes
} as const;

// Commands that should invalidate other caches when called
export const INVALIDATION_MAP: Record<string, string[]> = {
  // Job mutations invalidate job-related caches
  search_jobs: [
    "get_recent_jobs",
    "get_statistics",
    "get_scraping_status",
    "get_jobs_by_source",
  ],
  hide_job: ["get_recent_jobs", "get_statistics"],
  toggle_bookmark: ["get_recent_jobs", "get_bookmarked_jobs", "get_statistics"],
  save_notes: ["get_recent_jobs"],
  merge_duplicates: ["get_recent_jobs", "get_statistics"],

  // Application mutations invalidate application caches
  create_application: ["get_application_stats", "get_statistics"],
  update_application: ["get_application_stats"],
  delete_application: ["get_application_stats", "get_statistics"],

  // Config changes invalidate config-dependent caches
  update_config: [
    "get_config",
    "get_recent_jobs", // Scoring might change
    "get_statistics",
  ],
};

/**
 * Stale-while-revalidate cache strategy
 * Returns cached data immediately if available (even if stale),
 * then fetches fresh data in background and updates cache
 */
export async function staleWhileRevalidate<T>(
  cmd: string,
  args?: Record<string, unknown>,
  ttl?: number
): Promise<T> {
  const cacheTTL = ttl ?? CACHE_TTL[cmd as keyof typeof CACHE_TTL] ?? 30_000;

  // Try to get cached data (even if stale)
  const cached = await cachedInvoke<T>(cmd, args, Infinity).catch(() => null);

  // If we have cached data, return it immediately
  if (cached) {
    // Revalidate in background (don't await)
    void cachedInvoke<T>(cmd, args, 0).catch(() => {
      // Silent failure - we already have stale data
    });
    return cached;
  }

  // No cached data, fetch fresh
  return cachedInvoke<T>(cmd, args, cacheTTL);
}

/**
 * Warm the cache with critical data on app startup
 * Reduces perceived load time for users
 */
export async function warmCache(): Promise<void> {
  const warmupCommands: Array<{
    cmd: string;
    args?: Record<string, unknown>;
    ttl?: number;
  }> = [
    // Critical dashboard data
    { cmd: "get_statistics" },
    { cmd: "get_recent_jobs", args: { limit: 50 } },
    { cmd: "get_scraping_status" },

    // User config
    { cmd: "get_config" },

    // Application stats (optional, load in background)
    { cmd: "get_application_stats" },
  ];

  // Fire all requests in parallel, ignore failures
  await Promise.allSettled(
    warmupCommands.map(({ cmd, args, ttl }) =>
      cachedInvoke(
        cmd,
        args,
        ttl ?? CACHE_TTL[cmd as keyof typeof CACHE_TTL] ?? 30_000
      )
    )
  );
}

/**
 * Invalidate caches after a mutation command
 * Automatically clears dependent caches based on INVALIDATION_MAP
 */
export function invalidateAfterMutation(mutationCommand: string): void {
  const toInvalidate = INVALIDATION_MAP[mutationCommand] ?? [];

  for (const cmd of toInvalidate) {
    invalidateCacheByCommand(cmd);
  }
}

/**
 * Prefetch data that's likely to be needed soon
 * Can be called when user hovers over a tab, etc.
 */
export async function prefetchData(view: "dashboard" | "applications" | "salary"): Promise<void> {
  switch (view) {
    case "dashboard":
      await Promise.allSettled([
        cachedInvoke("get_recent_jobs", { limit: 50 }, CACHE_TTL.get_recent_jobs),
        cachedInvoke("get_statistics", undefined, CACHE_TTL.get_statistics),
        cachedInvoke("get_jobs_by_source", undefined, CACHE_TTL.get_jobs_by_source),
      ]);
      break;

    case "applications":
      await Promise.allSettled([
        cachedInvoke("get_application_stats", undefined, CACHE_TTL.get_application_stats),
        cachedInvoke("get_automation_stats", undefined, CACHE_TTL.get_automation_stats),
      ]);
      break;

    case "salary":
      await Promise.allSettled([
        cachedInvoke("get_salary_distribution", undefined, CACHE_TTL.get_salary_distribution),
      ]);
      break;
  }
}

/**
 * Smart cache key that includes relevant filter state
 * Prevents cache misses when filters change
 */
export function createFilteredCacheKey(
  baseCommand: string,
  filters: Record<string, unknown>
): string {
  // Sort and stringify filters for consistent keys
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      acc[key] = filters[key];
      return acc;
    }, {} as Record<string, unknown>);

  return `${baseCommand}:${JSON.stringify(sortedFilters)}`;
}

/**
 * Batch cache operations - fetch multiple items in parallel
 * More efficient than sequential fetches
 */
export async function batchFetch<T>(
  requests: Array<{
    cmd: string;
    args?: Record<string, unknown>;
  }>
): Promise<T[]> {
  return Promise.all(
    requests.map(({ cmd, args }) =>
      cachedInvoke<T>(
        cmd,
        args,
        CACHE_TTL[cmd as keyof typeof CACHE_TTL] ?? 30_000
      )
    )
  );
}
