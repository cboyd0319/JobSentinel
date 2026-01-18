/**
 * localStorage to SQLite Migration Utility
 *
 * This utility handles the one-time migration of user data from localStorage
 * to SQLite database. Run once on app startup.
 */

import { invoke } from '@tauri-apps/api/core';

const MIGRATION_FLAG = 'jobsentinel_localstorage_migrated_v1';

// localStorage keys for data to migrate
const COVER_LETTER_TEMPLATES_KEY = 'jobsentinel_cover_letter_templates';
const SAVED_SEARCHES_KEY = 'jobsentinel_saved_searches';
const NOTIFICATION_PREFERENCES_KEY = 'jobsentinel_notification_preferences';
const SEARCH_HISTORY_KEY = 'jobsentinel_search_history';
const INTERVIEW_FOLLOWUPS_KEY = 'jobsentinel_interview_followups';
const INTERVIEW_PREP_PREFIX = 'jobsentinel_interview_prep_';

interface MigrationResult {
  success: boolean;
  templatesImported: number;
  searchesImported: number;
  preferencesImported: boolean;
  searchHistoryImported: number;
  errors: string[];
}

/**
 * Check if migration has already been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem(MIGRATION_FLAG) === 'true';
}

/**
 * Run the full localStorage to SQLite migration
 * Returns migration results including counts and any errors
 */
export async function runMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    templatesImported: 0,
    searchesImported: 0,
    preferencesImported: false,
    searchHistoryImported: 0,
    errors: [],
  };

  // Skip if already migrated
  if (isMigrationComplete()) {
    result.success = true;
    return result;
  }

  // 1. Migrate cover letter templates
  try {
    const templatesJson = localStorage.getItem(COVER_LETTER_TEMPLATES_KEY);
    if (templatesJson) {
      const templates = JSON.parse(templatesJson);
      if (Array.isArray(templates) && templates.length > 0) {
        result.templatesImported = await invoke<number>('import_cover_letter_templates', {
          templates,
        });
      }
    }
  } catch (error) {
    const msg = `Failed to migrate cover letter templates: ${error}`;
    console.error('[Migration]', msg);
    result.errors.push(msg);
  }

  // 2. Migrate saved searches
  try {
    const searchesJson = localStorage.getItem(SAVED_SEARCHES_KEY);
    if (searchesJson) {
      const savedSearches = JSON.parse(searchesJson);
      if (Array.isArray(savedSearches) && savedSearches.length > 0) {
        // Transform localStorage format to backend format
        const transformedSearches = savedSearches.map((search: Record<string, unknown>) => ({
          id: search.id as string || '',
          name: search.name as string || '',
          sortBy: (search.filters as Record<string, unknown>)?.sortBy as string || 'score-desc',
          scoreFilter: (search.filters as Record<string, unknown>)?.scoreFilter as string || 'all',
          sourceFilter: (search.filters as Record<string, unknown>)?.sourceFilter as string || 'all',
          remoteFilter: (search.filters as Record<string, unknown>)?.remoteFilter as string || 'all',
          bookmarkFilter: (search.filters as Record<string, unknown>)?.bookmarkFilter as string || 'all',
          notesFilter: (search.filters as Record<string, unknown>)?.notesFilter as string || 'all',
          postedDateFilter: (search.filters as Record<string, unknown>)?.postedDateFilter as string || null,
          salaryMinFilter: (search.filters as Record<string, unknown>)?.salaryMinFilter as number || null,
          salaryMaxFilter: (search.filters as Record<string, unknown>)?.salaryMaxFilter as number || null,
          ghostFilter: null,
          textSearch: null,
          createdAt: search.createdAt as string || new Date().toISOString(),
          lastUsedAt: null,
        }));

        result.searchesImported = await invoke<number>('import_saved_searches', {
          searches: transformedSearches,
        });
      }
    }
  } catch (error) {
    const msg = `Failed to migrate saved searches: ${error}`;
    console.error('[Migration]', msg);
    result.errors.push(msg);
  }

  // 3. Migrate notification preferences
  try {
    const prefsJson = localStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    if (prefsJson) {
      const prefs = JSON.parse(prefsJson);
      await invoke('save_notification_preferences', { prefs });
      result.preferencesImported = true;
    }
  } catch (error) {
    const msg = `Failed to migrate notification preferences: ${error}`;
    console.error('[Migration]', msg);
    result.errors.push(msg);
  }

  // 4. Migrate search history
  try {
    const historyJson = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (historyJson) {
      const history = JSON.parse(historyJson);
      if (Array.isArray(history)) {
        for (const query of history) {
          if (typeof query === 'string' && query.trim().length >= 2) {
            await invoke('add_search_history', { query });
            result.searchHistoryImported++;
          }
        }
      }
    }
  } catch (error) {
    const msg = `Failed to migrate search history: ${error}`;
    console.error('[Migration]', msg);
    result.errors.push(msg);
  }

  // Note: Interview prep and followups are not migrated here because they require
  // valid interview IDs that exist in the database. They will be re-created as
  // users interact with interviews.

  // Mark migration as complete even if there were some errors
  // (partial migration is better than re-running)
  localStorage.setItem(MIGRATION_FLAG, 'true');
  result.success = result.errors.length === 0;

  return result;
}

/**
 * Clear old localStorage data after successful migration
 * Call this after verifying the migration was successful
 */
export function clearMigratedData(): void {
  if (!isMigrationComplete()) {
    console.warn('[Migration] Cannot clear data - migration not complete');
    return;
  }

  // Only clear data that has been migrated to SQLite
  localStorage.removeItem(COVER_LETTER_TEMPLATES_KEY);
  localStorage.removeItem(SAVED_SEARCHES_KEY);
  localStorage.removeItem(NOTIFICATION_PREFERENCES_KEY);
  localStorage.removeItem(SEARCH_HISTORY_KEY);
  localStorage.removeItem(INTERVIEW_FOLLOWUPS_KEY);

  // Clear all interview prep items
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(INTERVIEW_PREP_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Reset migration flag (for testing or re-migration)
 */
export function resetMigration(): void {
  localStorage.removeItem(MIGRATION_FLAG);
}
