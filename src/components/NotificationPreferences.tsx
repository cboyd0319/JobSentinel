import { useState } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { HelpIcon } from './HelpIcon';
import { CompanyAutocomplete } from './CompanyAutocomplete';
import { useToast } from '../contexts';

export interface SourceNotificationConfig {
  enabled: boolean;
  minScoreThreshold: number; // 0-100
  soundEnabled: boolean;
}

export interface AdvancedFilters {
  // Keyword filters
  includeKeywords: string[]; // Only notify if title contains any of these
  excludeKeywords: string[]; // Never notify if title contains any of these
  // Salary filter
  minSalary: number | null; // Only notify if salary >= this (in thousands)
  // Location filters
  remoteOnly: boolean;
  // Company filters
  companyWhitelist: string[]; // Favorite companies - only notify for these (empty = all)
  companyBlacklist: string[]; // Companies to skip - never notify for these
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
  // Advanced filters (v1.3)
  advancedFilters: AdvancedFilters;
}

const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  includeKeywords: [],
  excludeKeywords: [],
  minSalary: null,
  remoteOnly: false,
  companyWhitelist: [],
  companyBlacklist: [],
};

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
  advancedFilters: DEFAULT_ADVANCED_FILTERS,
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

export function saveNotificationPreferences(prefs: NotificationPreferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch (e) {
    console.warn('Failed to save notification preferences:', e);
    return false;
  }
}

// Type for source keys only (excluding global and advancedFilters)
type SourceKey = 'linkedin' | 'indeed' | 'greenhouse' | 'lever' | 'jobswithgpt';

// Extended job info for advanced filtering
export interface JobForNotification {
  title: string;
  company: string;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
  location?: string | null;
}

export function shouldNotifyForJob(
  source: string,
  score: number,
  prefs: NotificationPreferences,
  job?: JobForNotification
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
  const sourceKey = source.toLowerCase().replace(/\s+/g, '') as SourceKey;
  const sourceConfig = prefs[sourceKey];

  if (!sourceConfig) {
    // Unknown source, use default threshold
    return score >= 70;
  }

  if (!sourceConfig.enabled) return false;

  // Score is 0-1, threshold is 0-100
  const scorePercent = score * 100;
  if (scorePercent < sourceConfig.minScoreThreshold) return false;

  // Apply advanced filters if job info is provided
  if (job && prefs.advancedFilters) {
    const { advancedFilters } = prefs;
    const titleLower = job.title.toLowerCase();
    const companyLower = job.company.toLowerCase();

    // Include keywords filter (if set, title must contain at least one)
    if (advancedFilters.includeKeywords.length > 0) {
      const hasIncludeKeyword = advancedFilters.includeKeywords.some(
        keyword => titleLower.includes(keyword.toLowerCase())
      );
      if (!hasIncludeKeyword) return false;
    }

    // Exclude keywords filter (if title contains any, skip)
    if (advancedFilters.excludeKeywords.length > 0) {
      const hasExcludeKeyword = advancedFilters.excludeKeywords.some(
        keyword => titleLower.includes(keyword.toLowerCase())
      );
      if (hasExcludeKeyword) return false;
    }

    // Salary filter
    if (advancedFilters.minSalary !== null) {
      const minSalaryThreshold = advancedFilters.minSalary * 1000; // Convert from K to actual
      const jobMaxSalary = job.salary_max ?? job.salary_min ?? 0;
      if (jobMaxSalary > 0 && jobMaxSalary < minSalaryThreshold) return false;
    }

    // Remote-only filter
    if (advancedFilters.remoteOnly) {
      const isRemote = job.remote ||
        job.location?.toLowerCase().includes('remote') ||
        titleLower.includes('remote');
      if (!isRemote) return false;
    }

    // Favorite companies (if set, company must be in list)
    if (advancedFilters.companyWhitelist.length > 0) {
      const isFavorite = advancedFilters.companyWhitelist.some(
        company => companyLower.includes(company.toLowerCase())
      );
      if (!isFavorite) return false;
    }

    // Companies to skip (if company is in list, skip)
    if (advancedFilters.companyBlacklist.length > 0) {
      const shouldSkip = advancedFilters.companyBlacklist.some(
        company => companyLower.includes(company.toLowerCase())
      );
      if (shouldSkip) return false;
    }
  }

  return true;
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
        <label className="text-sm text-surface-600 dark:text-surface-400 whitespace-nowrap flex items-center gap-1">
          Quality:
          <HelpIcon text="Only alert for jobs above this match score. Higher = fewer but better matches." size="sm" />
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
  // Use lazy initialization to avoid setState in effect
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();

  const handleSourceChange = (sourceKey: string, config: SourceNotificationConfig) => {
    const updated = { ...prefs, [sourceKey]: config };
    setPrefs(updated);
    if (saveNotificationPreferences(updated)) {
      setHasChanges(true);
      setTimeout(() => setHasChanges(false), 2000);
    } else {
      toast.error('Failed to save', 'Changes may be lost when you close the app');
    }
  };

  const handleGlobalChange = (updates: Partial<NotificationPreferences['global']>) => {
    const updated = { ...prefs, global: { ...prefs.global, ...updates } };
    setPrefs(updated);
    if (saveNotificationPreferences(updated)) {
      setHasChanges(true);
      setTimeout(() => setHasChanges(false), 2000);
    } else {
      toast.error('Failed to save', 'Changes may be lost when you close the app');
    }
  };

  const handleAdvancedFiltersChange = (updates: Partial<AdvancedFilters>) => {
    const updated = {
      ...prefs,
      advancedFilters: { ...prefs.advancedFilters, ...updates }
    };
    setPrefs(updated);
    if (saveNotificationPreferences(updated)) {
      setHasChanges(true);
      setTimeout(() => setHasChanges(false), 2000);
    } else {
      toast.error('Failed to save', 'Changes may be lost when you close the app');
    }
  };

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white flex items-center gap-2">
              Which Jobs Alert You
              <HelpIcon text="Control which jobs trigger notifications. You can set different rules for each job board and filter by salary, keywords, and more." />
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Fine-tune when you get notified about new jobs
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
              config={prefs[sourceKey as SourceKey]}
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
}

