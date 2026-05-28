import { memo, useState } from 'react';
import { useErrorReporting } from '../hooks/useErrorReporting';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card } from './Card';
import type { ErrorReport } from '../utils/errorReporting';
import { copySanitizedDebugReport } from '../services/feedbackService';
import { logError } from '../utils/errorUtils';

const TYPE_LABELS: Record<ErrorReport['type'], { label: string; variant: 'danger' | 'alert' | 'surface' }> = {
  render: { label: 'Screen', variant: 'danger' },
  unhandled: { label: 'App', variant: 'danger' },
  promise: { label: 'Task', variant: 'alert' },
  api: { label: 'Connection', variant: 'alert' },
  custom: { label: 'App', variant: 'surface' },
};

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

interface ErrorItemProps {
  error: ErrorReport;
  onClear: (id: string) => void;
}

const ErrorItem = memo(function ErrorItem({ error, onClear }: ErrorItemProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = TYPE_LABELS[error.type];

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
          <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
            {error.message}
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
          {error.stack && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                Details for support
              </p>
              <pre className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded overflow-x-auto text-surface-700 dark:text-surface-300 max-h-40">
                {error.stack}
              </pre>
            </div>
          )}

          {error.componentStack && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                Screen details
              </p>
              <pre className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded overflow-x-auto text-surface-700 dark:text-surface-300 max-h-32">
                {error.componentStack}
              </pre>
            </div>
          )}

          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                App details
              </p>
              <pre className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded overflow-x-auto text-surface-700 dark:text-surface-300">
                {JSON.stringify(error.context, null, 2)}
              </pre>
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
              Dismiss
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
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const handleCopyDebugReport = async () => {
    setCopyingReport(true);
    setCopyMessage(null);

    try {
      await copySanitizedDebugReport(errors);
      setCopyMessage("Safe debug report copied");
    } catch (error) {
      logError("Failed to copy debug report:", error);
      setCopyMessage("Could not copy safe debug report");
    } finally {
      setCopyingReport(false);
    }
  };

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white">
              App Problem History
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
              Copy Safe Debug Report
            </Button>
            {errors.length > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={exportErrors}>
                  Save Problem List
                </Button>
                <Button size="sm" variant="danger" onClick={clearErrors}>
                  Clear All
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
