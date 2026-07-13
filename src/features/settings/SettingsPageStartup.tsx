import { SettingsSupportSection } from "./support/SettingsSupportSections";

interface SettingsLoadFailureProps {
  copyingDebugReport: boolean;
  onClose: () => void;
  onCopyDebugReport: () => void;
  onOpenFeedback: () => void;
  onRetry: () => void;
  onSaveDebugReport: () => void;
  savingDebugReport: boolean;
}

export function SettingsLoadingState() {
  return (
    <div
      className="flex items-center justify-center py-12"
      role="status"
      aria-label="Loading settings"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-sentinel-500 border-t-transparent"
        aria-hidden="true"
      />
      <span className="sr-only">Loading settings...</span>
    </div>
  );
}

export function SettingsLoadFailure({
  copyingDebugReport,
  onClose,
  onCopyDebugReport,
  onOpenFeedback,
  onRetry,
  onSaveDebugReport,
  savingDebugReport,
}: SettingsLoadFailureProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">
        Settings did not load.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm rounded bg-sentinel-500 text-white hover:bg-sentinel-600"
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-600"
        >
          Close
        </button>
      </div>
      <div className="w-full max-w-md pt-2">
        <SettingsSupportSection
          copyingDebugReport={copyingDebugReport}
          onCopyDebugReport={onCopyDebugReport}
          onOpenFeedback={onOpenFeedback}
          onSaveDebugReport={onSaveDebugReport}
          savingDebugReport={savingDebugReport}
        />
      </div>
    </div>
  );
}
