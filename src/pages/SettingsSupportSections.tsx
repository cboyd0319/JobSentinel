import { ErrorLogPanel } from "../components/ErrorLogPanel";
import { HelpIcon } from "../components/HelpIcon";
import { FeedbackIcon } from "./DashboardIcons";
import {
  ExportIcon,
  HealthIcon,
  ImportIcon,
  SettingsSymbol,
} from "./SettingsIcons";

interface SettingsHelpStatusSectionProps {
  onShowHealthDashboard: () => void;
}

interface SettingsBackupSectionProps {
  onExportConfig: () => void;
  onImportConfig: () => void | Promise<void>;
}

interface SettingsSupportSectionProps {
  copyingDebugReport: boolean;
  onCopyDebugReport: () => void | Promise<void>;
  onOpenFeedback: () => void;
  onSaveDebugReport: () => void | Promise<void>;
  savingDebugReport: boolean;
}

export function SettingsHelpStatusSection({
  onShowHealthDashboard,
}: SettingsHelpStatusSectionProps) {
  return (
    <section className="mb-6">
      <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Help and Status
        <HelpIcon text="Check job-source status or save a safe support report if you need help." />
      </h3>

      <div className="mb-4">
        <button
          onClick={onShowHealthDashboard}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors w-full justify-center"
        >
          <HealthIcon className="w-5 h-5 text-sentinel-500" />
          View Job Sources
        </button>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 text-center">
          See which sources are working and what to try next
        </p>
      </div>

      <ErrorLogPanel />
    </section>
  );
}

export function SettingsBackupSection({
  onExportConfig,
  onImportConfig,
}: SettingsBackupSectionProps) {
  return (
    <div className="mb-4">
      <div className="flex gap-3">
        <button
          onClick={onImportConfig}
          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
          title="Restore settings from a backup file"
        >
          <ImportIcon className="w-4 h-4" />
          Restore Settings
        </button>
        <button
          onClick={onExportConfig}
          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
          title="Save your current settings to a private backup file"
          aria-describedby="settings-backup-privacy-note"
        >
          <ExportIcon className="w-4 h-4" />
          Backup Settings
        </button>
      </div>
      <p
        id="settings-backup-privacy-note"
        className="mt-2 text-xs text-surface-500 dark:text-surface-400"
      >
        Settings backups are private files. They can include job titles, pay
        choices, locations, company preferences, and alert settings. Do not
        attach them to support requests; use a safe support report instead.
      </p>
    </div>
  );
}

export function SettingsSupportSection({
  copyingDebugReport,
  onCopyDebugReport,
  onOpenFeedback,
  onSaveDebugReport,
  savingDebugReport,
}: SettingsSupportSectionProps) {
  return (
    <section className="mb-4" aria-labelledby="settings-support-heading">
      <h3
        id="settings-support-heading"
        className="font-medium text-surface-800 dark:text-surface-200"
      >
        Help and Support
      </h3>
      <p className="mt-1 mb-3 text-xs text-surface-500 dark:text-surface-400">
        Safe support reports hide common private details before copy or save.
        Review the report before sharing it.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onOpenFeedback}
          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
          title="Get help, report a problem, or suggest an improvement"
        >
          <FeedbackIcon className="w-4 h-4" />
          Send Feedback
        </button>
        <button
          onClick={onCopyDebugReport}
          disabled={copyingDebugReport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
          title="Copy a safe support report you can share only if you want help"
        >
          <SettingsSymbol icon="clipboard" className="w-4 h-4" />
          {copyingDebugReport
            ? "Copying Safe Support Report..."
            : "Copy Safe Support Report"}
        </button>
        <button
          onClick={onSaveDebugReport}
          disabled={savingDebugReport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
          title="Save a safe support report you can share only if you want help"
        >
          <SettingsSymbol icon="document" className="w-4 h-4" />
          {savingDebugReport
            ? "Saving Safe Support Report..."
            : "Save Safe Support Report"}
        </button>
      </div>
    </section>
  );
}
