import { HelpIcon } from "../../../ui/HelpIcon";
import type { Config } from "../config/SettingsConfig";
import { RefreshIcon } from "../shared/SettingsIcons";

interface SettingsAutoSearchSectionProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

export function SettingsAutoSearchSection({
  config,
  onConfigChange,
}: SettingsAutoSearchSectionProps) {
  return (
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
                onConfigChange({
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
                  onConfigChange({
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
              JobSentinel checks for new jobs at this interval while the app is
              open.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
