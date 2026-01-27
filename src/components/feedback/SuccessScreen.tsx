import { memo } from "react";
import { Button } from "../Button";

interface SuccessScreenProps {
  submittedVia: "github" | "drive";
  savedFilePath: string | null;
  onRevealFile: () => void;
  onOpenDriveFolder: () => void;
  onClose: () => void;
}

export const SuccessScreen = memo(function SuccessScreen({
  submittedVia,
  savedFilePath,
  onRevealFile,
  onOpenDriveFolder,
  onClose,
}: SuccessScreenProps) {
  return (
    <div className="space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-success/10 dark:bg-success/20 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-10 h-10 text-success" />
        </div>
      </div>

      {/* GitHub Success */}
      {submittedVia === "github" && (
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-surface-800 dark:text-surface-200">
            Ready to Submit!
          </h3>

          <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400">
            <p>
              GitHub should have opened in your browser. If not, the URL is in your clipboard.
            </p>

            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <p className="font-semibold text-surface-800 dark:text-surface-200 mb-2">
                Next steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Fill out the issue form with additional details</li>
                <li>Paste the debug info from your clipboard (if included)</li>
                <li>Review and submit the issue</li>
              </ol>
            </div>

            <p className="text-xs">
              You'll be able to track the issue and receive updates when it's addressed.
            </p>
          </div>

          <Button variant="primary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      )}

      {/* Drive Success */}
      {submittedVia === "drive" && savedFilePath && (
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-surface-800 dark:text-surface-200">
            File Saved!
          </h3>

          <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400">
            <p>
              Your feedback report has been saved:
            </p>

            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 border border-surface-200 dark:border-surface-700">
              <code className="text-xs text-surface-700 dark:text-surface-300 break-all">
                {savedFilePath}
              </code>
            </div>

            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <p className="font-semibold text-surface-800 dark:text-surface-200 mb-2">
                Next steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Open the Google Drive feedback folder</li>
                <li>Drag your saved file into the folder</li>
                <li>That's it - we'll review your feedback!</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={onOpenDriveFolder}
              icon={<ExternalLinkIcon />}
              className="w-full"
            >
              Open Google Drive Folder
            </Button>

            <Button
              variant="secondary"
              onClick={onRevealFile}
              icon={<FolderIcon />}
              className="w-full"
            >
              Show File Location
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

function CheckCircleIcon({ className = "" }: { className?: string }) {
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
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}
