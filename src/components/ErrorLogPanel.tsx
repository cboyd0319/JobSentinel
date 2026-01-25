import { memo, useState } from 'react';
import { useErrorReporting } from '../contexts/ErrorReportingContext';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card } from './Card';
import type { ErrorReport } from '../utils/errorReporting';

const TYPE_LABELS: Record<ErrorReport['type'], { label: string; variant: 'danger' | 'alert' | 'surface' }> = {
  render: { label: 'React', variant: 'danger' },
  unhandled: { label: 'Runtime', variant: 'danger' },
  promise: { label: 'Promise', variant: 'alert' },
  api: { label: 'API', variant: 'alert' },
  custom: { label: 'Custom', variant: 'surface' },
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
                Stack Trace
              </p>
              <pre className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded overflow-x-auto text-surface-700 dark:text-surface-300 max-h-40">
                {error.stack}
              </pre>
            </div>
          )}

          {error.componentStack && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                Component Stack
              </p>
              <pre className="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded overflow-x-auto text-surface-700 dark:text-surface-300 max-h-32">
                {error.componentStack}
              </pre>
            </div>
          )}

          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                Context
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
              onClick={(e) => {
                e.stopPropagation();
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

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white">
              Error Logs
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {errors.length === 0
                ? 'No errors recorded'
                : `${errors.length} error${errors.length === 1 ? '' : 's'} recorded`}
            </p>
          </div>
          {errors.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportErrors}>
                Export
              </Button>
              <Button size="sm" variant="danger" onClick={clearErrors}>
                Clear All
              </Button>
            </div>
          )}
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
            No errors have been recorded
          </p>
          <p className="text-sm text-surface-500 mt-1">
            Errors will appear here when they occur
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
