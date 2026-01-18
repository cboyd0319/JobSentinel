import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Badge, Card, ErrorLogPanel, NotificationPreferences, HelpIcon, ScraperHealthDashboard } from "../components";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { getUserFriendlyError } from "../utils/errorMessages";
import { exportConfigToJSON, importConfigFromJSON } from "../utils/export";

// Ghost detection configuration interface
interface GhostConfig {
  stale_threshold_days: number;
  repost_threshold: number;
  min_description_length: number;
  penalize_missing_salary: boolean;
  warning_threshold: number;
  hide_threshold: number;
}

interface SettingsProps {
  onClose: () => void;
}

// Config interface without sensitive credential fields (stored in OS keyring)
interface Config {
  title_allowlist: string[];
  title_blocklist: string[];
  keywords_boost: string[];
  keywords_exclude: string[];
  location_preferences: {
    allow_remote: boolean;
    allow_hybrid: boolean;
    allow_onsite: boolean;
    cities: string[];
  };
  salary_floor_usd: number;
  auto_refresh: {
    enabled: boolean;
    interval_minutes: number;
  };
  alerts: {
    slack: {
      enabled: boolean;
      // webhook_url stored securely in keyring
    };
    email: {
      enabled: boolean;
      smtp_server: string;
      smtp_port: number;
      smtp_username: string;
      // smtp_password stored securely in keyring
      from_email: string;
      to_emails: string[];
      use_starttls: boolean;
    };
  };
  linkedin: {
    enabled: boolean;
    // session_cookie stored securely in keyring
    query: string;
    location: string;
    remote_only: boolean;
    limit: number;
  };
  indeed: {
    enabled: boolean;
    query: string;
    location: string;
    radius: number;
    limit: number;
  };
}

// Credentials stored in OS keyring (macOS Keychain, Windows Credential Manager)
interface Credentials {
  slack_webhook: string;
  smtp_password: string;
  linkedin_cookie: string;
}

// Credential key names (must match backend CredentialKey enum)
type CredentialKey = "slack_webhook" | "smtp_password" | "linkedin_cookie";

// Helper to store a credential in secure storage
async function storeCredential(key: CredentialKey, value: string): Promise<void> {
  await invoke("store_credential", { key, value });
}

// Helper to retrieve a credential from secure storage
async function retrieveCredential(key: CredentialKey): Promise<string | null> {
  return await invoke<string | null>("retrieve_credential", { key });
}

// Helper to check if a credential exists
async function hasCredential(key: CredentialKey): Promise<boolean> {
  return await invoke<boolean>("has_credential", { key });
}

const isValidSlackWebhook = (url: string): boolean => {
  if (!url) return true;
  return url.startsWith("https://hooks.slack.com/services/");
};

