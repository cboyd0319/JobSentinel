import { useState, useEffect, useCallback, memo } from "react";
import { Card } from "../../../ui/Card";
import { Badge } from "../../../ui/Badge";
import { HelpIcon } from "../../../ui/HelpIcon";
import { AdvancedFiltersSection } from "./NotificationAdvancedFilters";
import { useToast } from "../../../shared/toast/useToast";
import {
  type SourceNotificationConfig,
  type AdvancedFilters,
  type NotificationPreferences as NotificationPreferencesType,
  DEFAULT_PREFERENCES,
  loadNotificationPreferencesAsync,
  saveNotificationPreferencesAsync,
} from "./notificationPreferencesStore";

// Type for source keys only (excluding global and advancedFilters)
type AlertSourceKey = "indeed" | "greenhouse" | "lever" | "jobswithgpt";

const SOURCE_INFO: Record<
  AlertSourceKey,
  { name: string; color: string; icon: string }
> = {
  indeed: { name: "Indeed", color: "#2557A7", icon: "I" },
  greenhouse: { name: "Greenhouse", color: "#3AB549", icon: "G" },
  lever: { name: "Lever", color: "#6B46C1", icon: "L" },
  jobswithgpt: { name: "Connected job source", color: "#10A37F", icon: "J" },
};

type AlertPickyLabel = {
  label: string;
  variant: "success" | "alert" | "surface";
};

function getAlertPickyLabel(value: number): AlertPickyLabel {
  if (value >= 80) return { label: "Very picky", variant: "success" };
  if (value >= 65) return { label: "Picky", variant: "success" };
  if (value >= 45) return { label: "Balanced", variant: "alert" };
  return { label: "More alerts", variant: "surface" };
}

interface SourceConfigRowProps {
  sourceKey: AlertSourceKey;
  config: SourceNotificationConfig;
  onChange: (config: SourceNotificationConfig) => void;
}

const SourceConfigRow = memo(function SourceConfigRow({
  sourceKey,
  config,
  onChange,
}: SourceConfigRowProps) {
  const info = SOURCE_INFO[sourceKey] || {
    name: sourceKey,
    color: "#666",
    icon: "?",
  };
  const alertPickyLabel = getAlertPickyLabel(config.minScoreThreshold);

  return (
    <div className="grid gap-3 py-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      {/* Source icon and name */}
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: info.color }}
        >
          {info.icon}
        </div>
        <span className="min-w-0 break-words font-medium text-surface-800 dark:text-surface-200">
          {info.name}
        </span>
      </div>

      {/* Enable toggle */}
      <label className="relative inline-flex items-center cursor-pointer justify-self-start sm:justify-self-end">
        <input
          type="checkbox"
          aria-label={`Turn ${info.name} alerts on or off`}
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
      </label>

      {/* Alert filtering slider */}
      <div className="min-w-0 sm:col-span-2 flex flex-col gap-2">
        <label className="text-sm text-surface-600 dark:text-surface-400 flex items-center gap-1">
          How picky alerts are:
          <HelpIcon
            text="Higher means fewer alerts. Lower means more alerts."
            size="sm"
          />
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={config.minScoreThreshold}
            onChange={(e) =>
              onChange({
                ...config,
                minScoreThreshold: parseInt(e.target.value),
              })
            }
            disabled={!config.enabled}
            aria-label={`How picky ${info.name} alerts are`}
            className="min-w-28 flex-1 h-2 bg-surface-200 dark:bg-surface-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
          <Badge variant={alertPickyLabel.variant} className="shrink-0">
            {alertPickyLabel.label}
          </Badge>
        </div>
      </div>

      {/* Sound toggle - larger touch target for mobile */}
      <label className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors justify-self-start sm:justify-self-end">
        <input
          type="checkbox"
          aria-label={`Turn ${info.name} alert sound on or off`}
          checked={config.soundEnabled}
          onChange={(e) =>
            onChange({ ...config, soundEnabled: e.target.checked })
          }
          disabled={!config.enabled}
          className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500 disabled:opacity-50"
        />
        <SoundIcon
          className={`w-5 h-5 ${config.enabled ? "text-surface-500" : "text-surface-300"}`}
        />
      </label>
    </div>
  );
});

