import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../components/Badge";
import { HelpIcon } from "../components/HelpIcon";
import { Input } from "../components/Input";
import {
  RESTRICTED_AUTHENTICATED_SOURCE_WARNING,
  RESTRICTED_INTERACTIVE_SESSION_MAX_MINUTES,
  RESTRICTED_JOB_SOURCE_WARNING,
  RESTRICTED_SCHEDULED_JOB_SOURCES,
  normalizeRestrictedSourceAcknowledgements,
  restrictedScheduledJobSourceLabel,
  type RestrictedScheduledJobSourceId,
} from "../shared/restrictedSourceTaxonomy";
import { LinkedInIcon, SettingsSymbol } from "./SettingsIcons";
import type { JobBoardRecommendation } from "./SettingsJobBoardRecommendations";
import { SecurityBadge } from "./SettingsSecurityBadge";
import { SettingsConnectedJobSource } from "./SettingsConnectedJobSource";
import {
  buildSettingsSourceQuery,
  credentialExists,
  credentialIsExpected,
  getSettingsSourceLocation,
  type Config,
  type CredentialStatusMap,
  type Credentials,
  type JobsWithGptPayload,
  type SourceRequestSummary,
} from "./SettingsConfig";

interface SettingsJobSourcesSectionProps {
  config: Config;
  credentialStatus: CredentialStatusMap;
  credentials: Credentials;
  jobBoardRecommendations: JobBoardRecommendation[];
  jobsWithGptLastRequest: SourceRequestSummary | null;
  jobsWithGptPayload: JobsWithGptPayload | null;
  jobsWithGptPayloadApproved: boolean;
  onApproveJobsWithGptPayload: () => void;
  onClearJobsWithGptApproval: () => void;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
  setShowJobsWithGptEndpoint: Dispatch<SetStateAction<boolean>>;
  showJobsWithGptEndpoint: boolean;
}

