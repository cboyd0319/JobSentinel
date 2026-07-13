import type { Dispatch, SetStateAction } from "react";
import { HelpIcon } from "../../../ui/HelpIcon";
import type { Config } from "../config/SettingsConfig";
import { SettingsSymbol } from "../shared/SettingsIcons";

interface SettingsDesktopAlertsSectionProps {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
}

export function SettingsDesktopAlertsSection({
  config,
  setConfig,
}: SettingsDesktopAlertsSectionProps) {
  return (
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
          Desktop alerts use private wording. They do not show job titles,
          company names, salary notes, or reminder text.
        </p>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SettingsSymbol
              icon="bell"
              className="h-5 w-5 text-surface-500 dark:text-surface-400"
            />
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
                        config.alerts.desktop?.show_when_focused ?? false,
                      play_sound: config.alerts.desktop?.play_sound ?? false,
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
                checked={config.alerts.desktop?.play_sound ?? false}
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
                          config.alerts.desktop?.show_when_focused ?? false,
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
                checked={config.alerts.desktop?.show_when_focused ?? false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: {
                      ...config.alerts,
                      desktop: {
                        ...config.alerts.desktop,
                        enabled: true,
                        show_when_focused: e.target.checked,
                        play_sound: config.alerts.desktop?.play_sound ?? false,
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
  );
}
