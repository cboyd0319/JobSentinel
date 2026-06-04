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
  RefreshIcon,
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
import { searchLooksTechFocused } from "../utils/profiles";
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
import { SettingsJobSourcesSection } from "./SettingsJobSourcesSection";
import { SettingsPostingRiskSection } from "./SettingsPostingRiskSection";
import { SettingsResumeMatchingSection } from "./SettingsResumeMatchingSection";
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

  // Smart job board recommendations based on user preferences (memoized)
  const jobBoardRecommendations = useMemo(() => {
    const recommendations: {
      board: string;
      reason: string;
      enable: () => void;
    }[] = [];
    const keywords = [
      ...(config?.keywords_boost ?? []),
      ...(config?.title_allowlist ?? []),
    ].map((k) => k.toLowerCase());
    const allowRemote = config?.location_preferences?.allow_remote ?? false;
    const cities = config?.location_preferences?.cities ?? [];
    const isTechFocused = searchLooksTechFocused(keywords);
    const hasRemoteIntent = allowRemote || keywords.some((k) => k.includes("remote"));

    // Remote tech-focused boards
    if (isTechFocused && hasRemoteIntent) {
      if (!config?.remoteok?.enabled) {
        recommendations.push({
          board: "RemoteOK",
          reason: "Useful for remote tech roles",
          enable: () =>
            setConfig({
              ...config!,
              remoteok: {
                ...config?.remoteok,
                enabled: true,
                tags: config?.remoteok?.tags ?? [],
                limit: 50,
              },
            }),
        });
      }
      if (!config?.weworkremotely?.enabled) {
        recommendations.push({
          board: "WeWorkRemotely",
          reason: "Useful for remote tech and product roles",
          enable: () =>
            setConfig({
              ...config!,
              weworkremotely: {
                ...config?.weworkremotely,
                enabled: true,
                limit: 50,
              },
            }),
        });
      }
    }

    // Startup keywords
    if (
      keywords.some(
        (k) =>
          k.includes("startup") ||
          k.includes("early stage") ||
          k.includes("seed"),
      )
    ) {
      if (!config?.yc_startup?.enabled) {
        recommendations.push({
          board: "YC Startups",
          reason: "You're interested in startups",
          enable: () =>
            setConfig({
              ...config!,
              yc_startup: {
                ...config?.yc_startup,
                enabled: true,
                remote_only: false,
                limit: 50,
              },
            }),
        });
      }
    }

    // Software/product/data/security keywords
    if (isTechFocused) {
      if (!config?.hn_hiring?.enabled) {
        recommendations.push({
          board: "Startup and tech job posts",
          reason: "Active monthly startup and tech hiring posts",
          enable: () =>
            setConfig({
              ...config!,
              hn_hiring: {
                ...config?.hn_hiring,
                enabled: true,
                remote_only: false,
                limit: 50,
              },
            }),
        });
      }
      if (!config?.dice?.enabled) {
        recommendations.push({
          board: "Dice",
          reason: "Technology roles",
          enable: () =>
            setConfig({
              ...config!,
              dice: { ...config?.dice, enabled: true, query: "", limit: 50 },
            }),
        });
      }
    }

    // Government/Federal keywords
    if (
      keywords.some(
        (k) =>
          k.includes("federal") ||
          k.includes("government") ||
          k.includes("clearance") ||
          k.includes("public sector"),
      )
    ) {
      if (!config?.usajobs?.enabled) {
        recommendations.push({
          board: "USAJobs",
          reason: "You're interested in government roles",
          enable: () =>
            setConfig({
              ...config!,
              usajobs: {
                ...config?.usajobs,
                enabled: true,
                email: config?.usajobs?.email ?? "",
                remote_only: false,
                date_posted_days: 30,
                limit: 100,
              },
            }),
        });
      }
    }

    // If they have US cities and a tech-focused search, suggest BuiltIn
    if (
      isTechFocused &&
      cities.some(
        (c) =>
          c.toLowerCase().includes("san francisco") ||
          c.toLowerCase().includes("new york") ||
          c.toLowerCase().includes("austin") ||
          c.toLowerCase().includes("seattle") ||
          c.toLowerCase().includes("chicago"),
      )
    ) {
      if (!config?.builtin?.enabled) {
        recommendations.push({
          board: "BuiltIn",
          reason: "Tech and startup jobs near " + cities[0],
          enable: () =>
            setConfig({
              ...config!,
              builtin: {
                ...config?.builtin,
                enabled: true,
                cities: config?.builtin?.cities ?? [],
                limit: 50,
              },
            }),
        });
      }
    }

    return recommendations.slice(0, 3); // Show max 3 recommendations
  }, [config]);

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
              {/* Job Titles */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Job Titles You Want
                  <HelpIcon text="Jobs with these titles will appear in your feed. Add titles like 'Marketing Manager' or 'SEO Specialist'." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a job title..."
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTitle();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddTitle}
                    disabled={!titleInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.title_allowlist.map((title) => (
                    <Badge
                      key={title}
                      variant="sentinel"
                      removable
                      onRemove={() => handleRemoveTitle(title)}
                    >
                      {title}
                    </Badge>
                  ))}
                  {config.title_allowlist.length === 0 && (
                    <p className="text-sm text-surface-400">
                      No job titles added
                    </p>
                  )}
                </div>
              </section>

              {/* Blocked Job Titles */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Job Titles to Avoid
                  <HelpIcon text="Jobs with these titles will be filtered out. Use this for titles like 'Intern' or 'Entry Level' if you're looking for senior roles." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a title to block..."
                    value={blockedTitleInput}
                    onChange={(e) => setBlockedTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBlockedTitle();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddBlockedTitle}
                    disabled={!blockedTitleInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.title_blocklist.map((title) => (
                    <Badge
                      key={title}
                      variant="danger"
                      removable
                      onRemove={() => handleRemoveBlockedTitle(title)}
                    >
                      {title}
                    </Badge>
                  ))}
                  {config.title_blocklist.length === 0 && (
                    <p className="text-sm text-surface-400">
                      No blocked titles
                    </p>
                  )}
                </div>
              </section>

              {/* Skills */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Your Skills
                  <HelpIcon text="Jobs that mention these skills will rank higher. Add skills from your resume like 'Project Management', 'Customer Service', or 'Scheduling'." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddSkill}
                    disabled={!skillInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.keywords_boost.map((skill) => (
                    <Badge
                      key={skill}
                      variant="alert"
                      removable
                      onRemove={() => handleRemoveSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                  {config.keywords_boost.length === 0 && (
                    <p className="text-sm text-surface-400">No skills added</p>
                  )}
                </div>
              </section>

              {/* Search words to avoid */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Search Words to Avoid
                  <HelpIcon text="Jobs mentioning these words will rank lower. Use this for work you do not want, like 'Sales' or 'Travel Required'." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a word or phrase to avoid..."
                    value={excludeKeywordInput}
                    onChange={(e) => setExcludeKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExcludeKeyword();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddExcludeKeyword}
                    disabled={!excludeKeywordInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.keywords_exclude.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="danger"
                      removable
                      onRemove={() => handleRemoveExcludeKeyword(keyword)}
                    >
                      {keyword}
                    </Badge>
                  ))}
                  {config.keywords_exclude.length === 0 && (
                    <p className="text-sm text-surface-400">
                      No search words to avoid
                    </p>
                  )}
                </div>
              </section>

              {/* Location */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Where You Want to Work
                  <HelpIcon text="Choose your work style preferences. If you select hybrid or on-site, you can add specific cities." />
                </h3>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location_preferences.allow_remote}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          location_preferences: {
                            ...config.location_preferences,
                            allow_remote: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-surface-700 dark:text-surface-300">
                      Remote
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location_preferences.allow_hybrid}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          location_preferences: {
                            ...config.location_preferences,
                            allow_hybrid: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-surface-700 dark:text-surface-300">
                      Hybrid
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location_preferences.allow_onsite}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          location_preferences: {
                            ...config.location_preferences,
                            allow_onsite: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-surface-700 dark:text-surface-300">
                      On-site
                    </span>
                  </label>
                </div>

                {(config.location_preferences.allow_hybrid ||
                  config.location_preferences.allow_onsite) && (
                  <>
                    {/* Detected location indicator */}
                    {detectedLocation && (
                      <div className="mb-3 p-3 bg-sentinel-50 dark:bg-sentinel-950 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                              />
                            </svg>
                            <span className="text-sm text-sentinel-700 dark:text-sentinel-300">
                              Detected:{" "}
                              <strong>
                                {detectedLocation.city},{" "}
                                {detectedLocation.region}
                              </strong>
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const locationStr = `${detectedLocation.city}, ${detectedLocation.region}`;
                              if (
                                !config.location_preferences.cities.includes(
                                  locationStr,
                                )
                              ) {
                                setConfig({
                                  ...config,
                                  location_preferences: {
                                    ...config.location_preferences,
                                    cities: [
                                      ...config.location_preferences.cities,
                                      locationStr,
                                    ],
                                  },
                                });
                                toast.success(
                                  "Location added",
                                  `Added ${locationStr}`,
                                );
                              }
                            }}
                            disabled={config.location_preferences.cities.includes(
                              `${detectedLocation.city}, ${detectedLocation.region}`,
                            )}
                          >
                            {config.location_preferences.cities.includes(
                              `${detectedLocation.city}, ${detectedLocation.region}`,
                            )
                              ? "Added"
                              : "Use This"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {!detectedLocation && (
                      <div className="mb-3 p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleDetectLocation}
                            loading={isDetectingLocation}
                            loadingText="Detecting..."
                            aria-describedby="settings-location-detection-privacy"
                            icon={
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                />
                              </svg>
                            }
                          >
                            Detect location
                          </Button>
                        </div>
                        <p
                        id="settings-location-detection-privacy"
                        className="mt-2 text-xs text-surface-500 dark:text-surface-400"
                      >
                          Only when you use this button, JobSentinel asks an outside
                          location lookup service for your approximate city
                          from your internet address. Nothing is saved unless
                          you add the city.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Add a city..."
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCity();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddCity}
                        disabled={!cityInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.location_preferences.cities.map((city) => (
                        <Badge
                          key={city}
                          variant="surface"
                          removable
                          onRemove={() => handleRemoveCity(city)}
                        >
                          {city}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Salary */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Salary Preferences
                  <HelpIcon text="Set your minimum and target salary. Job matches show whether listed pay is close to your target." />
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Minimum Acceptable Salary
                    </label>
                    <Input
                      type="number"
                      value={config.salary_floor_usd || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          salary_floor_usd: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="e.g., 60000"
                      hint="The lowest salary you'd consider"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Target Salary
                    </label>
                    <Input
                      type="number"
                      value={config.salary_target_usd || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          salary_target_usd:
                            parseInt(e.target.value) || undefined,
                        })
                      }
                      placeholder="e.g., 100000"
                      hint="Your ideal salary - jobs at or above this show stronger pay fit"
                    />
                  </div>
                </div>
              </section>

              {/* Company Preferences */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Company Preferences
                  <HelpIcon text="Add companies you love (they'll rank higher) or companies you want to avoid (they'll rank lower)." />
                </h3>
                <div className="space-y-4">
                  {/* Preferred Companies */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Preferred Companies
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add a company you'd love to work for..."
                        value={whitelistCompanyInput}
                        onChange={(e) =>
                          setWhitelistCompanyInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddWhitelistCompany();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddWhitelistCompany}
                        disabled={!whitelistCompanyInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.company_whitelist?.map((company) => (
                        <Badge
                          key={company}
                          variant="sentinel"
                          removable
                          onRemove={() => handleRemoveWhitelistCompany(company)}
                        >
                          {company}
                        </Badge>
                      ))}
                      {(!config.company_whitelist ||
                        config.company_whitelist.length === 0) && (
                        <p className="text-sm text-surface-400">
                          No preferred companies
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Blocked Companies */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Companies to Avoid
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add a company you don't want to see..."
                        value={blacklistCompanyInput}
                        onChange={(e) =>
                          setBlacklistCompanyInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBlacklistCompany();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddBlacklistCompany}
                        disabled={!blacklistCompanyInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.company_blacklist?.map((company) => (
                        <Badge
                          key={company}
                          variant="danger"
                          removable
                          onRemove={() => handleRemoveBlacklistCompany(company)}
                        >
                          {company}
                        </Badge>
                      ))}
                      {(!config.company_blacklist ||
                        config.company_blacklist.length === 0) && (
                        <p className="text-sm text-surface-400">
                          No blocked companies
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Auto-Refresh */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Auto-Search
                  <HelpIcon text="Turn this on to check for new postings while JobSentinel is open." />
                </h3>
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RefreshIcon className="w-5 h-5 text-sentinel-500" />
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        Check selected job sites on schedule
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.auto_refresh?.enabled ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            auto_refresh: {
                              ...config.auto_refresh,
                              enabled: e.target.checked,
                              interval_minutes:
                                config.auto_refresh?.interval_minutes ?? 30,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                    </label>
                  </div>

                  {config.auto_refresh?.enabled && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-surface-700 dark:text-surface-300">
                          Refresh every:
                        </label>
                        <select
                          value={config.auto_refresh?.interval_minutes ?? 30}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              auto_refresh: {
                                ...config.auto_refresh,
                                enabled: true,
                                interval_minutes: parseInt(e.target.value),
                              },
                            })
                          }
                          className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                        >
                          <option value="5">5 minutes</option>
                          <option value="10">10 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="120">2 hours</option>
                        </select>
                      </div>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        JobSentinel checks for new jobs at this interval while
                        the app is open.
                      </p>
                    </div>
                  )}
                </div>
              </section>
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
