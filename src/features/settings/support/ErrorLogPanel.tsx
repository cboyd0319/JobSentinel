import { memo, useState } from 'react';
import { useErrorReporting } from '../../../hooks/useErrorReporting';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { Card } from '../../../ui/Card';
import {
  sanitizeContext,
  type ErrorReport,
} from '../../../utils/errorReporting';
import { copySanitizedDebugReport, saveSanitizedDebugReport } from '../../../services/feedbackService';
import { logError } from '../../../utils/errorUtils';

const TYPE_LABELS: Record<ErrorReport['type'], { label: string; variant: 'danger' | 'alert' | 'surface' }> = {
  render: { label: 'Screen', variant: 'danger' },
  unhandled: { label: 'App', variant: 'danger' },
  promise: { label: 'Task', variant: 'alert' },
  api: { label: 'Connection', variant: 'alert' },
  custom: { label: 'App', variant: 'surface' },
};

function formatSafeTextForDisplay(value: string): string {
  return value
    .replace(/\[WEBHOOK_CONFIGURED\]/g, 'notification link hidden')
    .replace(/li_at=\[REDACTED\]/g, 'browser session hidden')
    .replace(/\[EMAIL\]/g, 'email hidden')
    .replace(/\[TOKEN\]/g, 'private token hidden')
    .replace(/\/\[USER_PATH\]/g, 'file path hidden')
    .replace(/C:\\\[USER_PATH\]/g, 'file path hidden')
    .replace(/\[REDACTED\]/g, 'private value hidden')
    .replace(/\[URL\]/g, 'link hidden');
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

function formatContextLabel(key: string): string {
  const normalized = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (normalized === 'url') {
    return 'link';
  }

  if (normalized === 'job url') {
    return 'job link';
  }

  return normalized;
}

function formatContextValue(value: unknown): string {
  if (value === null) {
    return 'Not set';
  }

  if (value === undefined) {
    return 'Not available';
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? 'Empty' : formatSafeTextForDisplay(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length === 0
      ? 'None'
      : `${value.length} item${value.length === 1 ? '' : 's'} summarized`;
  }

  if (typeof value === 'object') {
    return 'Details summarized';
  }

  return String(value);
}

function getReadableContextRows(
  context?: Record<string, unknown>
): Array<{ key: string; label: string; value: string }> {
  const sanitizedContext = sanitizeContext(context);

  if (!sanitizedContext) {
    return [];
  }

  return Object.entries(sanitizedContext).map(([key, value]) => ({
    key,
    label: formatContextLabel(key),
    value: formatContextValue(value),
  }));
}

interface ErrorItemProps {
  error: ErrorReport;
  onClear: (id: string) => void;
}

const ErrorItem = memo(function ErrorItem({ error, onClear }: ErrorItemProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = TYPE_LABELS[error.type];
  const appDetailRows = getReadableContextRows(error.context);
  const hasSupportDetails = Boolean(error.stack || error.componentStack);
  const safeProblemSummary =
    'JobSentinel recorded a problem. App data stays on this device.';

  return (
    <div className="border-b border-surface-200 dark:border-surface-700 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 shrink-0">
          <Badge variant={typeInfo.variant} size="sm">
            {typeInfo.label}
          </Badge>
        </span>
        <div className="flex-1 min-w-0">
          <p className="break-words text-sm font-medium text-surface-900 [overflow-wrap:anywhere] dark:text-white">
            {safeProblemSummary}
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            {formatRelativeTime(error.timestamp)}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-surface-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {hasSupportDetails && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                Extra details kept hidden
              </p>
              <p className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded text-surface-700 dark:text-surface-300">
                This screen hides crash details. Copy or save a safe support
                report only if JobSentinel help asks, then review it before
                sharing.
              </p>
            </div>
          )}

          {appDetailRows.length > 0 && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                Problem details
              </p>
              <dl className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded text-surface-700 dark:text-surface-300 space-y-1">
                {appDetailRows.map((row) => (
                  <div key={row.key} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                    <dt className="font-medium text-surface-600 dark:text-surface-300">
                      {row.label}
                    </dt>
                    <dd className="break-words text-surface-700 dark:text-surface-300">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-surface-400">
              {new Date(error.timestamp).toLocaleString('en-US')}
            </p>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onClear(error.id);
              }}
            >
              Remove from List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export const ErrorLogPanel = memo(function ErrorLogPanel() {
  const { errors, clearErrors, clearError, exportErrors } = useErrorReporting();
  const [copyingReport, setCopyingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const handleCopyDebugReport = async () => {
    setCopyingReport(true);
    setCopyMessage(null);

    try {
      await copySanitizedDebugReport(errors);
      setCopyMessage("Safe support report copied");
    } catch (error) {
      logError("Failed to copy support report:", error);
      setCopyMessage("Could not copy safe support report");
    } finally {
      setCopyingReport(false);
    }
  };

  const handleSaveDebugReport = async () => {
    setSavingReport(true);
    setCopyMessage(null);

    try {
      const savedFile = await saveSanitizedDebugReport(errors);
      setCopyMessage(
        savedFile
          ? `Safe support report saved: ${savedFile.fileName}`
          : "Safe support report not saved"
      );
    } catch (error) {
      logError("Failed to save support report:", error);
      setCopyMessage("Could not save safe support report");
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white">
              Recent Problems
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {errors.length === 0
                ? 'No problems recorded'
                : `${errors.length} problem${errors.length === 1 ? '' : 's'} recorded`}
            </p>
            {copyMessage && (
              <p
                className="text-xs text-surface-500 dark:text-surface-400 mt-1"
                role="status"
              >
                {copyMessage}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyDebugReport}
              loading={copyingReport}
              loadingText="Copying..."
            >
              Copy Safe Support Report
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveDebugReport}
              loading={savingReport}
              loadingText="Saving..."
            >
              Save Safe Support Report
            </Button>
            {errors.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={exportErrors}
                  title="Only use this if JobSentinel help asks. Review before sharing; it may include private app details."
                >
                  Save Extra Problem Details
                </Button>
                <Button size="sm" variant="danger" onClick={clearErrors}>
                  Clear Problem List
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-surface-600 dark:text-surface-400">
            No problems have been recorded
          </p>
          <p className="text-sm text-surface-500 mt-1">
            Problems will appear here when they occur
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {errors.map((error) => (
            <ErrorItem key={error.id} error={error} onClear={clearError} />
          ))}
        </div>
      )}
    </Card>
  );
});
