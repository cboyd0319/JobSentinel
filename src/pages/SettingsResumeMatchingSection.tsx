import { HelpIcon } from "../components/HelpIcon";
import type { Config } from "./SettingsConfig";
import { SettingsSymbol } from "./SettingsIcons";

interface SettingsResumeMatchingSectionProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

export function SettingsResumeMatchingSection({
  config,
  onConfigChange,
}: SettingsResumeMatchingSectionProps) {
  return (
    <>
      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Use Resume to Sort Jobs
          <HelpIcon text="When enabled, fit estimates can use reviewed local resume skills plus the search words you chose." />
        </h3>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <SettingsSymbol icon="document" className="h-6 w-6 text-surface-500 dark:text-surface-400" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-surface-900 dark:text-white">
                  Use Resume to Sort Jobs
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  Use reviewed local resume skills, then your search words
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Use Resume to Sort Jobs"
                checked={config.use_resume_matching ?? false}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    use_resume_matching: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
            <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400">
              <SettingsSymbol icon="lightbulb" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Add your resume in the{" "}
                <strong>Resume</strong> tab and review saved skills first. If
                no reviewed resume skills are saved, fit estimates use your job
                titles and search words.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Match Review Guide
          <HelpIcon text="These areas show what JobSentinel reviews when it sorts jobs. Use any fit label to see the details." />
        </h3>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 bg-surface-50 dark:bg-surface-900/20">
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
            JobSentinel reviews each job against your preferences and shows a
            fit label. These areas explain what shapes the review by default.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="target" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <div>
                  <div className="text-sm font-medium text-surface-900 dark:text-white">
                    Skills Fit
                  </div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">
                    Job title and search-word fit
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-surface-900 dark:text-white">
                  Primary
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  review area
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="currency" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <div>
                  <div className="text-sm font-medium text-surface-900 dark:text-white">
                    Salary
                  </div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">
                    Meets your salary requirements
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-surface-900 dark:text-white">
                  Important
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  review area
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="location" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <div>
                  <div className="text-sm font-medium text-surface-900 dark:text-white">
                    Location
                  </div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">
                    Remote/hybrid/onsite preference
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-surface-900 dark:text-white">
                  Important
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  review area
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="company" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <div>
                  <div className="text-sm font-medium text-surface-900 dark:text-white">
                    Company
                  </div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">
                    Companies you prefer or hide
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-surface-900 dark:text-white">
                  Supporting
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  review area
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="clock" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <div>
                  <div className="text-sm font-medium text-surface-900 dark:text-white">
                    Recency
                  </div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">
                    How fresh the posting is
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-surface-900 dark:text-white">
                  Supporting
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  review area
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
            <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400">
              <SettingsSymbol icon="lightbulb" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Search words, pay, and location stay
                easiest to review by default. Change your preferences above to
                improve your job matches.
              </span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