export function SettingsJobSourcesSection({
  config,
  credentialStatus,
  credentials,
  jobBoardRecommendations,
  jobsWithGptLastRequest,
  jobsWithGptPayload,
  jobsWithGptPayloadApproved,
  onApproveJobsWithGptPayload,
  onClearJobsWithGptApproval,
  setConfig,
  setCredentials,
  setShowJobsWithGptEndpoint,
  showJobsWithGptEndpoint,
}: SettingsJobSourcesSectionProps) {
  const hasConfirmedUsaJobsAccessCode = credentialExists(
    credentialStatus,
    "usajobs_api_key",
  );
  const hasConfiguredUsaJobsAccessCode =
    hasConfirmedUsaJobsAccessCode ||
    credentialIsExpected(credentialStatus, "usajobs_api_key");
  const restrictedSourceAcknowledgements =
    normalizeRestrictedSourceAcknowledgements(
      config.restricted_source_acknowledgements,
    );

  const setRestrictedSourceAcknowledgement = (
    sourceId: RestrictedScheduledJobSourceId,
    accepted: boolean,
  ) => {
    setConfig({
      ...config,
      restricted_source_acknowledgements: {
        ...restrictedSourceAcknowledgements,
        [sourceId]: accepted,
      },
    });
  };

  const clearRestrictedSourceAcknowledgement = (
    sourceId: RestrictedScheduledJobSourceId,
  ) => ({
    ...restrictedSourceAcknowledgements,
    [sourceId]: false,
  });

  const renderRestrictedSourceAcknowledgement = (
    sourceId: RestrictedScheduledJobSourceId,
  ) => {
    const source = RESTRICTED_SCHEDULED_JOB_SOURCES.find(
      (item) => item.id === sourceId,
    );
    const label = restrictedScheduledJobSourceLabel(sourceId);

    return (
      <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-200">
        <div className="flex items-start gap-1.5">
          <SettingsSymbol
            icon="warning"
            className="mt-1 h-4 w-4 flex-shrink-0"
          />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Restricted source warning
            </p>
            <p className="text-sm leading-6">
              Legal and account warning: {RESTRICTED_JOB_SOURCE_WARNING}
            </p>
            {source?.reason && <p className="text-sm">{source.reason}</p>}
            <p className="text-sm">
              JobSentinel will only run this scheduled check from this computer
              after you accept the risk below.
            </p>
            <label className="flex items-start gap-3 text-sm font-medium text-amber-900 dark:text-amber-100">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                checked={restrictedSourceAcknowledgements[sourceId]}
                onChange={(event) =>
                  setRestrictedSourceAcknowledgement(sourceId, event.target.checked)
                }
              />
              <span>
                I understand and accept this risk. Run {label} scheduled checks
                from this computer.
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
              {/* Job Sources */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Additional Job Boards
                  <HelpIcon text="JobSentinel can check selected public job sites and company application pages. Turn on only sources you want JobSentinel to contact." />
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                  JobSentinel can check public company career pages and selected job sites.
                  These are optional extras.
                </p>

                {/* LinkedIn */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4">
                  <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <LinkedInIcon className="w-5 h-5 text-[#0077B5]" />
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        LinkedIn
                      </span>
                    </div>
                    <Badge variant="surface">User controlled</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-surface-600 dark:text-surface-300">
                      Open LinkedIn yourself, then use a search link, paste one
                      job link, Browser Import, or manual entry when you choose.
                      JobSentinel will not collect your LinkedIn login, save
                      cookies, or run hidden background LinkedIn checks.
                    </p>
                    <p className="text-sm text-surface-600 dark:text-surface-300">
                      If a restricted sign-in flow is added, JobSentinel must
                      show this warning before the sign-in page, require a fresh
                      sign-in each time, store no sign-in material, and end that
                      interactive window within{" "}
                      {RESTRICTED_INTERACTIVE_SESSION_MAX_MINUTES} minutes.
                    </p>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      Legal and account warning: {RESTRICTED_JOB_SOURCE_WARNING}
                    </p>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      Restricted sign-in rule:{" "}
                      {RESTRICTED_AUTHENTICATED_SOURCE_WARNING}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      For scheduled job checks, prefer official company pages
                      and public company application pages such as Greenhouse,
                      Lever, Ashby, SmartRecruiters, and USAJobs.
                    </p>
                  </div>
                </div>

                {/* USAJobs */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4">
                  <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-lg">🇺🇸</span>
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
                              date_posted_days:
                                config.usajobs?.date_posted_days ?? 30,
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
                        When this is on, JobSentinel contacts USAJobs on your
                        schedule. It uses your access code, USAJobs email,
                        search words, location, remote choice, how recent jobs
                        should be, and how many jobs to ask for. Leave this off
                        for browser-only search.
                      </p>
                      {/* Advanced USAJobs setup */}
                      {!hasConfirmedUsaJobsAccessCode && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            <SettingsSymbol icon="bolt" className="h-4 w-4" />
                            <span>Optional USAJobs scheduled checks</span>
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                            Skip this if you only want to open USAJobs in your
                            browser. Search links need no access code.
                          </p>
                          <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                            <li>Use the browser search link for no setup</li>
                            <li>Use optional scheduled checks only if you want JobSentinel to check USAJobs for you</li>
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
                            This opens a USAJobs access-code page that may use
                            official setup wording. Skip it unless you want
                            scheduled USAJobs checks; browser search still
                            works.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                            USAJobs access code
                            <SecurityBadge
                              status={credentialStatus.usajobs_api_key}
                            />
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
                              hasConfiguredUsaJobsAccessCode
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
                                remote_only:
                                  config.usajobs?.remote_only ?? false,
                                date_posted_days:
                                  config.usajobs?.date_posted_days ?? 30,
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
                                remote_only:
                                  config.usajobs?.remote_only ?? false,
                                date_posted_days:
                                  config.usajobs?.date_posted_days ?? 30,
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
                                remote_only:
                                  config.usajobs?.remote_only ?? false,
                                date_posted_days:
                                  config.usajobs?.date_posted_days ?? 30,
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
                                  date_posted_days:
                                    config.usajobs?.date_posted_days ?? 30,
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
                                  remote_only:
                                    config.usajobs?.remote_only ?? false,
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
                                  remote_only:
                                    config.usajobs?.remote_only ?? false,
                                  date_posted_days:
                                    config.usajobs?.date_posted_days ?? 30,
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

                {/* Smart Recommendations */}
                {jobBoardRecommendations.length > 0 && (
                  <div className="mb-4 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <SettingsSymbol icon="lightbulb" className="h-4 w-4 text-sentinel-700 dark:text-sentinel-300" />
                      <span className="text-sm font-medium text-sentinel-700 dark:text-sentinel-300">
                        Optional sources to review
                      </span>
                    </div>
                    <div className="space-y-2">
                      {jobBoardRecommendations.map((rec) => (
                        <div
                          key={rec.board}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-surface-800 dark:text-surface-200 break-words">
                              {rec.board}
                            </span>
                            <span className="text-xs text-surface-500 dark:text-surface-400 ml-0 block break-words sm:ml-2 sm:inline">
                              — {rec.reason}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={rec.enable}
                            className="self-start text-xs px-2 py-1 bg-sentinel-500 hover:bg-sentinel-600 text-white rounded transition-colors sm:self-auto"
                          >
                            Review source
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* More Job Boards - Collapsible Section */}
                <details className="border border-surface-200 dark:border-surface-700 rounded-lg">
                  <summary className="p-4 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 font-medium text-surface-800 dark:text-surface-200 flex items-center gap-2">
                    <span>More Job Boards</span>
                    <span className="text-xs text-surface-500 dark:text-surface-400 font-normal">
                      (optional sources)
                    </span>
                  </summary>
                  <div className="p-4 pt-0 space-y-4">
                    {/* Optional connected job source */}
                    <SettingsConnectedJobSource
                      config={config}
                      jobsWithGptLastRequest={jobsWithGptLastRequest}
                      jobsWithGptPayload={jobsWithGptPayload}
                      jobsWithGptPayloadApproved={jobsWithGptPayloadApproved}
                      onApprove={onApproveJobsWithGptPayload}
                      onClearApproval={onClearJobsWithGptApproval}
                      onConfigChange={setConfig}
                      setShowJobsWithGptEndpoint={setShowJobsWithGptEndpoint}
                      showJobsWithGptEndpoint={showJobsWithGptEndpoint}
                    />

                    {/* RemoteOK */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="globe" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            RemoteOK
                          </span>
                          <span className="text-xs text-surface-500">
                            (Remote-only jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Remote OK scheduled job checks on or off"
                            checked={config.remoteok?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                remoteok: {
                                  ...config.remoteok,
                                  enabled: e.target.checked,
                                  tags: config.remoteok?.tags ?? [],
                                  limit: config.remoteok?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* WeWorkRemotely */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="home" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            WeWorkRemotely
                          </span>
                          <span className="text-xs text-surface-500">
                            (Remote jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn We Work Remotely scheduled job checks on or off"
                            checked={config.weworkremotely?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                weworkremotely: {
                                  ...config.weworkremotely,
                                  enabled: e.target.checked,
                                  limit: config.weworkremotely?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* BuiltIn */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="city" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            BuiltIn
                          </span>
                          <span className="text-xs text-surface-500">
                            (Technology-focused local jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn BuiltIn scheduled job checks on or off"
                            checked={config.builtin?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                builtin: {
                                  ...config.builtin,
                                  enabled: e.target.checked,
                                  cities: config.builtin?.cities ?? [],
                                  limit: config.builtin?.limit ?? 50,
                                },
                                restricted_source_acknowledgements: e.target
                                  .checked
                                  ? restrictedSourceAcknowledgements
                                  : clearRestrictedSourceAcknowledgement("builtin"),
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                      {config.builtin?.enabled &&
                        renderRestrictedSourceAcknowledgement("builtin")}
                    </div>

                    {/* Startup and tech hiring posts */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Startup and tech hiring posts
                          </span>
                          <span className="text-xs text-surface-500">
                            (Monthly hiring posts)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn startup and tech hiring post checks on or off"
                            checked={config.hn_hiring?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                hn_hiring: {
                                  ...config.hn_hiring,
                                  enabled: e.target.checked,
                                  remote_only:
                                    config.hn_hiring?.remote_only ?? false,
                                  limit: config.hn_hiring?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* Dice */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="briefcase" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Dice
                          </span>
                          <span className="text-xs text-surface-500">
                            (Technology-focused jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Dice scheduled job checks on or off"
                            checked={config.dice?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                dice: {
                                  ...config.dice,
                                  enabled: e.target.checked,
                                  query: e.target.checked
                                    ? config.dice?.query?.trim() ||
                                      buildSettingsSourceQuery(config)
                                    : config.dice?.query ?? "",
                                  location: e.target.checked
                                    ? config.dice?.location ??
                                      getSettingsSourceLocation(config)
                                    : config.dice?.location,
                                  limit: config.dice?.limit ?? 50,
                                },
                                restricted_source_acknowledgements: e.target
                                  .checked
                                  ? restrictedSourceAcknowledgements
                                  : clearRestrictedSourceAcknowledgement("dice"),
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                      {config.dice?.enabled &&
                        renderRestrictedSourceAcknowledgement("dice")}
                    </div>

                    {/* YC Work at a Startup */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="rocket" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            YC Startups
                          </span>
                          <span className="text-xs text-surface-500">
                            (Y Combinator)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn YC Startup scheduled job checks on or off"
                            checked={config.yc_startup?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                yc_startup: {
                                  ...config.yc_startup,
                                  enabled: e.target.checked,
                                  remote_only:
                                    config.yc_startup?.remote_only ?? false,
                                  limit: config.yc_startup?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* SimplyHired */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="clipboard" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            SimplyHired
                          </span>
                          <span className="text-xs text-surface-500">
                            (Job aggregator)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn SimplyHired scheduled job checks on or off"
                            checked={config.simplyhired?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                simplyhired: {
                                  ...config.simplyhired,
                                  enabled: e.target.checked,
                                  query: e.target.checked
                                    ? config.simplyhired?.query?.trim() ||
                                      buildSettingsSourceQuery(config)
                                    : config.simplyhired?.query ?? "",
                                  location: e.target.checked
                                    ? config.simplyhired?.location ??
                                      getSettingsSourceLocation(config)
                                    : config.simplyhired?.location,
                                  limit: config.simplyhired?.limit ?? 50,
                                },
                                restricted_source_acknowledgements: e.target
                                  .checked
                                  ? restrictedSourceAcknowledgements
                                  : clearRestrictedSourceAcknowledgement("simplyhired"),
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                      {config.simplyhired?.enabled && (
                        renderRestrictedSourceAcknowledgement("simplyhired")
                      )}
                    </div>

                    {/* Glassdoor */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SettingsSymbol icon="search" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Glassdoor
                          </span>
                          <span className="text-xs text-surface-500">
                            (Jobs + reviews)
                          </span>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Glassdoor scheduled job checks on or off"
                            checked={config.glassdoor?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                glassdoor: {
                                  ...config.glassdoor,
                                  enabled: e.target.checked,
                                  query: e.target.checked
                                    ? config.glassdoor?.query?.trim() ||
                                      buildSettingsSourceQuery(config)
                                    : config.glassdoor?.query ?? "",
                                  location: e.target.checked
                                    ? config.glassdoor?.location ??
                                      getSettingsSourceLocation(config)
                                    : config.glassdoor?.location,
                                  limit: config.glassdoor?.limit ?? 50,
                                },
                                restricted_source_acknowledgements: e.target
                                  .checked
                                  ? restrictedSourceAcknowledgements
                                  : clearRestrictedSourceAcknowledgement("glassdoor"),
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                      {config.glassdoor?.enabled && (
                        renderRestrictedSourceAcknowledgement("glassdoor")
                      )}
                    </div>

                    <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400 pt-2">
                      <SettingsSymbol icon="lightbulb" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        When turned on, JobSentinel checks these job boards on
                        your schedule. Choose the ones relevant to your job
                        search.
                      </span>
                    </p>
                  </div>
                </details>
              </section>

    </>
  );
}
