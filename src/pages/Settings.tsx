import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Badge, Card } from "../components";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";

interface SettingsProps {
  onClose: () => void;
}

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
  alerts: {
    slack: {
      enabled: boolean;
      webhook_url: string;
    };
  };
}

const isValidSlackWebhook = (url: string): boolean => {
  if (!url) return true;
  return url.startsWith("https://hooks.slack.com/services/");
};

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const toast = useToast();

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const configData = await invoke<Config>("get_config");
      setConfig(configData);
    } catch (error) {
      logError("Failed to load config:", error);
      toast.error("Failed to load settings", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await invoke("save_config", { config });
      toast.success("Settings saved!", "Your preferences have been updated");
      onClose();
    } catch (error) {
      logError("Failed to save config:", error);
      toast.error("Failed to save settings", getErrorMessage(error));
    } finally {
      setSaving(false);
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

  const isValidWebhook = isValidSlackWebhook(config.alerts.slack.webhook_url);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400" />
              </div>
              <div>
                <h2 className="font-display text-display-lg text-surface-900 dark:text-white">Settings</h2>
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
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">Job Titles</h3>
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
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">Skills</h3>
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
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">Work Location</h3>
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
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">Target Salary</h3>
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
              hint="Jobs below this salary will be ranked lower"
            />
          </section>

          {/* Notifications */}
          <section className="mb-8">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">Notifications</h3>
            <Input
              label="Slack Webhook URL"
              value={config.alerts.slack.webhook_url}
              onChange={(e) =>
                setConfig({
                  ...config,
                  alerts: {
                    slack: {
                      enabled: e.target.value.length > 0 && isValidSlackWebhook(e.target.value),
                      webhook_url: e.target.value,
                    },
                  },
                })
              }
              placeholder="https://hooks.slack.com/services/..."
              error={config.alerts.slack.webhook_url && !isValidWebhook ? "Invalid Slack webhook URL" : undefined}
              hint="Get notified when high-match jobs are found"
            />
          </section>

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
