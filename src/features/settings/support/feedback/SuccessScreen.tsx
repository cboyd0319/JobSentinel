import { memo } from "react";
import { Button } from "../../../../ui/Button";
import type { SavedFeedbackFile } from "./feedbackClient";

interface SuccessScreenProps {
  submittedVia: "github" | "local";
  savedFeedbackFile: SavedFeedbackFile | null;
  onRevealFile: () => void;
  onClose: () => void;
}

export const SuccessScreen = memo(function SuccessScreen({
  submittedVia,
  savedFeedbackFile,
  onRevealFile,
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
            Ready to finish the report
          </h3>

          <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400">
            <p>
              The online help page should have opened in your browser. Your safe
              support report is in your clipboard.
            </p>

            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <p className="font-semibold text-surface-800 dark:text-surface-200 mb-2">
                Next steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Add anything else you want us to know.</li>
                <li>Paste the safe support report if it is not already included.</li>
                <li>Review the help form, then send it.</li>
              </ol>
            </div>

            <p className="text-xs">
              That page keeps replies and updates in one place.
            </p>
          </div>

          <Button variant="primary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      )}

      {/* Local report success */}
      {submittedVia === "local" && savedFeedbackFile && (
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-surface-800 dark:text-surface-200">
            Safe support report saved
          </h3>

          <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400">
            <p>
              Your safe support report was saved:
            </p>

            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 border border-surface-200 dark:border-surface-700">
              <code className="text-xs text-surface-700 dark:text-surface-300 break-all">
                {savedFeedbackFile.fileName}
              </code>
            </div>

            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <p className="font-semibold text-surface-800 dark:text-surface-200 mb-2">
                Next steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Show the saved file.</li>
                <li>Share it only if you want help.</li>
                <li>Keep it local if you do not want to send it.</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={onRevealFile}
              icon={<FolderIcon />}
              className="w-full"
            >
              Show Saved File
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
