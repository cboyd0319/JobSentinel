import { useState, useEffect, useCallback, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "../Badge";
import { Card } from "../Card";
import { logError } from "../../utils/errorUtils";
import { getApplicationFormDisplayName } from "./applicationFormLabels";

interface Job {
  id: number;
  hash: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  score?: number;
}

interface ApplicationProfilePreview {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
}

interface ApplicationPreviewProps {
  job: Job;
  atsPlatform: string | null;
}

export const ApplicationPreview = memo(function ApplicationPreview({ job, atsPlatform }: ApplicationPreviewProps) {
  const [profile, setProfile] = useState<ApplicationProfilePreview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await invoke<ApplicationProfilePreview | null>("get_application_profile_preview");
      
      if (signal?.aborted) return;
      setProfile(data);
    } catch (error: unknown) {
      if (signal?.aborted) return;
      logError("Failed to load profile for preview:", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    loadProfile(controller.signal);
    
    return () => controller.abort();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-busy="true" aria-label="Loading application preview">
        <div className="animate-spin w-6 h-6 border-2 border-sentinel-500 border-t-transparent rounded-full" aria-hidden="true" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-surface-500 dark:text-surface-400" role="status">
        <p>Set up your application profile to preview what JobSentinel can prepare.</p>
      </div>
    );
  }

  const fieldData = [
    { label: "Full Name", value: profile.fullName, willFill: true },
    { label: "Email", value: profile.email, willFill: true },
    { label: "Phone", value: profile.phone, willFill: !!profile.phone },
    { label: "LinkedIn", value: profile.linkedinUrl, willFill: !!profile.linkedinUrl },
    { label: "Work samples or profile", value: profile.githubUrl, willFill: !!profile.githubUrl },
    { label: "Portfolio", value: profile.portfolioUrl, willFill: !!profile.portfolioUrl },
    { label: "Personal website or credential page", value: profile.websiteUrl, willFill: !!profile.websiteUrl },
    {
      label: "US Work Authorization",
      value: profile.usWorkAuthorized ? "Yes" : "No",
      willFill: true,
    },
    {
      label: "Requires Sponsorship",
      value: profile.requiresSponsorship ? "Yes" : "No",
      willFill: true,
    },
  ];
  const applicationFormName = getApplicationFormDisplayName(atsPlatform);

  return (
    <div className="space-y-6" role="region" aria-label="Application preview">
      {/* Job Summary */}
      <Card className="p-4 bg-surface-50 dark:bg-surface-800/50">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-surface-900 dark:text-white">
              {job.title}
            </h4>
            <p className="text-surface-600 dark:text-surface-400">
              {job.company} • {job.location}
            </p>
          </div>
          {applicationFormName && (
            <Badge variant="surface" aria-label={`Application form: ${applicationFormName}`}>
              {applicationFormName}
            </Badge>
          )}
        </div>
      </Card>

      {/* What JobSentinel Can Prepare */}
      <section role="group" aria-labelledby="prepared-fields-heading">
        <h4 id="prepared-fields-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-500" aria-hidden="true" />
          Fields JobSentinel can prepare
        </h4>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700" role="list" aria-label="Prepared fields">
          {fieldData
            .filter((f) => f.willFill && f.value)
            .map((field) => (
              <div
                key={field.label}
                className="px-4 py-3 flex items-center justify-between"
                role="listitem"
              >
                <span className="text-surface-600 dark:text-surface-400 text-sm">
                  {field.label}
                </span>
                <span className="text-surface-900 dark:text-white font-medium truncate ml-4 max-w-[250px]">
                  {field.value}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* Manual Fields Warning */}
      <section role="group" aria-labelledby="manual-fields-heading">
        <h4 id="manual-fields-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <ExclamationIcon className="w-5 h-5 text-amber-500" aria-hidden="true" />
          You will complete and review
        </h4>
        <ul className="text-sm text-surface-600 dark:text-surface-400 space-y-2 pl-7" role="list" aria-label="Manual tasks">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Resume upload (select your file)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Cover letter (if required)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Additional screening questions
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Human check (if the site asks)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <strong>Final Submit button (you click this yourself)</strong>
          </li>
        </ul>
      </section>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4" role="complementary" aria-labelledby="info-banner-title">
        <div className="flex gap-3">
          <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p id="info-banner-title" className="font-medium mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300" role="list" aria-label="Application process steps">
              <li>A browser window will open with the application page</li>
              <li>Matching profile details are prepared for your review</li>
              <li>Review every prepared detail and complete any missing fields</li>
              <li>When ready, click the Submit button yourself</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
});

// Icons
function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExclamationIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
