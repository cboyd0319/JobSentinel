import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge, Card } from "..";
import { logError } from "../../utils/errorUtils";

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

interface ApplicationProfile {
  id: number;
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

export function ApplicationPreview({ job, atsPlatform }: ApplicationPreviewProps) {
  const [profile, setProfile] = useState<ApplicationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await invoke<ApplicationProfile | null>("get_application_profile");
      setProfile(data);
    } catch (error) {
      logError("Failed to load profile for preview:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-sentinel-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-surface-500 dark:text-surface-400">
        <p>No profile configured. Please set up your application profile first.</p>
      </div>
    );
  }

  const fieldData = [
    { label: "Full Name", value: profile.fullName, willFill: true },
    { label: "Email", value: profile.email, willFill: true },
    { label: "Phone", value: profile.phone, willFill: !!profile.phone },
    { label: "LinkedIn", value: profile.linkedinUrl, willFill: !!profile.linkedinUrl },
    { label: "GitHub", value: profile.githubUrl, willFill: !!profile.githubUrl },
    { label: "Portfolio", value: profile.portfolioUrl, willFill: !!profile.portfolioUrl },
    { label: "Website", value: profile.websiteUrl, willFill: !!profile.websiteUrl },
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

  return (
    <div className="space-y-6">
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
          {atsPlatform && atsPlatform !== "unknown" && (
            <Badge variant="surface">{atsPlatform}</Badge>
          )}
        </div>
      </Card>

      {/* What Will Be Filled */}
      <section>
        <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
          Fields that will be auto-filled
        </h4>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700">
          {fieldData
            .filter((f) => f.willFill && f.value)
            .map((field) => (
              <div
                key={field.label}
                className="px-4 py-3 flex items-center justify-between"
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
      <section>
        <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <ExclamationIcon className="w-5 h-5 text-amber-500" />
          You'll need to complete manually
        </h4>
        <ul className="text-sm text-surface-600 dark:text-surface-400 space-y-2 pl-7">
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
            CAPTCHA verification (if present)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <strong>Final Submit button (you click this)</strong>
          </li>
        </ul>
      </section>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>A browser window will open with the application page</li>
              <li>Your profile data will be filled into matching fields</li>
              <li>Review the filled data and complete any missing fields</li>
              <li>When ready, click the Submit button yourself</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

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
