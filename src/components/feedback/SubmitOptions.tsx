import { memo } from "react";
import { Button } from "../Button";

interface SubmitOptionsProps {
  onSubmitGitHub: () => void;
  onSubmitDrive: () => void;
  submitting: boolean;
}

export const SubmitOptions = memo(function SubmitOptions({
  onSubmitGitHub,
  onSubmitDrive,
  submitting,
}: SubmitOptionsProps) {
  return (
    <div className="space-y-4">
      {/* GitHub Issues - recommended when the user wants a trackable report */}
      <div className="border-2 border-sentinel-500 rounded-lg overflow-hidden bg-sentinel-50/50 dark:bg-sentinel-900/10">
        <div className="px-4 py-3 bg-sentinel-500 text-white">
          <div className="flex items-center gap-2">
            <StarIcon className="w-5 h-5" />
            <span className="font-semibold text-sm uppercase tracking-wide">
              Recommended
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-surface-800 dark:text-surface-200 text-lg">
            Open a report with replies
          </h3>

          <div className="space-y-2 text-sm text-surface-600 dark:text-surface-400">
            <BenefitItem text="Opens a prepared GitHub issue in your browser" />
            <BenefitItem text="Copies your safe debug report so you can paste it" />
            <BenefitItem text="Keeps private details out before sharing" />
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={onSubmitGitHub}
            loading={submitting}
            className="w-full"
            icon={<GitHubIcon />}
          >
            Open GitHub issue
          </Button>

          <p className="text-xs text-surface-500 dark:text-surface-400 text-center">
            No GitHub account or not sure? Save a feedback file instead.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-surface-200 dark:border-surface-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 bg-white dark:bg-surface-800 text-surface-500 dark:text-surface-400">
            Or
          </span>
        </div>
      </div>

      {/* Saved file - secondary path when GitHub is unfamiliar */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-surface-800 dark:text-surface-200">
          Save a feedback file
        </h3>

        <p className="text-sm text-surface-600 dark:text-surface-400">
          Use this if GitHub is unfamiliar or you want to share the report
          another way. JobSentinel saves a safe report file first.
        </p>

        <Button
          variant="secondary"
          size="md"
          onClick={onSubmitDrive}
          loading={submitting}
          className="w-full"
          icon={<DriveIcon />}
        >
          Save Feedback File
        </Button>
      </div>
    </div>
  );
});

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckIcon className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M7.71 3.5L1.15 15l2.85 5h5.7l6.56-11.5h-5.7L7.71 3.5zm11.44 0l-6.56 11.5h5.7l2.85-5-2.85-5h-5.7l6.56-11.5h5.7L22 8.5 15.15 20H9.44l6.56-11.5h-5.7L13.15 3.5h5.7z" />
    </svg>
  );
}
