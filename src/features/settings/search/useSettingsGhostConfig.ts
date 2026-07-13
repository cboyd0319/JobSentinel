import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../../../utils/errorUtils";
import { getUserFriendlyError } from "../../../utils/errorMessages";
import type {
  GhostConfig,
  GhostPresetSelection,
} from "../config/SettingsConfig";

type ToastMessage = (title: string, message: string) => void;

interface UseSettingsGhostConfigOptions {
  toastError: ToastMessage;
  toastSuccess: ToastMessage;
  toastWarning: ToastMessage;
}

const DEFAULT_GHOST_CONFIG: GhostConfig = {
  stale_threshold_days: 60,
  repost_threshold: 3,
  min_description_length: 200,
  penalize_missing_salary: false,
  warning_threshold: 0.3,
  hide_threshold: 0.7,
};

export function useSettingsGhostConfig({
  toastError,
  toastSuccess,
  toastWarning,
}: UseSettingsGhostConfigOptions) {
  const [ghostConfig, setGhostConfig] = useState<GhostConfig | null>(null);
  const [ghostConfigLoading, setGhostConfigLoading] = useState(false);
  const [ghostPreset, setGhostPreset] =
    useState<GhostPresetSelection>("balanced");

  const loadGhostConfig = useCallback(async () => {
    try {
      setGhostConfigLoading(true);
      setGhostConfig(await invoke<GhostConfig>("get_ghost_config"));
    } catch (error) {
      logError("Failed to load ghost config:", error);
      setGhostConfig(DEFAULT_GHOST_CONFIG);
      toastWarning(
        "Posting risk defaults loaded",
        "Couldn't load your saved posting-risk settings. Using defaults.",
      );
    } finally {
      setGhostConfigLoading(false);
    }
  }, [toastWarning]);

  useEffect(() => {
    void loadGhostConfig();
  }, [loadGhostConfig]);

  const handleSaveGhostConfig = useCallback(async () => {
    if (!ghostConfig) return;

    try {
      setGhostConfigLoading(true);
      await invoke("set_ghost_config", { config: ghostConfig });
      toastSuccess(
        "Posting risk settings saved",
        "New job checks use these warnings.",
      );
    } catch (error) {
      logError("Failed to save ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    } finally {
      setGhostConfigLoading(false);
    }
  }, [ghostConfig, toastError, toastSuccess]);

  const handleResetGhostConfig = useCallback(async () => {
    try {
      setGhostConfigLoading(true);
      await invoke("reset_ghost_config");
      await loadGhostConfig();
      toastSuccess(
        "Posting risk defaults restored",
        "Balanced warnings are back on.",
      );
    } catch (error) {
      logError("Failed to reset ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    }
  }, [loadGhostConfig, toastError, toastSuccess]);

  return {
    ghostConfig,
    ghostConfigLoading,
    ghostPreset,
    handleResetGhostConfig,
    handleSaveGhostConfig,
    setGhostConfig,
    setGhostPreset,
  };
}
