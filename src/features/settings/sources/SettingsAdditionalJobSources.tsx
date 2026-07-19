import type { Dispatch, SetStateAction } from "react";
import {
  RESTRICTED_JOB_SOURCE_WARNING,
  RESTRICTED_SCHEDULED_JOB_SOURCES,
  normalizeRestrictedSourceAcknowledgements,
  restrictedScheduledJobSourceLabel,
  type RestrictedScheduledJobSourceId,
} from "../../../shared/restrictedSourceTaxonomy";
import { SettingsSymbol } from "../shared/SettingsIcons";
import { SettingsConnectedJobSource } from "./SettingsConnectedJobSource";
import type {
  Config,
  JobsWithGptPayload,
  SourceRequestSummary,
} from "../config/SettingsConfig";
import {
  buildSettingsSourceQuery,
  getRestrictedSourceConsentScope,
  getSettingsSourceLocation,
} from "../config/SettingsConfig";

interface SettingsAdditionalJobSourcesProps {
  config: Config;
  jobsWithGptLastRequest: SourceRequestSummary | null;
  jobsWithGptPayload: JobsWithGptPayload | null;
  jobsWithGptPayloadApproved: boolean;
  onApproveJobsWithGptPayload: () => void;
  onClearJobsWithGptApproval: () => void;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setShowJobsWithGptEndpoint: Dispatch<SetStateAction<boolean>>;
  showJobsWithGptEndpoint: boolean;
}

export function SettingsAdditionalJobSources({
  config,
  jobsWithGptLastRequest,
  jobsWithGptPayload,
  jobsWithGptPayloadApproved,
  onApproveJobsWithGptPayload,
  onClearJobsWithGptApproval,
  setConfig,
  setShowJobsWithGptEndpoint,
  showJobsWithGptEndpoint,
}: SettingsAdditionalJobSourcesProps) {
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
    const scopeId = `restricted-source-${sourceId}-scope`;

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
              Site rules reminder: {RESTRICTED_JOB_SOURCE_WARNING}
            </p>
            {source?.reason && <p className="text-sm">{source.reason}</p>}
            <p className="text-sm">
              JobSentinel will only run this scheduled check from this computer
              after you accept the risk below.
            </p>
            <p id={scopeId} className="text-sm leading-6">
              Approved scope: {getRestrictedSourceConsentScope(config, sourceId)} No resume,
              application history, credentials, military or veteran information,
              clearance claims, pay preferences, or protected answers are sent.
              Changing this request pauses scheduled checks until you review it
              again. Unchecking this box revokes future checks.
            </p>
            <label className="flex items-start gap-3 text-sm font-medium text-amber-900 dark:text-amber-100">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                checked={restrictedSourceAcknowledgements[sourceId]}
                aria-describedby={scopeId}
                onChange={(event) =>
                  setRestrictedSourceAcknowledgement(
                    sourceId,
                    event.target.checked,
                  )
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
              <SettingsSymbol
                icon="globe"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
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
              <SettingsSymbol
                icon="home"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="font-medium text-surface-800 dark:text-surface-200">
                WeWorkRemotely
              </span>
              <span className="text-xs text-surface-500">(Remote jobs)</span>
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
              <SettingsSymbol
                icon="city"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
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
                      remote_only: config.builtin?.remote_only ?? false,
                      limit: config.builtin?.limit ?? 50,
                    },
                    restricted_source_acknowledgements: e.target.checked
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
              <SettingsSymbol
                icon="chat"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
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
                      remote_only: config.hn_hiring?.remote_only ?? false,
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
              <SettingsSymbol
                icon="briefcase"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
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
                        : (config.dice?.query ?? ""),
                      location: e.target.checked
                        ? (config.dice?.location ??
                          getSettingsSourceLocation(config))
                        : config.dice?.location,
                      limit: config.dice?.limit ?? 50,
                    },
                    restricted_source_acknowledgements: e.target.checked
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

        {/* SimplyHired */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
          <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SettingsSymbol
                icon="clipboard"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="font-medium text-surface-800 dark:text-surface-200">
                SimplyHired
              </span>
              <span className="text-xs text-surface-500">(Job aggregator)</span>
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
                        : (config.simplyhired?.query ?? ""),
                      location: e.target.checked
                        ? (config.simplyhired?.location ??
                          getSettingsSourceLocation(config))
                        : config.simplyhired?.location,
                      limit: config.simplyhired?.limit ?? 50,
                    },
                    restricted_source_acknowledgements: e.target.checked
                      ? restrictedSourceAcknowledgements
                      : clearRestrictedSourceAcknowledgement("simplyhired"),
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          {config.simplyhired?.enabled &&
            renderRestrictedSourceAcknowledgement("simplyhired")}
        </div>

        {/* Glassdoor */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
          <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SettingsSymbol
                icon="search"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="font-medium text-surface-800 dark:text-surface-200">
                Glassdoor
              </span>
              <span className="text-xs text-surface-500">(Jobs + reviews)</span>
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
                        : (config.glassdoor?.query ?? ""),
                      location: e.target.checked
                        ? (config.glassdoor?.location ??
                          getSettingsSourceLocation(config))
                        : config.glassdoor?.location,
                      limit: config.glassdoor?.limit ?? 50,
                    },
                    restricted_source_acknowledgements: e.target.checked
                      ? restrictedSourceAcknowledgements
                      : clearRestrictedSourceAcknowledgement("glassdoor"),
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          {config.glassdoor?.enabled &&
            renderRestrictedSourceAcknowledgement("glassdoor")}
        </div>

        <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400 pt-2">
          <SettingsSymbol
            icon="lightbulb"
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
          />
          <span>
            When turned on, JobSentinel checks these job boards on your
            schedule. Choose the ones relevant to your job search.
          </span>
        </p>
      </div>
    </details>
  );
}
