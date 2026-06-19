import { isSettingsBackupConfig, type Config } from "./SettingsConfig";

export const LOCAL_DATA_BACKUP_KIND = "jobsentinel-local-data-backup";
export const LOCAL_DATA_BACKUP_SCHEMA_VERSION = 1;

export interface LocalCoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSavedSearch {
  id: string;
  name: string;
  sortBy: string;
  scoreFilter: string;
  sourceFilter: string;
  remoteFilter: string;
  bookmarkFilter: string;
  notesFilter: string;
  postedDateFilter: string | null;
  salaryMinFilter: number | null;
  salaryMaxFilter: number | null;
  ghostFilter: string | null;
  textSearch: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface SettingsLocalDataBackup {
  kind: typeof LOCAL_DATA_BACKUP_KIND;
  schemaVersion: typeof LOCAL_DATA_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  settings: Config;
  coverLetterTemplates: LocalCoverLetterTemplate[];
  savedSearches: LocalSavedSearch[];
}

export type SettingsBackupImport =
  | { type: "settings"; settings: Config }
  | { type: "localData"; backup: SettingsLocalDataBackup };

export function createSettingsLocalDataBackup(
  settings: Config,
  coverLetterTemplates: LocalCoverLetterTemplate[],
  savedSearches: LocalSavedSearch[],
  exportedAt = new Date().toISOString(),
): SettingsLocalDataBackup {
  return {
    kind: LOCAL_DATA_BACKUP_KIND,
    schemaVersion: LOCAL_DATA_BACKUP_SCHEMA_VERSION,
    exportedAt,
    settings,
    coverLetterTemplates,
    savedSearches,
  };
}

export function parseSettingsBackupImport(value: unknown): SettingsBackupImport | null {
  if (isSettingsLocalDataBackup(value)) {
    return { type: "localData", backup: value };
  }

  if (isSettingsBackupConfig(value)) {
    return { type: "settings", settings: value };
  }

  return null;
}

export function isSettingsLocalDataBackup(
  value: unknown,
): value is SettingsLocalDataBackup {
  if (!isPlainRecord(value)) return false;

  return (
    value.kind === LOCAL_DATA_BACKUP_KIND &&
    value.schemaVersion === LOCAL_DATA_BACKUP_SCHEMA_VERSION &&
    typeof value.exportedAt === "string" &&
    isSettingsBackupConfig(value.settings) &&
    Array.isArray(value.coverLetterTemplates) &&
    value.coverLetterTemplates.every(isLocalCoverLetterTemplate) &&
    Array.isArray(value.savedSearches) &&
    value.savedSearches.every(isLocalSavedSearch)
  );
}

function isLocalCoverLetterTemplate(value: unknown): value is LocalCoverLetterTemplate {
  if (!isPlainRecord(value)) return false;

  return (
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "content") &&
    hasString(value, "category") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isLocalSavedSearch(value: unknown): value is LocalSavedSearch {
  if (!isPlainRecord(value)) return false;

  return (
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "sortBy") &&
    hasString(value, "scoreFilter") &&
    hasString(value, "sourceFilter") &&
    hasString(value, "remoteFilter") &&
    hasString(value, "bookmarkFilter") &&
    hasString(value, "notesFilter") &&
    hasNullableString(value, "postedDateFilter") &&
    hasNullableNumber(value, "salaryMinFilter") &&
    hasNullableNumber(value, "salaryMaxFilter") &&
    hasNullableString(value, "ghostFilter") &&
    hasNullableString(value, "textSearch") &&
    hasString(value, "createdAt") &&
    hasNullableString(value, "lastUsedAt")
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function hasString(record: Record<string, unknown>, field: string): boolean {
  return typeof record[field] === "string";
}

function hasNullableString(record: Record<string, unknown>, field: string): boolean {
  return record[field] === null || typeof record[field] === "string";
}

function hasNullableNumber(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  return value === null || (typeof value === "number" && Number.isSafeInteger(value));
}
