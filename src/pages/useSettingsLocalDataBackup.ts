import { useCallback, type Dispatch, type SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../utils/errorUtils";
import { getUserFriendlyError } from "../utils/errorMessages";
import { exportConfigToJSON, importConfigFromJSON } from "../utils/export";
import type { Config } from "./SettingsConfig";
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
      exportConfigToJSON(
        createSettingsLocalDataBackup(config, coverLetterTemplates, savedSearches),
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
      const result = await importConfigFromJSON<unknown>();
      if (result.status === "cancelled") return;

      if (result.status === "invalid") {
        toastError(
          "Could not read settings backup",
          "Choose another JobSentinel settings backup file.",
        );
        return;
      }

      const backupImport = parseSettingsBackupImport(result.config);
      if (!backupImport) {
        toastError(
          "That is not a JobSentinel settings backup",
          "Choose a settings backup created from JobSentinel Settings.",
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
        invoke<number>("import_saved_searches", { searches: backup.savedSearches }),
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
