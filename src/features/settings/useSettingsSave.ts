import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { invalidateCacheByCommand } from "../../utils/api";
import { logError } from "../../shared/errorReporting/logger";
import {
  getCredentialValidationError,
  storeCredential,
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
  type Credentials,
} from "./config/SettingsConfig";
import type { CredentialSaveEntry } from "./credentials/useSettingsCredentials";

type ToastMessage = (title: string, message: string) => void;

interface UseSettingsSaveOptions {
  config: Config | null;
  credentials: Credentials;
  credentialStatus: CredentialStatusMap;
  getCredentialSaveEntries: () => CredentialSaveEntry[];
  markCredentialsSaved: (keys: CredentialKey[]) => void;
  onClose: () => void;
  toastError: ToastMessage;
  toastSuccess: ToastMessage;
  toastWarning: ToastMessage;
}

export function useSettingsSave({
  config,
  credentials,
  credentialStatus,
  getCredentialSaveEntries,
  markCredentialsSaved,
  onClose,
  toastError,
  toastSuccess,
  toastWarning,
}: UseSettingsSaveOptions) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!config) return;

    const credentialValidationError = getCredentialValidationError(
      credentials,
      config,
      credentialStatus,
    );
    if (credentialValidationError) {
      toastError(
        credentialValidationError.title,
        credentialValidationError.message,
      );
      return;
    }

    try {
      setSaving(true);
      await invoke("save_config", { config });
      invalidateCacheByCommand("get_config");
      invalidateCacheByCommand("get_dashboard_preferences");

      const credentialEntries = getCredentialSaveEntries();
      const credentialResults: PromiseSettledResult<void>[] = [];
      for (const { key, value } of credentialEntries) {
        try {
          await storeCredential(key, value);
          credentialResults.push({ status: "fulfilled", value: undefined });
        } catch (reason) {
          credentialResults.push({ status: "rejected", reason });
        }
      }

      const successfulCredentialKeys = credentialResults.flatMap(
        (result, index) => {
          const entry = credentialEntries[index];
          return result.status === "fulfilled" && entry ? [entry.key] : [];
        },
      );
      markCredentialsSaved(successfulCredentialKeys);

      const credentialFailures = credentialResults.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (credentialFailures.length > 0) {
        logError(
          "Credential save failures:",
          credentialFailures.map((failure) => failure.reason),
        );
        toastWarning(
          "Some connection details were not saved",
          `${credentialFailures.length} saved connection detail(s) were not saved. Settings were saved. Try saving again.`,
        );
        return;
      }

      toastSuccess(
        "Settings saved",
        successfulCredentialKeys.length > 0
          ? "Connection details are stored in your system password manager."
          : "Your job-search preferences were saved.",
      );
      onClose();
    } catch (error) {
      logError("Settings config save failed:", error);
      toastError(
        "Could not save settings",
        "Settings could not be saved. Try saving again.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    config,
    credentialStatus,
    credentials,
    getCredentialSaveEntries,
    markCredentialsSaved,
    onClose,
    toastError,
    toastSuccess,
    toastWarning,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (!saving && config) void handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config, handleSave, saving]);

  return { handleSave, saving };
}
