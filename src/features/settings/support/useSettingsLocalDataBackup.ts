/** Exports and restores local Settings backups without applying invalid country filters. */

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { invoke } from "../../../platform/tauri";
import { logError } from "../../../shared/errorReporting/logger";
import { getUserFriendlyError } from "../../../shared/errorReporting/messages";
import { parseSearchCountryOptions } from "../../../shared/searchCountry";
import {
  downloadPrivateSettingsBackup,
  selectSettingsBackupFile,
} from "./settingsBackupFile";
import type { Config } from "../config/SettingsConfig";
import {
  createSettingsLocalDataBackup,
  parseSettingsBackupImport,
  type LocalCoverLetterTemplate,
  type LocalSavedSearch,
} from "./settingsLocalDataBackup";

interface UseSettingsLocalDataBackupOptions {
  config: Config | null;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  toastError: (title: string, message: string) => void;
  toastSuccess: (title: string, message: string) => void;
}

async function isBackupSearchCountryAvailable(settings: Config): Promise<boolean> {
  const searchCountry = settings.location_preferences.search_country;
  if (searchCountry === null || searchCountry === undefined) return true;

  try {
    const options = parseSearchCountryOptions(
      await invoke<unknown>("get_search_country_options"),
    );
    return options.some(([code]) => code === searchCountry);
  } catch {
    return false;
  }
}

export function useSettingsLocalDataBackup({
  config,
  setConfig,
  toastError,
  toastSuccess,
}: UseSettingsLocalDataBackupOptions) {
  const handleExportConfig = useCallback(async () => {
    if (!config) return;

    try {
      const [coverLetterTemplates, savedSearches] = await Promise.all([
        invoke<LocalCoverLetterTemplate[]>("list_cover_letter_templates"),
        invoke<LocalSavedSearch[]>("list_saved_searches"),
      ]);
      downloadPrivateSettingsBackup(
        createSettingsLocalDataBackup(
          config,
          coverLetterTemplates,
          savedSearches,
        ),
        `jobsentinel-local-data-backup-${new Date().toISOString().split("T")[0]}.json`,
      );
      toastSuccess(
        "Private backup saved",
        "Saved connection details are left out. The file includes settings, saved searches, and cover letter templates.",
      );
    } catch (error: unknown) {
      logError("Failed to export local data backup:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    }
  }, [config, toastError, toastSuccess]);

  const handleImportConfig = useCallback(async () => {
    try {
      const result = await selectSettingsBackupFile<unknown>();
      if (result.status === "cancelled") return;

      if (result.status === "invalid") {
        toastError(
          "Could not read settings backup",
          "Choose another JobSentinel settings backup file.",
        );
        return;
      }

      const backupImport = parseSettingsBackupImport(result.backup);
      if (!backupImport) {
        toastError(
          "That is not a JobSentinel settings backup",
          "Choose a settings backup created from JobSentinel Settings.",
        );
        return;
      }

      const settings = backupImport.type === "settings"
        ? backupImport.settings
        : backupImport.backup.settings;
      if (!(await isBackupSearchCountryAvailable(settings))) {
        toastError(
          "Could not restore search country",
          "This backup's search country is not available on this device.",
        );
        return;
      }

      if (backupImport.type === "settings") {
        setConfig(backupImport.settings);
        toastSuccess(
          "Settings restored",
          "Review settings and use Save. Saved connection details are not included in backups, so add them again if needed.",
        );
        return;
      }

      const { backup } = backupImport;
      const [templateCount, searchCount] = await Promise.all([
        invoke<number>("import_cover_letter_templates", {
          templates: backup.coverLetterTemplates,
        }),
        invoke<number>("import_saved_searches", {
          searches: backup.savedSearches,
        }),
      ]);
      setConfig(backup.settings);
      toastSuccess(
        "Local data restored",
        `Review settings and use Save. Restored ${templateCount} template(s) and ${searchCount} saved search(es). Saved connection details are not included.`,
      );
    } catch (error: unknown) {
      logError("Failed to restore local data backup:", error);
      toastError(
        "Could not restore settings",
        "Choose another JobSentinel settings backup file.",
      );
    }
  }, [setConfig, toastError, toastSuccess]);

  return { handleExportConfig, handleImportConfig };
}
