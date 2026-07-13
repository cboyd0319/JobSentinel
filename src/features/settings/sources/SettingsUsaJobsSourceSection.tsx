import type { Dispatch, SetStateAction } from "react";
import { Input } from "../../../components/Input";
import {
  credentialExists,
  credentialIsExpected,
  type Config,
  type CredentialStatusMap,
  type Credentials,
} from "../config/SettingsConfig";
import { SettingsSymbol } from "../shared/SettingsIcons";
import { SecurityBadge } from "../shared/SettingsSecurityBadge";

interface SettingsUsaJobsSourceSectionProps {
  config: Config;
  credentialStatus: CredentialStatusMap;
  credentials: Credentials;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
}

export function SettingsUsaJobsSourceSection({
  config,
  credentialStatus,
  credentials,
  setConfig,
  setCredentials,
}: SettingsUsaJobsSourceSectionProps) {
  const hasConfirmedAccessCode = credentialExists(
    credentialStatus,
    "usajobs_api_key",
  );
  const hasConfiguredAccessCode =
    hasConfirmedAccessCode ||
    credentialIsExpected(credentialStatus, "usajobs_api_key");

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-lg">US</span>
          <span className="font-medium text-surface-800 dark:text-surface-200">
            USAJobs
          </span>
          <span className="text-xs text-surface-500">
            (Federal government jobs)
          </span>
        </div>
        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
          <input
            type="checkbox"
            aria-label="Turn USAJobs scheduled job checks on or off"
            checked={config.usajobs?.enabled ?? false}
            onChange={(e) =>
              setConfig({
                ...config,
                usajobs: {
                  ...config.usajobs,
                  enabled: e.target.checked,
                  email: config.usajobs?.email ?? "",
                  remote_only: config.usajobs?.remote_only ?? false,
                  date_posted_days: config.usajobs?.date_posted_days ?? 30,
                  limit: config.usajobs?.limit ?? 100,
                },
              })
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-surface-200 peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sentinel-500"></div>
        </label>
      </div>

      {config.usajobs?.enabled && (
        <div className="space-y-3">
          <p className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
            When this is on, JobSentinel contacts USAJobs on your schedule. It
            uses your access code, USAJobs email, search words, location, remote
            choice, how recent jobs should be, and how many jobs to ask for.
            Leave this off for browser-only search.
          </p>
          {!hasConfirmedAccessCode && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="flex items-center gap-1.5 text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                <SettingsSymbol icon="bolt" className="h-4 w-4" />
                <span>Optional USAJobs scheduled checks</span>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                Skip this if you only want to open USAJobs in your browser.
                Search links need no access code.
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                <li>Use the browser search link for no setup</li>
                <li>
                  Use optional scheduled checks only if you want JobSentinel to
                  check USAJobs for you
                </li>
                <li>Ask USAJobs for an access code with your email</li>
                <li>Copy the access code from your email</li>
                <li>Paste it here</li>
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://www.usajobs.gov/Search/Results"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200 text-sm font-medium rounded transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  Open USAJobs search in your browser
                </a>
                <a
                  href="https://developer.usajobs.gov/APIRequest/Index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Open USAJobs access-code request
                </a>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                This opens a USAJobs access-code page that may use official
                setup wording. Skip it unless you want scheduled USAJobs checks;
                browser search still works.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                USAJobs access code
                <SecurityBadge status={credentialStatus.usajobs_api_key} />
              </label>
              <Input
                label="USAJobs access code"
                hideLabel
                type="password"
                value={credentials.usajobs_api_key}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    usajobs_api_key: e.target.value,
                  }))
                }
                placeholder={
                  hasConfiguredAccessCode
                    ? "Enter new code to update"
                    : "Paste your USAJobs access code"
                }
                autoComplete="new-password"
              />
            </div>
            <Input
              label="Email (same as signup)"
              value={config.usajobs?.email ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  usajobs: {
                    ...config.usajobs,
                    email: e.target.value,
                    enabled: config.usajobs?.enabled ?? false,
                    remote_only: config.usajobs?.remote_only ?? false,
                    date_posted_days: config.usajobs?.date_posted_days ?? 30,
                    limit: config.usajobs?.limit ?? 100,
                  },
                })
              }
              placeholder="your@email.com"
              hint="Use the same email you used with USAJobs"
              autoComplete="email"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Search words"
              value={config.usajobs?.keywords ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  usajobs: {
                    ...config.usajobs,
                    keywords: e.target.value,
                    enabled: config.usajobs?.enabled ?? false,
                    email: config.usajobs?.email ?? "",
                    remote_only: config.usajobs?.remote_only ?? false,
                    date_posted_days: config.usajobs?.date_posted_days ?? 30,
                    limit: config.usajobs?.limit ?? 100,
                  },
                })
              }
              placeholder="e.g., program manager"
            />
            <Input
              label="Location"
              value={config.usajobs?.location ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  usajobs: {
                    ...config.usajobs,
                    location: e.target.value,
                    enabled: config.usajobs?.enabled ?? false,
                    email: config.usajobs?.email ?? "",
                    remote_only: config.usajobs?.remote_only ?? false,
                    date_posted_days: config.usajobs?.date_posted_days ?? 30,
                    limit: config.usajobs?.limit ?? 100,
                  },
                })
              }
              placeholder="e.g., Washington, DC"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex min-w-0 items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.usajobs?.remote_only ?? false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    usajobs: {
                      ...config.usajobs,
                      remote_only: e.target.checked,
                      enabled: config.usajobs?.enabled ?? false,
                      email: config.usajobs?.email ?? "",
                      date_posted_days: config.usajobs?.date_posted_days ?? 30,
                      limit: config.usajobs?.limit ?? 100,
                    },
                  })
                }
                className="rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
              />
              <span className="text-sm text-surface-700 dark:text-surface-300 break-words">
                Remote only
              </span>
            </label>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="text-sm text-surface-700 dark:text-surface-300">
                Posted in last:
              </label>
              <select
                value={config.usajobs?.date_posted_days ?? 30}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    usajobs: {
                      ...config.usajobs,
                      date_posted_days: parseInt(e.target.value),
                      enabled: config.usajobs?.enabled ?? false,
                      email: config.usajobs?.email ?? "",
                      remote_only: config.usajobs?.remote_only ?? false,
                      limit: config.usajobs?.limit ?? 100,
                    },
                  })
                }
                className="px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="text-sm text-surface-700 dark:text-surface-300">
                Jobs to check:
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={config.usajobs?.limit ?? 100}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    usajobs: {
                      ...config.usajobs,
                      limit: parseInt(e.target.value) || 100,
                      enabled: config.usajobs?.enabled ?? false,
                      email: config.usajobs?.email ?? "",
                      remote_only: config.usajobs?.remote_only ?? false,
                      date_posted_days: config.usajobs?.date_posted_days ?? 30,
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
  );
}
