import { useState, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface SourceNotificationConfig {
  enabled: boolean;
  minScoreThreshold: number; // 0-100
  soundEnabled: boolean;
}

export interface NotificationPreferences {
  linkedin: SourceNotificationConfig;
  indeed: SourceNotificationConfig;
  greenhouse: SourceNotificationConfig;
  lever: SourceNotificationConfig;
  jobswithgpt: SourceNotificationConfig;
  global: {
    enabled: boolean;
    quietHoursStart: string; // HH:MM format
    quietHoursEnd: string;
    quietHoursEnabled: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
  indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
  greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
  global: {
    enabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursEnabled: false,
  },
};

const STORAGE_KEY = 'jobsentinel_notification_preferences';

const SOURCE_INFO: Record<string, { name: string; color: string; icon: string }> = {
  linkedin: { name: 'LinkedIn', color: '#0077B5', icon: 'in' },
  indeed: { name: 'Indeed', color: '#2164F3', icon: 'i' },
  greenhouse: { name: 'Greenhouse', color: '#3AB549', icon: 'G' },
  lever: { name: 'Lever', color: '#6B46C1', icon: 'L' },
  jobswithgpt: { name: 'JobsWithGPT', color: '#10A37F', icon: 'J' },
};

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load notification preferences:', e);
  }
  return DEFAULT_PREFERENCES;
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save notification preferences:', e);
  }
}

export function shouldNotifyForJob(
  source: string,
  score: number,
  prefs: NotificationPreferences
): boolean {
  // Check global enable
  if (!prefs.global.enabled) return false;

  // Check quiet hours
  if (prefs.global.quietHoursEnabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = prefs.global.quietHoursStart;
    const end = prefs.global.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  // Check source-specific settings
  const sourceKey = source.toLowerCase().replace(/\s+/g, '') as keyof Omit<NotificationPreferences, 'global'>;
  const sourceConfig = prefs[sourceKey];

  if (!sourceConfig) {
    // Unknown source, use default threshold
    return score >= 70;
  }

  if (!sourceConfig.enabled) return false;

  // Score is 0-1, threshold is 0-100
  const scorePercent = score * 100;
  return scorePercent >= sourceConfig.minScoreThreshold;
}

interface SourceConfigRowProps {
  sourceKey: string;
  config: SourceNotificationConfig;
  onChange: (config: SourceNotificationConfig) => void;
}

function SourceConfigRow({ sourceKey, config, onChange }: SourceConfigRowProps) {
  const info = SOURCE_INFO[sourceKey] || { name: sourceKey, color: '#666', icon: '?' };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0">
      {/* Source icon and name */}
      <div className="flex items-center gap-3 w-36">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: info.color }}
        >
          {info.icon}
        </div>
        <span className="font-medium text-surface-800 dark:text-surface-200">
          {info.name}
        </span>
      </div>

      {/* Enable toggle */}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sentinel-300 dark:peer-focus:ring-sentinel-800 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
      </label>

      {/* Score threshold */}
      <div className="flex items-center gap-2 flex-1">
        <label className="text-sm text-surface-600 dark:text-surface-400 whitespace-nowrap">
          Min score:
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={config.minScoreThreshold}
          onChange={(e) => onChange({ ...config, minScoreThreshold: parseInt(e.target.value) })}
          disabled={!config.enabled}
          className="flex-1 h-2 bg-surface-200 dark:bg-surface-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        />
        <Badge variant={config.minScoreThreshold >= 80 ? 'success' : config.minScoreThreshold >= 60 ? 'alert' : 'surface'}>
          {config.minScoreThreshold}%
        </Badge>
      </div>

      {/* Sound toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.soundEnabled}
          onChange={(e) => onChange({ ...config, soundEnabled: e.target.checked })}
          disabled={!config.enabled}
          className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500 disabled:opacity-50"
        />
        <SoundIcon className={`w-4 h-4 ${config.enabled ? 'text-surface-500' : 'text-surface-300'}`} />
      </label>
    </div>
  );
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPrefs(loadNotificationPreferences());
  }, []);

  const handleSourceChange = (sourceKey: string, config: SourceNotificationConfig) => {
    const updated = { ...prefs, [sourceKey]: config };
    setPrefs(updated);
    saveNotificationPreferences(updated);
    setHasChanges(true);
    setTimeout(() => setHasChanges(false), 2000);
  };

  const handleGlobalChange = (updates: Partial<NotificationPreferences['global']>) => {
    const updated = { ...prefs, global: { ...prefs.global, ...updates } };
    setPrefs(updated);
    saveNotificationPreferences(updated);
    setHasChanges(true);
    setTimeout(() => setHasChanges(false), 2000);
  };

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white">
              Notification Preferences
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Control alerts for each job source
            </p>
          </div>
          {hasChanges && (
            <Badge variant="success">Saved</Badge>
          )}
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
                All Notifications
              </p>
              <p className="text-xs text-surface-500">
                Master switch for all job alerts
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.global.enabled}
              onChange={(e) => handleGlobalChange({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sentinel-300 dark:peer-focus:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
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
                checked={prefs.global.quietHoursEnabled}
                onChange={(e) => handleGlobalChange({ quietHoursEnabled: e.target.checked })}
                disabled={!prefs.global.enabled}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sentinel-300 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500 peer-disabled:opacity-50"></div>
            </label>
          </div>
          {prefs.global.quietHoursEnabled && prefs.global.enabled && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-surface-500">From</span>
              <input
                type="time"
                value={prefs.global.quietHoursStart}
                onChange={(e) => handleGlobalChange({ quietHoursStart: e.target.value })}
                className="px-2 py-1 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
              />
              <span className="text-surface-500">to</span>
              <input
                type="time"
                value={prefs.global.quietHoursEnd}
                onChange={(e) => handleGlobalChange({ quietHoursEnd: e.target.value })}
                className="px-2 py-1 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
              />
            </div>
          )}
        </div>

        {/* Per-source settings */}
        <div className={prefs.global.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-3 uppercase tracking-wide">
            Per-Source Settings
          </p>
          {Object.keys(SOURCE_INFO).map((sourceKey) => (
            <SourceConfigRow
              key={sourceKey}
              sourceKey={sourceKey}
              config={prefs[sourceKey as keyof Omit<NotificationPreferences, 'global'>]}
              onChange={(config) => handleSourceChange(sourceKey, config)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function SoundIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}
