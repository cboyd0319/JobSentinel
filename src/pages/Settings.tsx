import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { HelpIcon } from "../components/HelpIcon";
import { ScraperHealthDashboard } from "../components/ScraperHealthDashboard";
import { FeedbackModal } from "../components/feedback/FeedbackModal";
import { CloseIcon, SettingsIcon } from "./SettingsIcons";
import { copySanitizedDebugReport, saveSanitizedDebugReport } from "../services/feedbackService";
import { BookmarkletGenerator } from "../components/BookmarkletGenerator";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { getUserFriendlyError } from "../utils/errorMessages";
import { exportConfigToJSON, importConfigFromJSON } from "../utils/export";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type LocationInfo,
} from "../utils/locationDetection";
import {
  buildJobsWithGptPayload,
  getCredentialValidationError,
  hasCredential,
  isCurrentJobsWithGptPayloadApproved,
  isSettingsBackupConfig,
  storeCredential,
  type Config,
  type CredentialKey,
  type Credentials,
  type GhostConfig,
  type GhostPresetSelection,
  type SettingsProps,
  type SourceRequestSummary,
} from "./SettingsConfig";
import { useJobBoardRecommendations } from "./SettingsJobBoardRecommendations";
import { SettingsJobSourcesSection } from "./SettingsJobSourcesSection";
import { SettingsPostingRiskSection } from "./SettingsPostingRiskSection";
import { SettingsResumeMatchingSection } from "./SettingsResumeMatchingSection";
import { SettingsNotificationsSection } from "./SettingsNotificationsSection";
import { SettingsSearchPreferencesSection } from "./SettingsSearchPreferencesSection";
import {
  SettingsBackupSection,
  SettingsHelpStatusSection,
  SettingsSupportSection,
} from "./SettingsSupportSections";

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({
    slack_webhook: "",
    smtp_password: "",
    discord_webhook: "",
    teams_webhook: "",
    telegram_bot_token: "",
    usajobs_api_key: "",
  });
  const [credentialStatus, setCredentialStatus] = useState<
    Record<CredentialKey, boolean>
  >({
    slack_webhook: false,
    smtp_password: false,
    discord_webhook: false,
    teams_webhook: false,
    telegram_bot_token: false,
    usajobs_api_key: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [blockedTitleInput, setBlockedTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [excludeKeywordInput, setExcludeKeywordInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [whitelistCompanyInput, setWhitelistCompanyInput] = useState("");
  const [blacklistCompanyInput, setBlacklistCompanyInput] = useState("");
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [copyingDebugReport, setCopyingDebugReport] = useState(false);
  const [savingDebugReport, setSavingDebugReport] = useState(false);
  const [ghostConfig, setGhostConfig] = useState<GhostConfig | null>(null);
  const [ghostConfigLoading, setGhostConfigLoading] = useState(false);
  const [jobsWithGptLastRequest, setJobsWithGptLastRequest] =
    useState<SourceRequestSummary | null>(null);
  const [showJobsWithGptEndpoint, setShowJobsWithGptEndpoint] = useState(false);
  const [ghostPreset, setGhostPreset] = useState<GhostPresetSelection>("balanced");
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");
  const toast = useToast();

  const handleCopyDebugReport = useCallback(async () => {
    setCopyingDebugReport(true);

    try {
      await copySanitizedDebugReport();
      toast.success(
        "Safe support report copied",
        "Share it only if you want help. JobSentinel hides common private details; review it before sharing."
      );
    } catch (error) {
      logError("Could not copy support report:", error);
      toast.error(
        "Could not copy safe support report",
        "Try saving the report instead."
      );
    } finally {
      setCopyingDebugReport(false);
    }
  }, [toast]);

  const handleSaveDebugReport = useCallback(async () => {
    setSavingDebugReport(true);

    try {
      const savedFile = await saveSanitizedDebugReport();
      if (savedFile) {
        toast.success(
          "Support report saved for review",
          `Review ${savedFile.fileName} before sharing it. Share it only if you want help.`
        );
      } else {
        toast.info("Safe support report not saved", "No file was created.");
      }
    } catch (error) {
      logError("Failed to save support report:", error);
      toast.error(
        "Could not save safe support report",
        "Try Copy Safe Support Report instead."
      );
    } finally {
      setSavingDebugReport(false);
    }
  }, [toast]);

  // Location detection state
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation(),
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);


  const jobBoardRecommendations = useJobBoardRecommendations(config, setConfig);

  const jobsWithGptPayload = useMemo(
    () => (config ? buildJobsWithGptPayload(config) : null),
    [config],
  );
  const jobsWithGptPayloadApproved = useMemo(
    () =>
      config
        ? isCurrentJobsWithGptPayloadApproved(config, jobsWithGptPayload)
        : false,
    [config, jobsWithGptPayload],
  );
  const approveJobsWithGptPayload = useCallback(() => {
    if (!config || !jobsWithGptPayload) return;

    setConfig({
      ...config,
      jobswithgpt_approval: {
        enabled: true,
        payload: jobsWithGptPayload,
        approved_at: new Date().toISOString(),
      },
    });
  }, [config, jobsWithGptPayload]);

  const clearJobsWithGptApproval = useCallback(() => {
    if (!config) return;

    setConfig({
      ...config,
      jobswithgpt_approval: {
        enabled: false,
        payload: null,
        approved_at: null,
      },
    });
  }, [config]);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);

      // Load config (non-sensitive settings)
      const configData = await invoke<Config>("get_config");
      setConfig({
        ...configData,
        jobswithgpt_endpoint: configData.jobswithgpt_endpoint ?? "",
        jobswithgpt_approval: configData.jobswithgpt_approval ?? {
          enabled: false,
          payload: null,
          approved_at: null,
        },
        linkedin: {
          ...configData.linkedin,
          enabled: false,
        },
      });

      try {
        const lastRequest = await invoke<SourceRequestSummary | null>(
          "get_latest_source_request",
          { source: "jobswithgpt" },
        );
        setJobsWithGptLastRequest(lastRequest);
      } catch (error) {
        logError("Could not load source request history:", error);
        setJobsWithGptLastRequest(null);
      }

      // Check which credentials exist in secure storage (don't load actual values)
      // Use allSettled so a single keyring failure doesn't block the entire Settings page
      const credentialKeys: CredentialKey[] = [
        "slack_webhook",
        "smtp_password",
        "discord_webhook",
        "teams_webhook",
        "telegram_bot_token",
        "usajobs_api_key",
      ];
      const credResults = await Promise.allSettled(
        credentialKeys.map((key) => hasCredential(key)),
      );

      const newStatus = {} as Record<CredentialKey, boolean>;
      let credFailures = 0;
      credentialKeys.forEach((key, i) => {
        const result = credResults[i];
        if (result?.status === "fulfilled") {
          newStatus[key] = result.value;
        } else {
          newStatus[key] = false;
          credFailures++;
        }
      });
      setCredentialStatus(newStatus);

      if (credFailures > 0) {
        toast.warning(
          "Some saved connection details unavailable",
          `Couldn't check ${credFailures} saved connection detail(s). Unlock your system password manager if needed.`,
        );
      }

    } catch (error: unknown) {
      logError("Failed to load config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadGhostConfig = useCallback(async () => {
    try {
      setGhostConfigLoading(true);
      const config = await invoke<GhostConfig>("get_ghost_config");
      setGhostConfig(config);
    } catch (error: unknown) {
      logError("Failed to load ghost config:", error);
      // Use default values if loading fails, but tell the user
      setGhostConfig({
        stale_threshold_days: 60,
        repost_threshold: 3,
        min_description_length: 200,
        penalize_missing_salary: false,
        warning_threshold: 0.3,
        hide_threshold: 0.7,
      });
      toast.warning(
        "Posting risk defaults loaded",
        "Couldn't load your saved posting-risk settings. Using defaults.",
      );
    } finally {
      setGhostConfigLoading(false);
    }
  }, [toast]);

  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    try {
      const location = await invoke<LocationInfo>("detect_location");
      setDetectedLocation(location);
      cacheDetectedLocation(location);
    } catch {
      toast.warning("Location unavailable", "Enter a city manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  const handleUseDetectedLocation = useCallback(() => {
    if (!config || !detectedLocation) return;

    const locationStr = `${detectedLocation.city}, ${detectedLocation.region}`;
    if (config.location_preferences.cities.includes(locationStr)) return;

    setConfig({
      ...config,
      location_preferences: {
        ...config.location_preferences,
        cities: [...config.location_preferences.cities, locationStr],
      },
    });
    toast.success("Location added", `Added ${locationStr}`);
  }, [config, detectedLocation, toast]);

  useEffect(() => {
    loadConfig();
    loadGhostConfig();
  }, [loadConfig, loadGhostConfig]);

  const handleSave = useCallback(async () => {
    if (!config) return;

    const credentialValidationError = getCredentialValidationError(
      credentials,
      config,
      credentialStatus,
    );
    if (credentialValidationError) {
      toast.error(
        credentialValidationError.title,
        credentialValidationError.message,
      );
      return;
    }

    try {
      setSaving(true);

      // Save credentials to secure storage (only if user entered new values)
      const credentialSaves: Promise<void>[] = [];

      if (credentials.slack_webhook) {
        credentialSaves.push(
          storeCredential("slack_webhook", credentials.slack_webhook),
        );
      }
      if (credentials.smtp_password) {
        credentialSaves.push(
          storeCredential("smtp_password", credentials.smtp_password),
        );
      }
      if (credentials.discord_webhook) {
        credentialSaves.push(
          storeCredential("discord_webhook", credentials.discord_webhook),
        );
      }
      if (credentials.teams_webhook) {
        credentialSaves.push(
          storeCredential("teams_webhook", credentials.teams_webhook),
        );
      }
      if (credentials.telegram_bot_token) {
        credentialSaves.push(
          storeCredential("telegram_bot_token", credentials.telegram_bot_token),
        );
      }
      if (credentials.usajobs_api_key) {
        credentialSaves.push(
          storeCredential("usajobs_api_key", credentials.usajobs_api_key),
        );
      }

      const configSave = invoke("save_config", { config });
      const results = await Promise.allSettled([...credentialSaves, configSave]);
      const credentialResults = results.slice(0, credentialSaves.length);
      const configResult = results[credentialSaves.length];

      const credentialFailures = credentialResults.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      const configFailure =
        configResult?.status === "rejected" ? configResult : null;

      if (configFailure) {
        logError("Settings config save failed:", configFailure.reason);
        if (credentialFailures.length > 0) {
          logError(
            "Credential save failures:",
            credentialFailures.map((f) => f.reason),
          );
        }
        toast.error(
          "Could not save settings",
          credentialFailures.length > 0
            ? "Settings and some saved connection details could not be saved. Try saving again."
            : "Settings could not be saved. Try saving again.",
        );
        return;
      }

      if (credentialFailures.length > 0) {
        logError(
          "Credential save failures:",
          credentialFailures.map((f) => f.reason),
        );
        toast.warning(
          "Some connection details were not saved",
          `${credentialFailures.length} saved connection detail(s) were not saved. Settings were saved. Try saving again.`,
        );
      } else {
        toast.success(
          "Settings saved!",
          "Saved connection details are stored in your system password manager.",
        );
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [config, credentialStatus, credentials, toast, onClose]);

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!saving && config) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, config, handleSave]);

  const handleExportConfig = () => {
    if (!config) return;
    try {
      exportConfigToJSON(config);
      toast.success(
        "Private settings backup saved",
        "Saved passwords and connection codes are left out. This backup can still include search, pay, location, company, and alert settings.",
      );
    } catch (error: unknown) {
      logError("Failed to export config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    }
  };

  const handleImportConfig = async () => {
    try {
      const result = await importConfigFromJSON<unknown>();
      if (result.status === "cancelled") {
        return; // User cancelled
      }
      if (result.status === "invalid") {
        toast.error(
          "Could not read settings backup",
          "Choose another JobSentinel settings backup file.",
        );
        return;
      }
      if (!isSettingsBackupConfig(result.config)) {
        toast.error(
          "That is not a JobSentinel settings backup",
          "Choose a settings backup created from JobSentinel Settings.",
        );
        return;
      }

      // Connection secrets stay in OS secure storage, not in backup files.
      setConfig(result.config);
      toast.success(
        "Settings restored",
        "Review settings and use Save. Saved connection details are not included in backups, so add them again if needed.",
      );
    } catch (error: unknown) {
      logError("Failed to restore settings backup:", error);
      toast.error(
        "Could not restore settings",
        "Choose another JobSentinel settings backup file.",
      );
    }
  };


  const handleAddTitle = () => {
    if (!config) return;
    const trimmed = titleInput.trim();
    if (trimmed && !config.title_allowlist.includes(trimmed)) {
      setConfig({
        ...config,
        title_allowlist: [...config.title_allowlist, trimmed],
      });
      setTitleInput("");
    }
  };

  const handleRemoveTitle = (title: string) => {
    if (!config) return;
    setConfig({
      ...config,
      title_allowlist: config.title_allowlist.filter((t) => t !== title),
    });
  };

  const handleAddSkill = () => {
    if (!config) return;
    const trimmed = skillInput.trim();
    if (trimmed && !config.keywords_boost.includes(trimmed)) {
      setConfig({
        ...config,
        keywords_boost: [...config.keywords_boost, trimmed],
      });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    if (!config) return;
    setConfig({
      ...config,
      keywords_boost: config.keywords_boost.filter((s) => s !== skill),
    });
  };

  const handleAddCity = () => {
    if (!config) return;
    const trimmed = cityInput.trim();
    if (trimmed && !config.location_preferences.cities.includes(trimmed)) {
      setConfig({
        ...config,
        location_preferences: {
          ...config.location_preferences,
          cities: [...config.location_preferences.cities, trimmed],
        },
      });
      setCityInput("");
    }
  };

  const handleRemoveCity = (city: string) => {
    if (!config) return;
    setConfig({
      ...config,
      location_preferences: {
        ...config.location_preferences,
        cities: config.location_preferences.cities.filter((c) => c !== city),
      },
    });
  };

  // Blocked title handlers
  const handleAddBlockedTitle = () => {
    if (!config) return;
    const trimmed = blockedTitleInput.trim();
    if (trimmed && !config.title_blocklist.includes(trimmed)) {
      setConfig({
        ...config,
        title_blocklist: [...config.title_blocklist, trimmed],
      });
      setBlockedTitleInput("");
    }
  };

  const handleRemoveBlockedTitle = (title: string) => {
    if (!config) return;
    setConfig({
      ...config,
      title_blocklist: config.title_blocklist.filter((t) => t !== title),
    });
  };

  // Exclude keyword handlers
  const handleAddExcludeKeyword = () => {
    if (!config) return;
    const trimmed = excludeKeywordInput.trim();
    if (trimmed && !config.keywords_exclude.includes(trimmed)) {
      setConfig({
        ...config,
        keywords_exclude: [...config.keywords_exclude, trimmed],
      });
      setExcludeKeywordInput("");
    }
  };

  const handleRemoveExcludeKeyword = (keyword: string) => {
    if (!config) return;
    setConfig({
      ...config,
      keywords_exclude: config.keywords_exclude.filter((k) => k !== keyword),
    });
  };

  // Company whitelist handlers
  const handleAddWhitelistCompany = () => {
    if (!config) return;
    const trimmed = whitelistCompanyInput.trim();
    if (trimmed && !config.company_whitelist.includes(trimmed)) {
      setConfig({
        ...config,
        company_whitelist: [...config.company_whitelist, trimmed],
      });
      setWhitelistCompanyInput("");
    }
  };

  const handleRemoveWhitelistCompany = (company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_whitelist: config.company_whitelist.filter((c) => c !== company),
    });
  };

  // Company blacklist handlers
  const handleAddBlacklistCompany = () => {
    if (!config) return;
    const trimmed = blacklistCompanyInput.trim();
    if (trimmed && !config.company_blacklist.includes(trimmed)) {
      setConfig({
        ...config,
        company_blacklist: [...config.company_blacklist, trimmed],
      });
      setBlacklistCompanyInput("");
    }
  };

  const handleRemoveBlacklistCompany = (company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_blacklist: config.company_blacklist.filter((c) => c !== company),
    });
  };

  const handleSaveGhostConfig = async () => {
    if (!ghostConfig) return;

    try {
      setGhostConfigLoading(true);
      await invoke("set_ghost_config", { config: ghostConfig });
      toast.success(
        "Posting risk settings saved",
        "New job checks use these warnings.",
      );
    } catch (error: unknown) {
      logError("Failed to save ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    } finally {
      setGhostConfigLoading(false);
    }
  };

  const handleResetGhostConfig = async () => {
    try {
      setGhostConfigLoading(true);
      await invoke("reset_ghost_config");
      await loadGhostConfig();
      toast.success(
        "Posting risk defaults restored",
        "Balanced warnings are back on.",
      );
    } catch (error: unknown) {
      logError("Failed to reset ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div
            className="flex items-center justify-center py-12"
            role="status"
            aria-label="Loading settings"
          >
            <div
              className="animate-spin w-8 h-8 border-4 border-sentinel-500 border-t-transparent rounded-full"
              aria-hidden="true"
            />
            <span className="sr-only">Loading settings...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-sm text-red-500 dark:text-red-400 text-center max-w-md">
              Settings could not load. Try again. If this keeps happening,
              save a safe support report from Help before closing and reopening
              JobSentinel.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => void loadConfig()}
                className="px-4 py-2 text-sm rounded bg-sentinel-500 text-white hover:bg-sentinel-600"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-600"
              >
                Close
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400" />
              </div>
              <div>
                <h2
                  id="settings-title"
                  className="font-display text-display-lg text-surface-900 dark:text-white"
                >
                  Settings
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Update your job search preferences
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Close settings"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Tab Navigation */}
          <div
            role="tablist"
            aria-label="Settings tabs"
            className="flex border-b border-surface-200 dark:border-surface-700 mb-6"
          >
            <button
              role="tab"
              aria-selected={activeTab === "basic"}
              aria-controls="basic-settings-panel"
              id="basic-settings-tab"
              onClick={() => setActiveTab("basic")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "basic"
                  ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              Search Preferences
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "advanced"}
              aria-controls="advanced-settings-panel"
              id="advanced-settings-tab"
              onClick={() => setActiveTab("advanced")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "advanced"
                  ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              Sources & Alerts
            </button>
          </div>

          {/* BASIC SETTINGS TAB */}
          {activeTab === "basic" && (
            <div
              role="tabpanel"
              id="basic-settings-panel"
              aria-labelledby="basic-settings-tab"
            >
              <SettingsSearchPreferencesSection
                config={config}
                titleInput={titleInput}
                blockedTitleInput={blockedTitleInput}
                skillInput={skillInput}
                excludeKeywordInput={excludeKeywordInput}
                cityInput={cityInput}
                whitelistCompanyInput={whitelistCompanyInput}
                blacklistCompanyInput={blacklistCompanyInput}
                detectedLocation={detectedLocation}
                isDetectingLocation={isDetectingLocation}
                onConfigChange={setConfig}
                onTitleInputChange={setTitleInput}
                onBlockedTitleInputChange={setBlockedTitleInput}
                onSkillInputChange={setSkillInput}
                onExcludeKeywordInputChange={setExcludeKeywordInput}
                onCityInputChange={setCityInput}
                onWhitelistCompanyInputChange={setWhitelistCompanyInput}
                onBlacklistCompanyInputChange={setBlacklistCompanyInput}
                onAddTitle={handleAddTitle}
                onRemoveTitle={handleRemoveTitle}
                onAddBlockedTitle={handleAddBlockedTitle}
                onRemoveBlockedTitle={handleRemoveBlockedTitle}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
                onAddExcludeKeyword={handleAddExcludeKeyword}
                onRemoveExcludeKeyword={handleRemoveExcludeKeyword}
                onDetectLocation={handleDetectLocation}
                onUseDetectedLocation={handleUseDetectedLocation}
                onAddCity={handleAddCity}
                onRemoveCity={handleRemoveCity}
                onAddWhitelistCompany={handleAddWhitelistCompany}
                onRemoveWhitelistCompany={handleRemoveWhitelistCompany}
                onAddBlacklistCompany={handleAddBlacklistCompany}
                onRemoveBlacklistCompany={handleRemoveBlacklistCompany}
              />
            </div>
          )}

          {/* ADVANCED SETTINGS TAB */}
          {activeTab === "advanced" && (
            <div
              role="tabpanel"
              id="advanced-settings-panel"
              aria-labelledby="advanced-settings-tab"
            >
              <SettingsNotificationsSection
                config={config}
                credentialStatus={credentialStatus}
                credentials={credentials}
                setConfig={setConfig}
                setCredentials={setCredentials}
              />

              <SettingsJobSourcesSection
                config={config}
                credentialStatus={credentialStatus}
                credentials={credentials}
                jobBoardRecommendations={jobBoardRecommendations}
                jobsWithGptLastRequest={jobsWithGptLastRequest}
                jobsWithGptPayload={jobsWithGptPayload}
                jobsWithGptPayloadApproved={jobsWithGptPayloadApproved}
                onApproveJobsWithGptPayload={approveJobsWithGptPayload}
                onClearJobsWithGptApproval={clearJobsWithGptApproval}
                setConfig={setConfig}
                setCredentials={setCredentials}
                setShowJobsWithGptEndpoint={setShowJobsWithGptEndpoint}
                showJobsWithGptEndpoint={showJobsWithGptEndpoint}
              />

              {/* Browser Button */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Browser Button
                  <HelpIcon text="Save many job pages into JobSentinel with a browser button you control." />
                </h3>
                <BookmarkletGenerator />
              </section>

              <SettingsPostingRiskSection
                ghostConfig={ghostConfig}
                ghostConfigLoading={ghostConfigLoading}
                ghostPreset={ghostPreset}
                onGhostConfigChange={setGhostConfig}
                onGhostPresetChange={setGhostPreset}
                onReset={handleResetGhostConfig}
                onSave={handleSaveGhostConfig}
              />

              <SettingsResumeMatchingSection
                config={config}
                onConfigChange={setConfig}
              />

              <SettingsHelpStatusSection
                onShowHealthDashboard={() => setShowHealthDashboard(true)}
              />
            </div>
          )}

          <SettingsBackupSection
            onExportConfig={handleExportConfig}
            onImportConfig={handleImportConfig}
          />

          <SettingsSupportSection
            copyingDebugReport={copyingDebugReport}
            onCopyDebugReport={handleCopyDebugReport}
            onOpenFeedback={() => setShowFeedbackModal(true)}
            onSaveDebugReport={handleSaveDebugReport}
            savingDebugReport={savingDebugReport}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              loadingText="Saving..."
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Job Sources Modal */}
      {showHealthDashboard && (
        <ScraperHealthDashboard onClose={() => setShowHealthDashboard(false)} />
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
}
