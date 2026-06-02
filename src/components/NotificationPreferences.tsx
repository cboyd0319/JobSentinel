import { useState, useEffect, useCallback, memo } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { HelpIcon } from './HelpIcon';
import { CompanyAutocomplete } from './CompanyAutocomplete';
import { useToast } from '../contexts';
import {
  type SourceNotificationConfig,
  type AdvancedFilters,
  type NotificationPreferences as NotificationPreferencesType,
  DEFAULT_PREFERENCES,
  loadNotificationPreferencesAsync,
  saveNotificationPreferencesAsync,
} from '../utils/notificationPreferences';

// Type for source keys only (excluding global and advancedFilters)
type AlertSourceKey = 'indeed' | 'greenhouse' | 'lever' | 'jobswithgpt';

const SOURCE_INFO: Record<AlertSourceKey, { name: string; color: string; icon: string }> = {
  indeed: { name: 'Indeed', color: '#2557A7', icon: 'I' },
  greenhouse: { name: 'Greenhouse', color: '#3AB549', icon: 'G' },
  lever: { name: 'Lever', color: '#6B46C1', icon: 'L' },
  jobswithgpt: { name: 'Connected job source', color: '#10A37F', icon: 'J' },
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

const SourceConfigRow = memo(function SourceConfigRow({ sourceKey, config, onChange }: SourceConfigRowProps) {
  const info = SOURCE_INFO[sourceKey] || { name: sourceKey, color: '#666', icon: '?' };
  const alertPickyLabel = getAlertPickyLabel(config.minScoreThreshold);

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
          aria-label={`Turn ${info.name} alerts on or off`}
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
      </label>

      {/* Alert filtering slider */}
      <div className="flex items-center gap-2 flex-1">
        <label className="text-sm text-surface-600 dark:text-surface-400 whitespace-nowrap flex items-center gap-1">
          How picky alerts are:
          <HelpIcon text="Higher means fewer alerts. Lower means more alerts." size="sm" />
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={config.minScoreThreshold}
          onChange={(e) => onChange({ ...config, minScoreThreshold: parseInt(e.target.value) })}
          disabled={!config.enabled}
          aria-label={`How picky ${info.name} alerts are`}
          className="flex-1 h-2 bg-surface-200 dark:bg-surface-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        />
        <Badge variant={alertPickyLabel.variant}>
          {alertPickyLabel.label}
        </Badge>
      </div>

      {/* Sound toggle - larger touch target for mobile */}
      <label className="flex items-center gap-2 cursor-pointer p-2 -m-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors">
        <input
          type="checkbox"
          aria-label={`Turn ${info.name} alert sound on or off`}
          checked={config.soundEnabled}
          onChange={(e) => onChange({ ...config, soundEnabled: e.target.checked })}
          disabled={!config.enabled}
          className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500 disabled:opacity-50"
        />
        <SoundIcon className={`w-5 h-5 ${config.enabled ? 'text-surface-500' : 'text-surface-300'}`} />
      </label>
    </div>
  );
});

export const NotificationPreferences = memo(function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferencesType>(DEFAULT_PREFERENCES);
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
      setLoadError('Could not load alert rules. Your saved choices were not changed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePrefs = useCallback(async (updated: NotificationPreferencesType) => {
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
        'Could not save alert settings',
        'Your last change was undone. Try again, or copy a safe support report if this keeps happening.'
      );
    }
  }, [prefs, toast]);

  const handleSourceChange = useCallback((sourceKey: AlertSourceKey, config: SourceNotificationConfig) => {
    const updated = { ...prefs, [sourceKey]: config };
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleGlobalChange = useCallback((updates: Partial<NotificationPreferencesType['global']>) => {
    const updated = { ...prefs, global: { ...prefs.global, ...updates } };
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleAdvancedFiltersChange = useCallback((updates: Partial<AdvancedFilters>) => {
    const updated = {
      ...prefs,
      advancedFilters: { ...prefs.advancedFilters, ...updates }
    };
    savePrefs(updated);
  }, [prefs, savePrefs]);

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
              checked={prefs.global.enabled}
              onChange={(e) => handleGlobalChange({ enabled: e.target.checked })}
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
                checked={prefs.global.quietHoursEnabled}
                onChange={(e) => handleGlobalChange({ quietHoursEnabled: e.target.checked })}
                disabled={!prefs.global.enabled}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500 peer-disabled:opacity-50"></div>
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
            Alert sources
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
            Choose which job sources can send alerts. Only sources shown here
            have separate alert rules. Other job boards that are turned on use the main
            alert switch; turn a board off in Additional Job Boards to stop
            those alerts.
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
        <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide flex items-center gap-1">
          Extra alert rules
          <HelpIcon text="Additional rules to customize which jobs you get notified about. All of these are optional." size="sm" />
        </div>
      </div>

      {/* Keyword Filters */}
      <div className="space-y-3 mb-4">
        {/* Include Keywords */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Alert only when the job title has
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={includeInput}
              onChange={(e) => setIncludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword('include', includeInput)}
              placeholder="e.g., Manager, Lead, Coordinator"
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
            Do not alert when the job title has
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword('exclude', excludeInput)}
              placeholder="e.g., Intern, Contract, Temporary"
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
        {/* Minimum yearly pay */}
        <div>
          <label htmlFor="notification-min-salary" className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Minimum yearly pay
          </label>
          <div className="flex items-center gap-2">
            <span className="text-surface-500">$</span>
            <input
              id="notification-min-salary"
              type="number"
              value={filters.minSalary === null ? '' : filters.minSalary * 1000}
              onChange={(e) => onChange({
                minSalary: e.target.value ? Math.round(parseInt(e.target.value) / 1000) : null
              })}
              placeholder="e.g., 90000"
              className="w-24 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
            />
            <span className="text-surface-500 text-sm">per year</span>
          </div>
        </div>

        {/* Remote jobs only */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Remote jobs only
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.remoteOnly}
              onChange={(e) => onChange({ remoteOnly: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
            <span className="ml-2 text-sm text-surface-600 dark:text-surface-400">
              {filters.remoteOnly ? 'Yes' : 'No'}
            </span>
          </label>
        </div>
      </div>

      {/* Company Filters */}
      <div className="space-y-3">
        {/* Companies users want alerts from */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Companies you want alerts from
            <span className="font-normal text-surface-500 ml-1">(get alerts only from these, or leave empty for all)</span>
          </label>
          <div className="mb-2">
            <CompanyAutocomplete
              value={favoriteCompanyInput}
              onChange={setFavoriteCompanyInput}
              onAdd={addFavoriteCompany}
              placeholder="e.g., Mayo Clinic, Target, City of Denver"
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

        {/* Companies to skip */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Companies to skip
            <span className="font-normal text-surface-500 ml-1">(never get alerts from these)</span>
          </label>
          <div className="mb-2">
            <CompanyAutocomplete
              value={skipCompanyInput}
              onChange={setSkipCompanyInput}
              onAdd={addSkipCompany}
              placeholder="e.g., Acme Services, Example Staffing"
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
