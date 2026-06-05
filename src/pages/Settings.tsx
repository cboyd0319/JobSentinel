import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { NotificationPreferences } from "../components/NotificationPreferences";
import { HelpIcon } from "../components/HelpIcon";
import { ScraperHealthDashboard } from "../components/ScraperHealthDashboard";
import { FeedbackModal } from "../components/feedback/FeedbackModal";
import {
  CloseIcon,
  EmailIcon,
  SettingsIcon,
  SettingsSymbol,
} from "./SettingsIcons";
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
  isValidDiscordWebhook,
  isValidEmail,
  isValidSlackWebhook,
  isValidTeamsWebhook,
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
import { SettingsSearchPreferencesSection } from "./SettingsSearchPreferencesSection";
import { SecurityBadge } from "./SettingsSecurityBadge";
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
  const [emailProvider, setEmailProvider] = useState<
    "custom" | "gmail" | "outlook" | "yahoo"
  >("custom");
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");
  // Loading states for async test/connect buttons
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
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

  // Email service templates for easier setup
  const emailProviderTemplates = {
    gmail: {
      server: "smtp.gmail.com",
      port: 587,
      starttls: true,
      hint: "Use an app password from Google Account Security",
    },
    outlook: {
      server: "smtp-mail.outlook.com",
      port: 587,
      starttls: true,
      hint: "Use an app password if Outlook asks for one",
    },
    yahoo: {
      server: "smtp.mail.yahoo.com",
      port: 587,
      starttls: true,
      hint: "Use an app password from Yahoo Account Security",
    },
    custom: {
      server: "",
      port: 587,
      starttls: true,
      hint: "Leave these alone unless your email service gave you these details.",
    },
  };

  // Apply email service template
  const applyEmailProvider = (
    provider: "gmail" | "outlook" | "yahoo" | "custom",
  ) => {
    setEmailProvider(provider);
    if (provider !== "custom" && config) {
      const template = emailProviderTemplates[provider];
      setConfig({
        ...config,
        alerts: {
          ...config.alerts,
          email: {
            ...config.alerts.email,
            smtp_server: template.server,
            smtp_port: template.port,
            use_starttls: template.starttls,
          },
        },
      });
    }
  };

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

  const handleWebhookAlertToggle = (
    channel: "slack" | "discord" | "teams",
    label: "Slack" | "Discord" | "Teams",
    credentialKey: "slack_webhook" | "discord_webhook" | "teams_webhook",
    value: string,
    validator: (value: string) => boolean,
    enabled: boolean,
  ) => {
    if (!config) return;

    const trimmed = value.trim();
    if (enabled && !credentialStatus[credentialKey] && !trimmed) {
      toast.info(
        `Paste ${label} connection link first`,
        `Then turn ${label} alerts on.`,
      );
      return;
    }
    if (enabled && trimmed && !validator(trimmed)) {
      toast.error(
        `Check ${label} connection link`,
        `Paste the full ${label} connection link, then turn alerts on.`,
      );
      return;
    }

    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        [channel]: {
          ...config.alerts[channel],
          enabled,
        },
      },
    });
  };

  const handleTelegramAlertToggle = (enabled: boolean) => {
    if (!config) return;

    const alertCode = credentials.telegram_bot_token.trim();
    const destination = config.alerts.telegram?.chat_id?.trim() ?? "";
    if (
      enabled &&
      ((!credentialStatus.telegram_bot_token && !alertCode) || !destination)
    ) {
      toast.info(
        "Telegram setup opened",
        "Add the Telegram details before saving alerts.",
      );
    }

    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        telegram: {
          ...config.alerts.telegram,
          enabled,
        },
      },
    });
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

  const isValidFromEmail = isValidEmail(config.alerts.email?.from_email ?? "");
  const hasValidToEmails = (config.alerts.email?.to_emails ?? []).every(
    isValidEmail,
  );

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
              {/* Notifications */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Get Notified
                  <HelpIcon text="Receive alerts when new jobs match your criteria. Desktop alerts are the easiest option; email and chat alerts are optional." />
                </h3>
                <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
                  Start with desktop alerts if you want the simplest setup.
                  Email gives you an inbox copy. Chat alerts are optional for
                  people who already use those tools.
                </p>
                <p className="mb-4 rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                  Email and chat alerts are sent through the service you choose.
                  They can include job title, company, location, pay, remote
                  status, fit label, source, and job link. Resume text,
                  private notes, application history, and local match reasons
                  stay in JobSentinel.
                </p>

                {/* Desktop Notifications */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Desktop Notifications
                    <HelpIcon
                      text="Get desktop alerts from your computer when new jobs match your criteria. No extra account or connection link required."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <p className="mb-3 text-xs text-surface-500 dark:text-surface-400">
                      Desktop alerts use private wording. They do not show job
                      titles, company names, salary notes, or reminder text.
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="bell" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Desktop alerts
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable desktop alerts"
                          checked={config.alerts.desktop?.enabled ?? true}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                desktop: {
                                  ...config.alerts.desktop,
                                  enabled: e.target.checked,
                                  show_when_focused:
                                    config.alerts.desktop?.show_when_focused ??
                                    false,
                                  play_sound:
                                    config.alerts.desktop?.play_sound ?? true,
                                },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {config.alerts.desktop?.enabled && (
                      <div className="space-y-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.alerts.desktop?.play_sound ?? true}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  desktop: {
                                    ...config.alerts.desktop,
                                    enabled: true,
                                    play_sound: e.target.checked,
                                    show_when_focused:
                                      config.alerts.desktop
                                        ?.show_when_focused ?? false,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-600 dark:text-surface-300">
                            Play sound
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              config.alerts.desktop?.show_when_focused ?? false
                            }
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  desktop: {
                                    ...config.alerts.desktop,
                                    enabled: true,
                                    show_when_focused: e.target.checked,
                                    play_sound:
                                      config.alerts.desktop?.play_sound ?? true,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-600 dark:text-surface-300">
                            Show even when JobSentinel is open on screen
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <EmailIcon className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        Email Alerts
                      </span>
                      <HelpIcon text="Email alerts are optional. Leave this off unless your email service gives you an app password or sending settings." />
                    </div>
                    <label
                      className="relative inline-flex items-center cursor-pointer"
                      data-testid="email-alerts-toggle"
                    >
                      <input
                        type="checkbox"
                        aria-label="Enable email alerts"
                        checked={config.alerts.email?.enabled ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            alerts: {
                              ...config.alerts,
                              email: {
                                ...config.alerts.email,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                    </label>
                  </div>

                  {config.alerts.email?.enabled && (
                    <div className="space-y-3">
                      {/* Email service quick setup */}
                      <div className="flex items-center gap-2 -mt-1 mb-2">
                        <span className="text-sm text-surface-600 dark:text-surface-400">
                          Optional setup:
                        </span>
                        <div className="flex gap-1">
                          {(
                            ["gmail", "outlook", "yahoo", "custom"] as const
                          ).map((provider) => (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => applyEmailProvider(provider)}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                emailProvider === provider
                                  ? "bg-sentinel-500 text-white"
                                  : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                              }`}
                            >
                              {provider === "gmail"
                                ? "Gmail"
                                : provider === "outlook"
                                  ? "Outlook"
                                  : provider === "yahoo"
                                    ? "Yahoo"
                                    : "Other"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
                        {emailProviderTemplates[emailProvider].hint}
                        {emailProvider === "gmail" && (
                          <>
                            {" "}
                            —{" "}
                            <a
                              href="https://myaccount.google.com/apppasswords"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sentinel-500 hover:underline"
                            >
                              Create App Password
                            </a>
                          </>
                        )}
                        {emailProvider === "yahoo" && (
                          <>
                            {" "}
                            —{" "}
                            <a
                              href="https://login.yahoo.com/account/security"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sentinel-500 hover:underline"
                            >
                              Yahoo Security Settings
                            </a>
                          </>
                        )}
                      </p>
                      <div className="flex items-center justify-between -mt-1 mb-3">
                        <span></span>
                        {config.alerts.email?.smtp_server &&
                          config.alerts.email?.smtp_username &&
                          (credentials.smtp_password ||
                            credentialStatus.smtp_password) &&
                          config.alerts.email?.from_email &&
                          isValidFromEmail &&
                          config.alerts.email?.to_emails?.length > 0 &&
                          hasValidToEmails && (
                            <Button
                              variant="secondary"
                              disabled={testingEmail}
                              onClick={async () => {
                                setTestingEmail(true);
                                try {
                                  if (
                                    !credentials.smtp_password &&
                                    !credentialStatus.smtp_password
                                  ) {
                                    toast.error(
                                      "App password needed",
                                      "Enter the app password from your email service.",
                                    );
                                    return;
                                  }
                                  await invoke("test_email_notification", {
                                    emailConfig: {
                                      smtp_server:
                                        config.alerts.email.smtp_server,
                                      smtp_port: config.alerts.email.smtp_port,
                                      smtp_username:
                                        config.alerts.email.smtp_username,
                                      smtp_password: credentials.smtp_password,
                                      from_email:
                                        config.alerts.email.from_email,
                                      to_emails: config.alerts.email.to_emails,
                                      use_starttls:
                                        config.alerts.email.use_starttls ??
                                        true,
                                    },
                                  });
                                  toast.success(
                                    "Test sent!",
                                    "Check your email inbox",
                                  );
                                } catch {
                                  toast.error(
                                    "Could not send test",
                                    "Check the email account, app password, and recipient addresses.",
                                  );
                                } finally {
                                  setTestingEmail(false);
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              {testingEmail ? "Testing..." : "Test"}
                            </Button>
                          )}
                      </div>
                      <details className="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-surface-700 dark:text-surface-300">
                          Only if your email service gave you these details
                        </summary>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <Input
                            label="Email sending service"
                            value={config.alerts.email?.smtp_server ?? ""}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  email: {
                                    ...config.alerts.email,
                                    smtp_server: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="smtp.gmail.com"
                            hint="Use this only if your email service gave you this detail."
                          />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                label="Number from email service"
                                type="number"
                                value={config.alerts.email?.smtp_port ?? 587}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    alerts: {
                                      ...config.alerts,
                                      email: {
                                        ...config.alerts.email,
                                        smtp_port:
                                          parseInt(e.target.value) || 587,
                                      },
                                    },
                                  })
                                }
                                hint="Use this only if your email service gave you this detail."
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <div className="space-y-1">
                                <label
                                  className="flex items-center gap-2 cursor-pointer"
                                  title="Enable secure connection (recommended)"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      config.alerts.email?.use_starttls ?? true
                                    }
                                    onChange={(e) =>
                                      setConfig({
                                        ...config,
                                        alerts: {
                                          ...config.alerts,
                                          email: {
                                            ...config.alerts.email,
                                            use_starttls: e.target.checked,
                                          },
                                        },
                                      })
                                    }
                                    className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                                  />
                                  <span className="text-sm text-surface-700 dark:text-surface-300">
                                    Use secure email connection (recommended)
                                  </span>
                                </label>
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                  Leave this on unless your email service says to turn it off.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Email address"
                          value={config.alerts.email?.smtp_username ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  smtp_username: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="your@gmail.com"
                          hint="The email account to send from"
                          autoComplete="email"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                              App Password
                            </span>
                            <SecurityBadge
                              stored={credentialStatus.smtp_password}
                            />
                          </div>
                          <Input
                            type="password"
                            value={credentials.smtp_password}
                            onChange={(e) =>
                              setCredentials((prev) => ({
                                ...prev,
                                smtp_password: e.target.value,
                              }))
                            }
                            placeholder={
                              credentialStatus.smtp_password
                                ? "Enter new app password to update"
                                : "App password from your email service"
                            }
                            autoComplete="current-password"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Send From"
                          value={config.alerts.email?.from_email ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  from_email: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="your@gmail.com"
                          hint="Usually same as your email address"
                          error={
                            !isValidFromEmail
                              ? "Use an email address like user@example.com."
                              : undefined
                          }
                          autoComplete="email"
                        />
                        <Input
                          label="Send To"
                          value={
                            config.alerts.email?.to_emails?.join(", ") ?? ""
                          }
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  to_emails: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                },
                              },
                            })
                          }
                          placeholder="you@email.com"
                          hint="Where to receive alerts (can be the same email)"
                          error={
                            !hasValidToEmails
                              ? "Use an email address like user@example.com."
                              : undefined
                          }
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Optional chat alerts
                  </h4>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Use these only if Slack, Discord, Teams, or Telegram are
                    already part of your routine.
                  </p>
                </div>

                {/* Slack */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Slack Notifications
                    <HelpIcon
                      text="Get job alerts in a Slack channel. In Slack, add the app that creates channel connection links, choose a channel, then copy the link."
                      position="right"
                    />
                    <SecurityBadge stored={credentialStatus.slack_webhook} />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Slack
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Slack alerts"
                          checked={config.alerts.slack?.enabled ?? false}
                          onChange={(e) =>
                            handleWebhookAlertToggle(
                              "slack",
                              "Slack",
                              "slack_webhook",
                              credentials.slack_webhook,
                              isValidSlackWebhook,
                              e.target.checked,
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="password"
                          value={credentials.slack_webhook}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCredentials((prev) => ({
                              ...prev,
                              slack_webhook: value,
                            }));
                          }}
                          placeholder={
                            credentialStatus.slack_webhook
                              ? "Enter new Slack connection link"
                              : "Paste Slack connection link, then turn Slack alerts on"
                          }
                          error={
                            credentials.slack_webhook &&
                            !isValidSlackWebhook(credentials.slack_webhook)
                              ? "This doesn't look like a Slack connection link"
                              : undefined
                          }
                          hint="Saved securely on this computer"
                          autoComplete="off"
                        />
                      </div>
                      {(credentials.slack_webhook ||
                        credentialStatus.slack_webhook) && (
                        <Button
                          variant="secondary"
                          disabled={testingSlack}
                          onClick={async () => {
                            setTestingSlack(true);
                            try {
                              if (
                                !credentials.slack_webhook &&
                                !credentialStatus.slack_webhook
                              ) {
                                toast.error(
                                  "No Slack link",
                                  "Paste a Slack connection link first.",
                                );
                                return;
                              }
                              await invoke("validate_slack_webhook", {
                                webhookUrl: credentials.slack_webhook,
                              });
                              toast.success(
                                "Test sent!",
                                "Check your Slack channel",
                              );
                            } catch {
                              toast.error(
                                "Could not send test",
                                "Check that the Slack connection link is correct and try again",
                              );
                            } finally {
                              setTestingSlack(false);
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          {testingSlack ? "Testing..." : "Test"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discord */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Discord Notifications
                    <HelpIcon
                      text="Get job alerts in a Discord channel. In Discord, create a channel connection link, then paste it here."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Discord
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Discord alerts"
                          checked={config.alerts.discord?.enabled ?? false}
                          onChange={(e) =>
                            handleWebhookAlertToggle(
                              "discord",
                              "Discord",
                              "discord_webhook",
                              credentials.discord_webhook,
                              isValidDiscordWebhook,
                              e.target.checked,
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {(config.alerts.discord?.enabled ||
                      !credentialStatus.discord_webhook ||
                      credentials.discord_webhook) && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            Connection link
                          </span>
                          <SecurityBadge
                            stored={credentialStatus.discord_webhook}
                          />
                        </div>
                        <Input
                          type="password"
                          value={credentials.discord_webhook}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              discord_webhook: e.target.value,
                            }))
                          }
                          placeholder={
                            credentialStatus.discord_webhook
                              ? "Enter new Discord connection link"
                              : "Paste Discord connection link"
                          }
                          error={
                            credentials.discord_webhook &&
                            !isValidDiscordWebhook(
                              credentials.discord_webhook,
                            )
                              ? "This doesn't look like a Discord connection link"
                              : undefined
                          }
                          hint="In Discord, copy a channel connection link. Skip this if you do not already use Discord alerts."
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Microsoft Teams */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Microsoft Teams Notifications
                    <HelpIcon
                      text="Get job alerts in a Teams channel. Create a channel connection link in Teams, then paste it here."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="users" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Teams
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Teams alerts"
                          checked={config.alerts.teams?.enabled ?? false}
                          onChange={(e) =>
                            handleWebhookAlertToggle(
                              "teams",
                              "Teams",
                              "teams_webhook",
                              credentials.teams_webhook,
                              isValidTeamsWebhook,
                              e.target.checked,
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {(config.alerts.teams?.enabled ||
                      !credentialStatus.teams_webhook ||
                      credentials.teams_webhook) && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            Connection link
                          </span>
                          <SecurityBadge
                            stored={credentialStatus.teams_webhook}
                          />
                        </div>
                        <Input
                          type="password"
                          value={credentials.teams_webhook}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              teams_webhook: e.target.value,
                            }))
                          }
                          placeholder={
                            credentialStatus.teams_webhook
                              ? "Enter new Teams connection link"
                              : "Paste Teams connection link"
                          }
                          error={
                            credentials.teams_webhook &&
                            !isValidTeamsWebhook(credentials.teams_webhook)
                              ? "This doesn't look like a Teams connection link"
                              : undefined
                          }
                          autoComplete="off"
                          hint="In Teams, copy a channel connection link. Skip this if you do not already use Teams alerts."
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Telegram */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Telegram Notifications
                    <Badge variant="surface" size="sm">Optional chat alert</Badge>
                    <HelpIcon
                      text="Use desktop or email alerts unless Telegram is already part of your alert routine."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                      Use desktop or email alerts unless Telegram is already
                      part of your alert routine. Telegram needs two details
                      from Telegram before it can receive JobSentinel alerts.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="send" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Telegram
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Telegram alerts"
                          checked={config.alerts.telegram?.enabled ?? false}
                          onChange={(e) =>
                            handleTelegramAlertToggle(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {(config.alerts.telegram?.enabled ||
                      Boolean(credentials.telegram_bot_token) ||
                      (credentialStatus.telegram_bot_token &&
                        Boolean((config.alerts.telegram?.chat_id ?? "").trim()))) && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg">
                          <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                            Optional Telegram alert setup
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            Continue only if you already use Telegram for phone
                            alerts or want a private job-alert chat.
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-surface-600 dark:text-surface-400">
                              Telegram setup code
                            </span>
                            <SecurityBadge
                              stored={credentialStatus.telegram_bot_token}
                            />
                          </div>
                          <Input
                            type="password"
                            value={credentials.telegram_bot_token}
                            onChange={(e) =>
                              setCredentials((prev) => ({
                                ...prev,
                                telegram_bot_token: e.target.value,
                              }))
                            }
                            placeholder={
                              credentialStatus.telegram_bot_token
                                ? "Enter new Telegram setup code"
                                : "Paste Telegram setup code"
                            }
                            hint="Use Telegram's own setup flow first, then paste the code it shows."
                          />
                        </div>
                        <div>
                          <span className="text-sm text-surface-600 dark:text-surface-400 mb-1 block">
                            Telegram destination
                          </span>
                          <Input
                            placeholder="Detail shown by Telegram"
                            value={config.alerts.telegram?.chat_id ?? ""}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  telegram: {
                                    ...config.alerts.telegram,
                                    enabled: true,
                                    chat_id: e.target.value,
                                  },
                                },
                              })
                            }
                            hint="Paste the destination Telegram shows for where alerts should go."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </section>

              {/* Notification Preferences by Source */}
              <section className="mb-6">
                <NotificationPreferences />
              </section>

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
