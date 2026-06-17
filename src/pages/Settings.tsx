import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { HelpIcon } from "../components/HelpIcon";
import { Modal } from "../components/Modal";
import { ScraperHealthDashboard } from "../components/ScraperHealthDashboard";
import { FeedbackModal } from "../components/feedback/FeedbackModal";
import { BookmarkletGenerator } from "../components/BookmarkletGenerator";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { getUserFriendlyError } from "../utils/errorMessages";
import { exportConfigToJSON, importConfigFromJSON } from "../utils/export";
import { invalidateCacheByCommand } from "../utils/api";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type LocationInfo,
} from "../utils/locationDetection";
import {
  buildJobsWithGptPayload,
  getCredentialValidationError,
  isCurrentJobsWithGptPayloadApproved,
  isSettingsBackupConfig,
  storeCredential,
  type Config,
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
import { SettingsCredentialLockSection } from "./SettingsCredentialLockSection";
import {
  SettingsBackupSection,
  SettingsHelpStatusSection,
  SettingsSupportSection,
} from "./SettingsSupportSections";
import { useSettingsCredentials } from "./useSettingsCredentials";
import { useSettingsSupportReports } from "./useSettingsSupportReports";

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
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
  const [ghostConfig, setGhostConfig] = useState<GhostConfig | null>(null);
  const [ghostConfigLoading, setGhostConfigLoading] = useState(false);
  const [jobsWithGptLastRequest, setJobsWithGptLastRequest] =
    useState<SourceRequestSummary | null>(null);
  const [showJobsWithGptEndpoint, setShowJobsWithGptEndpoint] = useState(false);
  const [ghostPreset, setGhostPreset] = useState<GhostPresetSelection>("balanced");
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");
  const settingsTabRefs = useRef<Record<"basic" | "advanced", HTMLButtonElement | null>>({
    basic: null,
    advanced: null,
  });
  const toast = useToast();
  const {
    error: toastError,
    success: toastSuccess,
    warning: toastWarning,
  } = toast;
  const {
    credentials,
    credentialStatus,
    getCredentialSaveEntries,
    initializeCredentialStatus,
    markCredentialNeedsAttention,
    markCredentialsSaved,
    setCredentials,
  } = useSettingsCredentials(toast);
  const {
    closeFeedbackModal,
    copyingDebugReport,
    handleCopyDebugReport,
    handleSaveDebugReport,
    openFeedbackModal,
    savingDebugReport,
    showFeedbackModal,
  } = useSettingsSupportReports(toast);

  // Location detection state
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation(),
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const focusSettingsTab = useCallback((tab: "basic" | "advanced") => {
    setActiveTab(tab);
    requestAnimationFrame(() => settingsTabRefs.current[tab]?.focus());
  }, []);

  const handleSettingsTabKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: "basic" | "advanced") => {
      const orderedTabs = ["basic", "advanced"] as const;
      const currentIndex = orderedTabs.indexOf(currentTab);
      const nextTab = (() => {
        switch (event.key) {
          case "ArrowLeft":
          case "ArrowUp":
            return orderedTabs[(currentIndex - 1 + orderedTabs.length) % orderedTabs.length];
          case "ArrowRight":
          case "ArrowDown":
            return orderedTabs[(currentIndex + 1) % orderedTabs.length];
          case "Home":
            return orderedTabs[0];
          case "End":
            return orderedTabs[orderedTabs.length - 1];
          default:
            return null;
        }
      })();

      if (!nextTab) return;

      event.preventDefault();
      focusSettingsTab(nextTab);
    },
    [focusSettingsTab],
  );

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
      const alerts = configData.alerts;
      const emailAlerts = alerts.email as Partial<
        Config["alerts"]["email"]
      > | undefined;
      const nextConfig = {
        ...configData,
        company_whitelist: configData.company_whitelist ?? [],
        company_blacklist: configData.company_blacklist ?? [],
        alerts: {
          ...alerts,
          slack: alerts.slack ?? { enabled: false },
          email: {
            enabled: false,
            smtp_server: "",
            smtp_port: 587,
            smtp_username: "",
            from_email: "",
            to_emails: [],
            use_starttls: true,
            ...emailAlerts,
          },
          discord: alerts.discord ?? { enabled: false },
          telegram: alerts.telegram ?? { enabled: false },
          teams: alerts.teams ?? { enabled: false },
          desktop: {
            enabled: alerts.desktop?.enabled ?? true,
            show_when_focused: alerts.desktop?.show_when_focused ?? false,
            play_sound: alerts.desktop?.play_sound ?? false,
          },
        },
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
      };
      setConfig(nextConfig);
      initializeCredentialStatus(nextConfig);

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

    } catch (error: unknown) {
      logError("Failed to load config:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    } finally {
      setLoading(false);
    }
  }, [initializeCredentialStatus, toastError]);

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
      toastWarning(
        "Posting risk defaults loaded",
        "Couldn't load your saved posting-risk settings. Using defaults.",
      );
    } finally {
      setGhostConfigLoading(false);
    }
  }, [toastWarning]);

  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    try {
      const location = await invoke<LocationInfo>("detect_location");
      setDetectedLocation(location);
      cacheDetectedLocation(location);
    } catch {
      toastWarning("Location unavailable", "Enter a city manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toastWarning]);

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
    toastSuccess("Location added", `Added ${locationStr}`);
  }, [config, detectedLocation, toastSuccess]);

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

      // Save credentials to secure storage only after normal settings persist.
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
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );

      if (credentialFailures.length > 0) {
        logError(
          "Credential save failures:",
          credentialFailures.map((f) => f.reason),
        );
        toastWarning(
          "Some connection details were not saved",
          `${credentialFailures.length} saved connection detail(s) were not saved. Settings were saved. Try saving again.`,
        );
      } else {
        const saveMessage =
          successfulCredentialKeys.length > 0
            ? "Connection details are stored in your system password manager."
            : "Your job-search preferences were saved.";
        toastSuccess(
          "Settings saved",
          saveMessage,
        );
        onClose();
      }
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
    toastError,
    toastSuccess,
    toastWarning,
    onClose,
  ]);

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
      toastSuccess(
        "Private settings backup saved",
        "Saved passwords and connection codes are left out. This backup can still include search, pay, location, company, and alert settings.",
      );
    } catch (error: unknown) {
      logError("Failed to export config:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    }
  };

  const handleImportConfig = async () => {
    try {
      const result = await importConfigFromJSON<unknown>();
      if (result.status === "cancelled") {
        return; // User cancelled
      }
      if (result.status === "invalid") {
        toastError(
          "Could not read settings backup",
          "Choose another JobSentinel settings backup file.",
        );
        return;
      }
      if (!isSettingsBackupConfig(result.config)) {
        toastError(
          "That is not a JobSentinel settings backup",
          "Choose a settings backup created from JobSentinel Settings.",
        );
        return;
      }

      // Connection secrets stay in OS secure storage, not in backup files.
      setConfig(result.config);
      toastSuccess(
        "Settings restored",
        "Review settings and use Save. Saved connection details are not included in backups, so add them again if needed.",
      );
    } catch (error: unknown) {
      logError("Failed to restore settings backup:", error);
      toastError(
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
    const companyWhitelist = config.company_whitelist ?? [];
    if (trimmed && !companyWhitelist.includes(trimmed)) {
      setConfig({
        ...config,
        company_whitelist: [...companyWhitelist, trimmed],
      });
      setWhitelistCompanyInput("");
    }
  };

  const handleRemoveWhitelistCompany = (company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_whitelist: (config.company_whitelist ?? []).filter((c) => c !== company),
    });
  };

  // Company blacklist handlers
  const handleAddBlacklistCompany = () => {
    if (!config) return;
    const trimmed = blacklistCompanyInput.trim();
    const companyBlacklist = config.company_blacklist ?? [];
    if (trimmed && !companyBlacklist.includes(trimmed)) {
      setConfig({
        ...config,
        company_blacklist: [...companyBlacklist, trimmed],
      });
      setBlacklistCompanyInput("");
    }
  };

  const handleRemoveBlacklistCompany = (company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_blacklist: (config.company_blacklist ?? []).filter((c) => c !== company),
    });
  };

  const handleSaveGhostConfig = async () => {
    if (!ghostConfig) return;

    try {
      setGhostConfigLoading(true);
      await invoke("set_ghost_config", { config: ghostConfig });
      toastSuccess(
        "Posting risk settings saved",
        "New job checks use these warnings.",
      );
    } catch (error: unknown) {
      logError("Failed to save ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    } finally {
      setGhostConfigLoading(false);
    }
  };

  const handleResetGhostConfig = async () => {
    try {
      setGhostConfigLoading(true);
      await invoke("reset_ghost_config");
      await loadGhostConfig();
      toastSuccess(
        "Posting risk defaults restored",
        "Balanced warnings are back on.",
      );
    } catch (error: unknown) {
      logError("Failed to reset ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toastError(friendly.title, friendly.message);
    }
  };

  if (loading) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Settings"
        description="Loading settings"
        size="wide"
        closeButtonLabel="Close settings"
      >
        <div
          className="flex items-center justify-center py-12"
          role="status"
          aria-label="Loading settings"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-sentinel-500 border-t-transparent"
            aria-hidden="true"
          />
          <span className="sr-only">Loading settings...</span>
        </div>
      </Modal>
    );
  }

  if (!config) {
    return (
      <>
        <Modal
          isOpen
          onClose={onClose}
          title="Settings could not load"
          description="Try again. If this keeps happening, copy or save a safe support report before closing and reopening JobSentinel."
          size="wide"
          closeButtonLabel="Close settings"
      >
          <div className="flex flex-col items-center justify-center gap-4 py-8">
              <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">
                Settings did not load.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
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
              <div className="w-full max-w-md pt-2">
                <SettingsSupportSection
                  copyingDebugReport={copyingDebugReport}
                  onCopyDebugReport={handleCopyDebugReport}
                  onOpenFeedback={openFeedbackModal}
                  onSaveDebugReport={handleSaveDebugReport}
                  savingDebugReport={savingDebugReport}
                />
              </div>
          </div>
        </Modal>
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={closeFeedbackModal}
        />
      </>
    );
  }

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="Settings"
        description="Update your job search preferences"
        size="wide"
        closeButtonLabel="Close settings"
    >
          {/* Tab Navigation */}
          <div
            role="tablist"
            aria-label="Settings tabs"
            className="flex border-b border-surface-200 dark:border-surface-700 mb-6"
          >
            <button
              role="tab"
              ref={(element) => {
                settingsTabRefs.current.basic = element;
              }}
              aria-selected={activeTab === "basic"}
              aria-controls="basic-settings-panel"
              id="basic-settings-tab"
              tabIndex={activeTab === "basic" ? 0 : -1}
              onClick={() => setActiveTab("basic")}
              onKeyDown={(event) => handleSettingsTabKeyDown(event, "basic")}
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
              ref={(element) => {
                settingsTabRefs.current.advanced = element;
              }}
              aria-selected={activeTab === "advanced"}
              aria-controls="advanced-settings-panel"
              id="advanced-settings-tab"
              tabIndex={activeTab === "advanced" ? 0 : -1}
              onClick={() => setActiveTab("advanced")}
              onKeyDown={(event) => handleSettingsTabKeyDown(event, "advanced")}
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
                markCredentialNeedsAttention={markCredentialNeedsAttention}
                setConfig={setConfig}
                setCredentials={setCredentials}
              />

              <SettingsCredentialLockSection />

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
            onOpenFeedback={openFeedbackModal}
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
      </Modal>

      {/* Job Sources Modal */}
      {showHealthDashboard && (
        <ScraperHealthDashboard onClose={() => setShowHealthDashboard(false)} />
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={closeFeedbackModal}
      />
    </>
  );
}
