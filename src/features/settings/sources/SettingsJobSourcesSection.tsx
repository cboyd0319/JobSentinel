import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../../ui/Badge";
import { HelpIcon } from "../../../ui/HelpIcon";
import { LinkedInWorkbench } from "../../../components/LinkedInWorkbench";
import {
  RESTRICTED_AUTHENTICATED_SOURCE_WARNING,
  RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES,
  RESTRICTED_JOB_SOURCE_WARNING,
} from "../../../shared/restrictedSourceTaxonomy";
import { LinkedInIcon, SettingsSymbol } from "../shared/SettingsIcons";
import type { JobBoardRecommendation } from "./SettingsJobBoardRecommendations";
import { SettingsAdditionalJobSources } from "./SettingsAdditionalJobSources";
import { SettingsUsaJobsSourceSection } from "./SettingsUsaJobsSourceSection";
import {
  type Config,
  type CredentialStatusMap,
  type Credentials,
  type JobsWithGptPayload,
  type SourceRequestSummary,
} from "../config/SettingsConfig";

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
  return (
    <>
      {/* Job Sources */}
      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Additional Job Boards
          <HelpIcon text="JobSentinel can check selected public job sites and company application pages. Turn on only sources you want JobSentinel to contact." />
        </h3>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
          JobSentinel can check public company career pages and selected job
          sites. These are optional extras.
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
              Open LinkedIn when you choose, then use JobSentinel to keep a
              private local record of jobs you save, apply to, track, or want to
              review. You decide what gets added to JobSentinel.
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-300">
              JobSentinel will not collect your LinkedIn login, save cookies,
              click buttons for you, read LinkedIn pages in the background, or
              run scheduled LinkedIn checks.
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-300">
              For long manual sessions, JobSentinel can remind you after{" "}
              {RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES} minutes so you
              can close the window or keep going. The reminder is for privacy,
              not hidden automation.
            </p>
            <p className="rounded-lg border border-sentinel-200 bg-sentinel-50 p-3 text-sm text-sentinel-800 dark:border-sentinel-800 dark:bg-sentinel-900/20 dark:text-sentinel-200">
              How this works: {RESTRICTED_AUTHENTICATED_SOURCE_WARNING}
            </p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Site rules reminder: {RESTRICTED_JOB_SOURCE_WARNING}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              For scheduled job checks, prefer official company pages and public
              company application pages such as Greenhouse, Lever, Ashby,
              SmartRecruiters, and USAJobs.
            </p>
            <LinkedInWorkbench />
          </div>
        </div>

        <SettingsUsaJobsSourceSection
          config={config}
          credentialStatus={credentialStatus}
          credentials={credentials}
          setConfig={setConfig}
          setCredentials={setCredentials}
        />

        {/* Smart Recommendations */}
        {jobBoardRecommendations.length > 0 && (
          <div className="mb-4 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <SettingsSymbol
                icon="lightbulb"
                className="h-4 w-4 text-sentinel-700 dark:text-sentinel-300"
              />
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

        <SettingsAdditionalJobSources
          config={config}
          jobsWithGptLastRequest={jobsWithGptLastRequest}
          jobsWithGptPayload={jobsWithGptPayload}
          jobsWithGptPayloadApproved={jobsWithGptPayloadApproved}
          onApproveJobsWithGptPayload={onApproveJobsWithGptPayload}
          onClearJobsWithGptApproval={onClearJobsWithGptApproval}
          setConfig={setConfig}
          setShowJobsWithGptEndpoint={setShowJobsWithGptEndpoint}
          showJobsWithGptEndpoint={showJobsWithGptEndpoint}
        />
      </section>
    </>
  );
}