// Advanced Filters Section Component
interface AdvancedFiltersSectionProps {
  filters: AdvancedFilters;
  onChange: (updates: Partial<AdvancedFilters>) => void;
  disabled?: boolean;
}

function AdvancedFiltersSection({ filters, onChange, disabled }: AdvancedFiltersSectionProps) {
  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [favoriteCompanyInput, setFavoriteCompanyInput] = useState('');
  const [skipCompanyInput, setSkipCompanyInput] = useState('');

  const addKeyword = (type: 'include' | 'exclude', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (type === 'include') {
      if (!filters.includeKeywords.includes(trimmed)) {
        onChange({ includeKeywords: [...filters.includeKeywords, trimmed] });
      }
      setIncludeInput('');
    } else {
      if (!filters.excludeKeywords.includes(trimmed)) {
        onChange({ excludeKeywords: [...filters.excludeKeywords, trimmed] });
      }
      setExcludeInput('');
    }
  };

  const removeKeyword = (type: 'include' | 'exclude', value: string) => {
    if (type === 'include') {
      onChange({ includeKeywords: filters.includeKeywords.filter(k => k !== value) });
    } else {
      onChange({ excludeKeywords: filters.excludeKeywords.filter(k => k !== value) });
    }
  };

  const addFavoriteCompany = (company: string) => {
    const trimmed = company.trim();
    if (!trimmed) return;
    if (!filters.companyWhitelist.includes(trimmed)) {
      onChange({ companyWhitelist: [...filters.companyWhitelist, trimmed] });
    }
  };

  const addSkipCompany = (company: string) => {
    const trimmed = company.trim();
    if (!trimmed) return;
    if (!filters.companyBlacklist.includes(trimmed)) {
      onChange({ companyBlacklist: [...filters.companyBlacklist, trimmed] });
    }
  };

  const removeCompany = (type: 'favorite' | 'skip', value: string) => {
    if (type === 'favorite') {
      onChange({ companyWhitelist: filters.companyWhitelist.filter(c => c !== value) });
    } else {
      onChange({ companyBlacklist: filters.companyBlacklist.filter(c => c !== value) });
    }
  };

  return (
    <div className={`mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <FilterIcon className="w-4 h-4 text-surface-500" />
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide flex items-center gap-1">
          Extra Filters
          <HelpIcon text="Additional rules to customize which jobs you get notified about. All of these are optional." size="sm" />
        </p>
      </div>

      {/* Keyword Filters */}
      <div className="space-y-3 mb-4">
        {/* Include Keywords */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Only notify if title contains
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={includeInput}
              onChange={(e) => setIncludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword('include', includeInput)}
              placeholder="e.g., Senior, Lead, Staff"
              className="flex-1 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
            />
            <button
              onClick={() => addKeyword('include', includeInput)}
              className="px-3 py-1.5 text-sm bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600 transition-colors"
            >
              Add
            </button>
          </div>
          {filters.includeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.includeKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword('include', keyword)}
                    className="hover:text-green-900 dark:hover:text-green-300"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Exclude Keywords */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Never notify if title contains
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword('exclude', excludeInput)}
              placeholder="e.g., Junior, Intern, Contract"
              className="flex-1 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
            />
            <button
              onClick={() => addKeyword('exclude', excludeInput)}
              className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Add
            </button>
          </div>
          {filters.excludeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.excludeKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword('exclude', keyword)}
                    className="hover:text-red-900 dark:hover:text-red-300"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Salary & Remote Filters */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Minimum Salary */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Minimum Salary
          </label>
          <div className="flex items-center gap-2">
            <span className="text-surface-500">$</span>
            <input
              type="number"
              value={filters.minSalary ?? ''}
              onChange={(e) => onChange({
                minSalary: e.target.value ? parseInt(e.target.value) : null
              })}
              placeholder="e.g., 150"
              className="w-24 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
            />
            <span className="text-surface-500 text-sm">K/year</span>
          </div>
        </div>

        {/* Remote Only */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Remote Only
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.remoteOnly}
              onChange={(e) => onChange({ remoteOnly: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sentinel-300 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
            <span className="ml-2 text-sm text-surface-600 dark:text-surface-400">
              {filters.remoteOnly ? 'Yes' : 'No'}
            </span>
          </label>
        </div>
      </div>

      {/* Company Filters */}
      <div className="space-y-3">
        {/* Favorite Companies */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Favorite Companies
            <span className="font-normal text-surface-500 ml-1">(get alerts only from these, or leave empty for all)</span>
          </label>
          <div className="mb-2">
            <CompanyAutocomplete
              value={favoriteCompanyInput}
              onChange={setFavoriteCompanyInput}
              onAdd={addFavoriteCompany}
              placeholder="e.g., Google, Stripe, Anthropic"
              existingCompanies={filters.companyWhitelist}
              buttonColor="blue"
            />
          </div>
          {filters.companyWhitelist.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.companyWhitelist.map((company) => (
                <span
                  key={company}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                >
                  {company}
                  <button
                    onClick={() => removeCompany('favorite', company)}
                    className="hover:text-blue-900 dark:hover:text-blue-300"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Companies to Skip */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Companies to Skip
            <span className="font-normal text-surface-500 ml-1">(never get alerts from these)</span>
          </label>
          <div className="mb-2">
            <CompanyAutocomplete
              value={skipCompanyInput}
              onChange={setSkipCompanyInput}
              onAdd={addSkipCompany}
              placeholder="e.g., Acme Corp, BadCompany"
              existingCompanies={filters.companyBlacklist}
              buttonColor="surface"
            />
          </div>
          {filters.companyBlacklist.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.companyBlacklist.map((company) => (
                <span
                  key={company}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full"
                >
                  {company}
                  <button
                    onClick={() => removeCompany('skip', company)}
                    className="hover:text-surface-900 dark:hover:text-surface-100"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
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