const isValidEmail = (email: string): boolean => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({
    slack_webhook: "",
    smtp_password: "",
    linkedin_cookie: "",
  });
  const [credentialStatus, setCredentialStatus] = useState<Record<CredentialKey, boolean>>({
    slack_webhook: false,
    smtp_password: false,
    linkedin_cookie: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [ghostConfig, setGhostConfig] = useState<GhostConfig | null>(null);
  const [ghostConfigLoading, setGhostConfigLoading] = useState(false);
  const toast = useToast();

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);

      // Load config (non-sensitive settings)
      const configData = await invoke<Config>("get_config");
      setConfig(configData);

      // Check which credentials exist in secure storage (don't load actual values)
      const [hasSlack, hasSmtp, hasLinkedIn] = await Promise.all([
        hasCredential("slack_webhook"),
        hasCredential("smtp_password"),
        hasCredential("linkedin_cookie"),
      ]);

      setCredentialStatus({
        slack_webhook: hasSlack,
        smtp_password: hasSmtp,
        linkedin_cookie: hasLinkedIn,
      });

    } catch (error) {
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
    } catch (error) {
      logError("Failed to load ghost config:", error);
      // Use default values if loading fails
      setGhostConfig({
        stale_threshold_days: 60,
        repost_threshold: 3,
        min_description_length: 200,
        penalize_missing_salary: false,
        warning_threshold: 0.3,
        hide_threshold: 0.7,
      });
    } finally {
      setGhostConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadGhostConfig();
  }, [loadConfig, loadGhostConfig]);

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);

      // Save credentials to secure storage (only if user entered new values)
      const credentialSaves: Promise<void>[] = [];

      if (credentials.slack_webhook) {
        credentialSaves.push(storeCredential("slack_webhook", credentials.slack_webhook));
      }
      if (credentials.smtp_password) {
        credentialSaves.push(storeCredential("smtp_password", credentials.smtp_password));
      }
      if (credentials.linkedin_cookie) {
        credentialSaves.push(storeCredential("linkedin_cookie", credentials.linkedin_cookie));
      }

      // Save credentials and config in parallel
      await Promise.all([
        ...credentialSaves,
        invoke("save_config", { config }),
      ]);

      toast.success("Settings saved!", "Credentials stored securely in your system keychain");
      onClose();
    } catch (error) {
      logError("Failed to save config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfig = () => {
    if (!config) return;
    try {
      exportConfigToJSON(config);
      toast.success("Config exported", "Sensitive data (passwords, tokens) excluded for security");
    } catch (error) {
      logError("Failed to export config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    }
  };

  const handleImportConfig = async () => {
    try {
      const imported = await importConfigFromJSON<Config>();
      if (!imported) {
        return; // User cancelled
      }

      // Credentials are stored in OS keyring, not in config file
      // So we just import the non-sensitive config settings
      setConfig(imported);
      toast.success("Config imported", "Review settings and click Save to apply. Note: Credentials must be re-entered (they are stored securely and not exported).");
    } catch (error) {
      logError("Failed to import config:", error);
      toast.error("Failed to import config", "The file may be corrupted or invalid");
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

  const handleSaveGhostConfig = async () => {
    if (!ghostConfig) return;

    try {
      setGhostConfigLoading(true);
      await invoke("set_ghost_config", { config: ghostConfig });
      toast.success("Ghost Detection Settings Saved", "Settings will apply to new job scans");
    } catch (error) {
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
      toast.success("Reset to Defaults", "Ghost detection settings have been reset");
    } catch (error) {
      logError("Failed to reset ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    }
  };

  if (loading || !config) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading settings">
            <div className="animate-spin w-8 h-8 border-4 border-sentinel-500 border-t-transparent rounded-full" aria-hidden="true" />
            <span className="sr-only">Loading settings...</span>
          </div>
        </Card>
      </div>
    );
  }

  const isValidFromEmail = isValidEmail(config.alerts.email?.from_email ?? "");
  const hasValidToEmails = (config.alerts.email?.to_emails ?? []).every(isValidEmail);

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
                <h2 id="settings-title" className="font-display text-display-lg text-surface-900 dark:text-white">Settings</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">Update your job search preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

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
              <Button onClick={handleAddTitle} disabled={!titleInput.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.title_allowlist.map((title) => (
                <Badge key={title} variant="sentinel" removable onRemove={() => handleRemoveTitle(title)}>
                  {title}
                </Badge>
              ))}
              {config.title_allowlist.length === 0 && (
                <p className="text-sm text-surface-400">No job titles added</p>
              )}
            </div>
          </section>

          {/* Skills */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Your Skills
              <HelpIcon text="Jobs that mention these skills will rank higher. Add skills from your resume like 'Python' or 'Project Management'." />
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
              <Button onClick={handleAddSkill} disabled={!skillInput.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.keywords_boost.map((skill) => (
                <Badge key={skill} variant="alert" removable onRemove={() => handleRemoveSkill(skill)}>
                  {skill}
                </Badge>
              ))}
              {config.keywords_boost.length === 0 && (
                <p className="text-sm text-surface-400">No skills added</p>
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
                  className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
                />
                <span className="text-surface-700 dark:text-surface-300">Remote</span>
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
                  className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
                />
                <span className="text-surface-700 dark:text-surface-300">Hybrid</span>
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
                  className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
                />
                <span className="text-surface-700 dark:text-surface-300">On-site</span>
              </label>
            </div>

            {(config.location_preferences.allow_hybrid || config.location_preferences.allow_onsite) && (
              <>
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
                  <Button onClick={handleAddCity} disabled={!cityInput.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.location_preferences.cities.map((city) => (
                    <Badge key={city} variant="surface" removable onRemove={() => handleRemoveCity(city)}>
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
              Minimum Salary
              <HelpIcon text="Jobs below this amount will still appear, but will be ranked lower in your results." />
            </h3>
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
              hint="Enter your minimum acceptable salary (before taxes)"
            />
          </section>

          {/* Auto-Refresh */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Auto-Search
              <HelpIcon text="Automatically check for new jobs while the app is open. Turn this on to never miss a new posting." />
            </h3>
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RefreshIcon className="w-5 h-5 text-sentinel-500" />
                  <span className="font-medium text-surface-800 dark:text-surface-200">Auto-scan job boards</span>
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
                          interval_minutes: config.auto_refresh?.interval_minutes ?? 30,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sentinel-300 dark:peer-focus:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                </label>
              </div>

              {config.auto_refresh?.enabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-surface-700 dark:text-surface-300">Refresh every:</label>
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
                      className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500"
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
                    JobSentinel will automatically scan for new jobs at this interval while the app is open.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Notifications */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Get Notified
              <HelpIcon text="Receive alerts when new jobs match your criteria. You can use Slack, email, or both." />
            </h3>

            {/* Slack */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                Slack Notifications
                <HelpIcon text="Get job alerts in a Slack channel. To set up: Go to your Slack workspace → Apps → Incoming Webhooks → Create New → Copy the webhook URL" position="right" />
                {credentialStatus.slack_webhook && (
                  <span className="text-xs text-green-600 dark:text-green-400">(Stored securely)</span>
                )}
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="password"
                    value={credentials.slack_webhook}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCredentials((prev) => ({ ...prev, slack_webhook: value }));
                      // Auto-enable Slack if valid webhook entered
                      if (value && isValidSlackWebhook(value)) {
                        setConfig({
                          ...config,
                          alerts: {
                            ...config.alerts,
                            slack: { enabled: true },
                          },
                        });
                      }
                    }}
                    placeholder={credentialStatus.slack_webhook ? "Enter new webhook to update" : "Paste your Slack webhook URL here"}
                    error={credentials.slack_webhook && !isValidSlackWebhook(credentials.slack_webhook) ? "This doesn't look like a valid Slack webhook URL" : undefined}
                    hint="Stored securely in your system keychain"
                  />
                </div>
                {(credentials.slack_webhook || credentialStatus.slack_webhook) && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        // Use new value if entered, otherwise test existing stored credential
                        const webhookUrl = credentials.slack_webhook || await retrieveCredential("slack_webhook");
                        if (!webhookUrl) {
                          toast.error("No webhook", "Please enter a Slack webhook URL first");
                          return;
                        }
                        await invoke("validate_slack_webhook", { webhookUrl });
                        toast.success("Test sent!", "Check your Slack channel");
                      } catch {
                        toast.error("Test failed", "Check that the webhook URL is correct and try again");
                      }
                    }}
                    className="whitespace-nowrap"
                  >
                    Test
                  </Button>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <EmailIcon className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-surface-800 dark:text-surface-200">Email Alerts</span>
                  <HelpIcon text="Receive job alerts via email. Requires an email account that allows sending (like Gmail with an App Password)." />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
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
                  <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sentinel-300 dark:peer-focus:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                </label>
              </div>

              {config.alerts.email?.enabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between -mt-1 mb-3">
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      For Gmail: use smtp.gmail.com, port 587, and create an App Password in your Google Account settings.
                    </p>
                    {config.alerts.email?.smtp_server &&
                      config.alerts.email?.smtp_username &&
                      (credentials.smtp_password || credentialStatus.smtp_password) &&
                      config.alerts.email?.from_email &&
                      isValidFromEmail &&
                      config.alerts.email?.to_emails?.length > 0 &&
                      hasValidToEmails && (
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            try {
                              // Use new password if entered, otherwise retrieve from keyring
                              const password = credentials.smtp_password || await retrieveCredential("smtp_password");
                              if (!password) {
                                toast.error("No password", "Please enter an SMTP password first");
                                return;
                              }
                              await invoke("test_email_notification", {
                                emailConfig: {
                                  smtp_server: config.alerts.email.smtp_server,
                                  smtp_port: config.alerts.email.smtp_port,
                                  smtp_username: config.alerts.email.smtp_username,
                                  smtp_password: password,
                                  from_email: config.alerts.email.from_email,
                                  to_emails: config.alerts.email.to_emails,
                                  use_starttls: config.alerts.email.use_starttls ?? true,
                                },
                              });
                              toast.success("Test sent!", "Check your email inbox");
                            } catch {
                              toast.error("Test failed", "Check your email settings and try again");
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          Test
                        </Button>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Email Server"
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
                      hint="Your email provider's sending server"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          label="Port"
                          type="number"
                          value={config.alerts.email?.smtp_port ?? 587}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  smtp_port: parseInt(e.target.value) || 587,
                                },
                              },
                            })
                          }
                          hint="Usually 587"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer" title="Enable secure connection (recommended)">
                          <input
                            type="checkbox"
                            checked={config.alerts.email?.use_starttls ?? true}
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
                            className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-700 dark:text-surface-300">Secure</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Your Email"
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
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">App Password</span>
                        {credentialStatus.smtp_password && (
                          <span className="text-xs text-green-600 dark:text-green-400">(Stored securely)</span>
                        )}
                      </div>
                      <Input
                        type="password"
                        value={credentials.smtp_password}
                        onChange={(e) => setCredentials((prev) => ({ ...prev, smtp_password: e.target.value }))}
                        placeholder={credentialStatus.smtp_password ? "Enter new password to update" : "Your app-specific password"}
                        hint="Stored securely in your system keychain"
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
                      hint="Usually same as 'Your Email'"
                      error={!isValidFromEmail ? "Please enter a valid email address" : undefined}
                    />
                    <Input
                      label="Send To"
                      value={config.alerts.email?.to_emails?.join(", ") ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          alerts: {
                            ...config.alerts,
                            email: {
                              ...config.alerts.email,
                              to_emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            },
                          },
                        })
                      }
                      placeholder="you@email.com"
                      hint="Where to receive alerts (can be the same email)"
                      error={!hasValidToEmails ? "Please enter a valid email address" : undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Notification Preferences by Source */}
          <section className="mb-6">
            <NotificationPreferences />
          </section>

          {/* Job Sources */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Additional Job Boards
              <HelpIcon text="JobSentinel searches many job boards automatically. Enable these for even more options (requires some setup)." />
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
              We automatically search Greenhouse, Lever, and other popular job boards. These are optional extras.
            </p>

            {/* LinkedIn */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LinkedInIcon className="w-5 h-5 text-[#0077B5]" />
                  <span className="font-medium text-surface-800 dark:text-surface-200">LinkedIn</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.linkedin?.enabled ?? false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        linkedin: {
                          ...config.linkedin,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sentinel-300 dark:peer-focus:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                </label>
              </div>

              {config.linkedin?.enabled && (
                <div className="space-y-3">
                  <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
                    LinkedIn requires your login cookie. Stored securely in your system keychain and never shared.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                      Login Cookie
                      <HelpIcon text="To get this: 1) Log into LinkedIn in Chrome, 2) Right-click → Inspect → Application → Cookies → linkedin.com, 3) Copy the 'li_at' value" position="right" />
                      {credentialStatus.linkedin_cookie && (
                        <span className="text-xs text-green-600 dark:text-green-400">(Stored securely)</span>
                      )}
                    </label>
                    <Input
                      type="password"
                      value={credentials.linkedin_cookie}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, linkedin_cookie: e.target.value }))}
                      placeholder={credentialStatus.linkedin_cookie ? "Enter new cookie to update" : "Paste your li_at cookie value here"}
                      hint="Stored securely in your system keychain"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Search Query"
                      value={config.linkedin?.query ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          linkedin: {
                            ...config.linkedin,
                            query: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., Security Engineer"
                    />
                    <Input
                      label="Location"
                      value={config.linkedin?.location ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          linkedin: {
                            ...config.linkedin,
                            location: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., United States"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.linkedin?.remote_only ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            linkedin: {
                              ...config.linkedin,
                              remote_only: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
                      />
                      <span className="text-sm text-surface-700 dark:text-surface-300">Remote only</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-surface-700 dark:text-surface-300">Max results:</label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={config.linkedin?.limit ?? 25}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            linkedin: {
                              ...config.linkedin,
                              limit: parseInt(e.target.value) || 25,
                            },
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Indeed */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IndeedIcon className="w-5 h-5 text-[#2164F3]" />
                  <span className="font-medium text-surface-800 dark:text-surface-200">Indeed</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.indeed?.enabled ?? false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        indeed: {
                          ...config.indeed,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sentinel-300 dark:peer-focus:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                </label>
              </div>

              {config.indeed?.enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Search Query"
                      value={config.indeed?.query ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          indeed: {
                            ...config.indeed,
                            query: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., Security Engineer"
                    />
                    <Input
                      label="Location"
                      value={config.indeed?.location ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          indeed: {
                            ...config.indeed,
                            location: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., Remote or San Francisco, CA"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-surface-700 dark:text-surface-300">Radius (miles):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.indeed?.radius ?? 25}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            indeed: {
                              ...config.indeed,
                              radius: parseInt(e.target.value) || 25,
                            },
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-surface-700 dark:text-surface-300">Max results:</label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={config.indeed?.limit ?? 25}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            indeed: {
                              ...config.indeed,
                              limit: parseInt(e.target.value) || 25,
                            },
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Ghost Detection Settings */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Ghost Detection Settings
              <HelpIcon text="Adjust how aggressively JobSentinel flags fake or stale job postings. Lower thresholds mean stricter detection." />
            </h3>
            {ghostConfig && (
              <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Stale Threshold (days)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={ghostConfig.stale_threshold_days}
                      onChange={(e) =>
                        setGhostConfig({
                          ...ghostConfig,
                          stale_threshold_days: parseInt(e.target.value) || 60,
                        })
                      }
                      hint="Jobs older than this are flagged as stale"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Repost Threshold
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={ghostConfig.repost_threshold}
                      onChange={(e) =>
                        setGhostConfig({
                          ...ghostConfig,
                          repost_threshold: parseInt(e.target.value) || 3,
                        })
                      }
                      hint="Flag jobs seen this many times or more"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Min Description Length (characters)
                  </label>
                  <Input
                    type="number"
                    min="50"
                    max="1000"
                    value={ghostConfig.min_description_length}
                    onChange={(e) =>
                      setGhostConfig({
                        ...ghostConfig,
                        min_description_length: parseInt(e.target.value) || 200,
                      })
                    }
                    hint="Jobs with shorter descriptions are flagged"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ghostConfig.penalize_missing_salary}
                        onChange={(e) =>
                          setGhostConfig({
                            ...ghostConfig,
                            penalize_missing_salary: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
                      />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        Flag jobs without salary info
                      </span>
                    </label>
                    <HelpIcon text="Many legitimate jobs don't list salary. Enable this for stricter detection." position="right" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Warning Threshold: {ghostConfig.warning_threshold.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ghostConfig.warning_threshold}
                      onChange={(e) =>
                        setGhostConfig({
                          ...ghostConfig,
                          warning_threshold: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-sentinel-500"
                    />
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      Jobs above this score show a warning indicator
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Hide Threshold: {ghostConfig.hide_threshold.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ghostConfig.hide_threshold}
                      onChange={(e) =>
                        setGhostConfig({
                          ...ghostConfig,
                          hide_threshold: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      Jobs above this score are hidden by default
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={handleResetGhostConfig}
                    loading={ghostConfigLoading}
                    className="flex-1"
                  >
                    Reset to Defaults
                  </Button>
                  <Button
                    onClick={handleSaveGhostConfig}
                    loading={ghostConfigLoading}
                    className="flex-1"
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            )}
            {!ghostConfig && (
              <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                <div className="flex items-center justify-center py-4" role="status" aria-label="Loading ghost config">
                  <div className="animate-spin w-6 h-6 border-4 border-sentinel-500 border-t-transparent rounded-full" aria-hidden="true" />
                  <span className="sr-only">Loading settings...</span>
                </div>
              </div>
            )}
          </section>

          {/* Job Scoring Weights */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Job Scoring Weights
              <HelpIcon text="These weights determine how jobs are scored. Higher scores mean better matches. Click on any job score to see the full breakdown." />
            </h3>
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 bg-surface-50 dark:bg-surface-900/20">
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                Each job is scored from 0-100% based on how well it matches your preferences. Click any job score to see a detailed breakdown.
              </p>
              <div className="space-y-3">
                {/* Skills */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <div>
                      <div className="text-sm font-medium text-surface-900 dark:text-white">Skills Match</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">Job title and keyword matches</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-surface-900 dark:text-white">40%</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">weight</div>
                  </div>
                </div>

                {/* Salary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <div>
                      <div className="text-sm font-medium text-surface-900 dark:text-white">Salary</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">Meets your salary requirements</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-surface-900 dark:text-white">25%</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">weight</div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    <div>
                      <div className="text-sm font-medium text-surface-900 dark:text-white">Location</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">Remote/hybrid/onsite preference</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-surface-900 dark:text-white">20%</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">weight</div>
                  </div>
                </div>

                {/* Company */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <div>
                      <div className="text-sm font-medium text-surface-900 dark:text-white">Company</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">Company preference (if configured)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-surface-900 dark:text-white">10%</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">weight</div>
                  </div>
                </div>

                {/* Recency */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    <div>
                      <div className="text-sm font-medium text-surface-900 dark:text-white">Recency</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">How fresh the posting is</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-surface-900 dark:text-white">5%</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">weight</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  💡 <strong>Tip:</strong> These weights are optimized for best results. Customize your preferences in the sections above to improve your job matches.
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="mb-6">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
              Troubleshooting
              <HelpIcon text="If something isn't working right, these logs can help diagnose the problem." />
            </h3>

            {/* Scraper Health Dashboard Button */}
            <div className="mb-4">
              <button
                onClick={() => setShowHealthDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors w-full justify-center"
              >
                <HealthIcon className="w-5 h-5 text-sentinel-500" />
                View Scraper Health Dashboard
              </button>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 text-center">
                Monitor scraper status, run smoke tests, and view run history
              </p>
            </div>

            <ErrorLogPanel />
          </section>

          {/* Backup & Restore */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleImportConfig}
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
              title="Restore settings from a backup file"
            >
              <ImportIcon className="w-4 h-4" />
              Restore Settings
            </button>
            <button
              onClick={handleExportConfig}
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
              title="Save your current settings to a backup file"
            >
              <ExportIcon className="w-4 h-4" />
              Backup Settings
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Scraper Health Dashboard Modal */}
      {showHealthDashboard && (
        <ScraperHealthDashboard onClose={() => setShowHealthDashboard(false)} />
      )}
    </div>
  );
}

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function IndeedIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.566 21.5633v-8.762c.2699.0237.5412.0356.8129.0356 1.6573 0 3.1939-.4812 4.4783-1.3045v10.0309c0 .8765-.4813 1.5643-1.0871 1.5643-.5344 0-1.087-.6878-1.087-1.5643v-3.6373c-1.0274.5936-2.1092.858-3.1171.6373zm1.0515-20.4946c-2.4136-.8768-5.0683-.2512-6.2971 1.6326-1.1932 1.8245-1.1932 4.9212.9475 6.6804.4813.2749 1.0871.4762 1.7046.6646.6175.1884 1.2469.3293 1.8773.4467.6292.1063 1.2469.1655 1.8527.1655.6175 0 1.2469-.0474 1.8644-.1655.6175-.1174 1.2469-.2584 1.8644-.4467.6175-.1884 1.2351-.3897 1.7164-.6646.2455-.1655.4929-.3778.7285-.6171.2455-.2393.4811-.4786.7049-.7298.4455-.5346.8176-1.1518 1.1041-1.8484.2811-.6878.4455-1.4452.4455-2.2498 0-1.613-.7285-3.0379-1.9337-4.0565-1.205-1.0068-2.8622-1.5179-4.5791-1.2114z"/>
    </svg>
  );
}

function EmailIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ImportIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ExportIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function HealthIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