export const NotificationPreferences = memo(function NotificationPreferences() {
  const [prefs, setPrefs] =
    useState<NotificationPreferencesType>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();

  // Load preferences from backend on mount
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const loaded = await loadNotificationPreferencesAsync();
      setPrefs(loaded);
    } catch {
      // Error logged by safeInvoke in loadNotificationPreferencesAsync
      setLoadError(
        "Could not load alert rules. Your saved choices were not changed.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePrefs = useCallback(
    async (updated: NotificationPreferencesType) => {
      // Optimistic update - apply changes immediately
      const previousPrefs = prefs;
      setPrefs(updated);

      const success = await saveNotificationPreferencesAsync(updated);
      if (success) {
        setHasChanges(true);
        setTimeout(() => setHasChanges(false), 2000);
      } else {
        // Rollback on failure
        setPrefs(previousPrefs);
        toast.error(
          "Could not save alert settings",
          "Your last change was undone. Try again, or copy a safe support report if this keeps happening.",
        );
      }
    },
    [prefs, toast],
  );

  const handleSourceChange = useCallback(
    (sourceKey: AlertSourceKey, config: SourceNotificationConfig) => {
      const updated = { ...prefs, [sourceKey]: config };
      savePrefs(updated);
    },
    [prefs, savePrefs],
  );

  const handleGlobalChange = useCallback(
    (updates: Partial<NotificationPreferencesType["global"]>) => {
      const updated = { ...prefs, global: { ...prefs.global, ...updates } };
      savePrefs(updated);
    },
    [prefs, savePrefs],
  );

  const handleAdvancedFiltersChange = useCallback(
    (updates: Partial<AdvancedFilters>) => {
      const updated = {
        ...prefs,
        advancedFilters: { ...prefs.advancedFilters, ...updates },
      };
      savePrefs(updated);
    },
    [prefs, savePrefs],
  );

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center text-surface-500">
          Loading alert rules...
        </div>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-danger mb-3">{loadError}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
            Try again before changing alert rules.
          </p>
          <button
            onClick={loadPreferences}
            className="px-4 py-2 text-sm font-medium bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white flex items-center gap-2">
              Job Alert Rules
              <HelpIcon text="Choose when JobSentinel shows job alerts. You can keep all alerts on, set quiet hours, and narrow alerts by source, pay, title words, and company." />
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Use alerts for jobs worth checking. Quiet hours protect your time.
            </p>
          </div>
          {hasChanges && <Badge variant="success">Saved</Badge>}
        </div>
      </div>

      <div className="p-4">
        {/* Global toggle */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400" />
            </div>
            <div>
              <p className="font-medium text-surface-800 dark:text-surface-200">
                All job alerts
              </p>
              <p className="text-xs text-surface-500">
                Turn every job alert on or off
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              aria-label="All job alerts"
              checked={prefs.global.enabled}
              onChange={(e) =>
                handleGlobalChange({ enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
          </label>
        </div>

        {/* Quiet hours */}
        <div className="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MoonIcon className="w-4 h-4 text-surface-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Quiet Hours
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Quiet Hours"
                checked={prefs.global.quietHoursEnabled}
                onChange={(e) =>
                  handleGlobalChange({ quietHoursEnabled: e.target.checked })
                }
                disabled={!prefs.global.enabled}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500 peer-disabled:opacity-50"></div>
            </label>
          </div>
          {prefs.global.quietHoursEnabled && prefs.global.enabled && (
            <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
              <span className="text-surface-500">From</span>
              <input
                type="time"
                aria-label="Quiet hours start"
                value={prefs.global.quietHoursStart}
                onChange={(e) =>
                  handleGlobalChange({ quietHoursStart: e.target.value })
                }
                className="px-2 py-1 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
              />
              <span className="text-surface-500">to</span>
              <input
                type="time"
                aria-label="Quiet hours end"
                value={prefs.global.quietHoursEnd}
                onChange={(e) =>
                  handleGlobalChange({ quietHoursEnd: e.target.value })
                }
                className="px-2 py-1 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
              />
            </div>
          )}
        </div>

        {/* Per-source settings */}
        <div
          className={
            prefs.global.enabled ? "" : "opacity-50 pointer-events-none"
          }
        >
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-3 uppercase tracking-wide">
            Alert sources
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
            Choose which job sources can send alerts. Only sources shown here
            have separate alert rules. Other job boards that are turned on use
            the main alert switch; turn a board off in Additional Job Boards to
            stop those alerts.
          </p>
          {(Object.keys(SOURCE_INFO) as AlertSourceKey[]).map((sourceKey) => (
            <SourceConfigRow
              key={sourceKey}
              sourceKey={sourceKey}
              config={prefs[sourceKey]}
              onChange={(config) => handleSourceChange(sourceKey, config)}
            />
          ))}
        </div>

        {/* Advanced Filters */}
        <AdvancedFiltersSection
          filters={prefs.advancedFilters}
          onChange={handleAdvancedFiltersChange}
          disabled={!prefs.global.enabled}
        />
      </div>
    </Card>
  );
});

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function SoundIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}
