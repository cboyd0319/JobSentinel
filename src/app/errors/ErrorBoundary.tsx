import { Component, ErrorInfo, ReactNode } from 'react';
import { errorReporter, sanitizeTextForStorage } from '../../shared/errorReporting/errorReporter';
import { clearStorage, readStorageValue, writeStorageValue } from '../../shared/browserStorage';
import { logError } from '../../shared/errorReporting/logger';
import { copySanitizedDebugReport, saveSanitizedDebugReport } from '../../shared/errorReporting/supportReport';

const VISUAL_PREFERENCE_KEYS = [
  'jobsentinel-theme',
  'jobsentinel-high-contrast',
] as const;
const PRESERVED_RESET_KEYS = [
  ...VISUAL_PREFERENCE_KEYS,
  'jobsentinel_error_logs',
] as const;

function getSafeErrorMessage(error: Error | null): string {
  return error
    ? 'JobSentinel ran into a problem. App data stays on this device. Try again, or copy a safe support report if it keeps happening. If this happened while saving, check recent changes.'
    : 'JobSentinel ran into a problem. App data stays on this device.';
}

function getSafeErrorStack(error: Error | null): string | null {
  const stack = error?.stack?.trim();
  return stack ? sanitizeTextForStorage(stack) : null;
}

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  debugReportStatus: 'idle' | 'copying' | 'copied' | 'saving' | 'saved' | 'failed';
  debugReportFileName: string | null;
  confirmLocalSettingsReset: boolean;
}

/**
 * Global error boundary for the entire application.
 * Catches unhandled errors and provides recovery options.
 *
 * Features:
 * - Local sanitized problem capture and logging
 * - Retry functionality with error count tracking
 * - Fallback to full reload if too many errors
 * - Custom fallback UI support
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorCount: 0,
    debugReportStatus: 'idle',
    debugReportFileName: null,
    confirmLocalSettingsReset: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      debugReportStatus: 'idle',
      debugReportFileName: null,
      confirmLocalSettingsReset: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Increment error count
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));

    // Capture sanitized error details locally.
    errorReporter.captureReactError(
      error,
      errorInfo.componentStack || undefined,
      {
        location: 'root',
        errorCount: this.state.errorCount + 1,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }
    );

    // Log to console in development
    logError('Global Error Boundary caught error:', { error, errorInfo });
  }

  private handleRetry = () => {
    // If too many errors, force reload
    if (this.state.errorCount >= 3) {
      window.location.reload();
      return;
    }

    // Otherwise, try to recover by resetting state
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyDebugReport = async () => {
    this.setState({ debugReportStatus: 'copying', debugReportFileName: null });

    try {
      await copySanitizedDebugReport(errorReporter.getErrors());
      this.setState({ debugReportStatus: 'copied' });
    } catch (error) {
      logError('Could not copy support report from error boundary:', error);
      this.setState({ debugReportStatus: 'failed' });
    }
  };

  private handleSaveDebugReport = async () => {
    this.setState({ debugReportStatus: 'saving', debugReportFileName: null });

    try {
      const savedFile = await saveSanitizedDebugReport(errorReporter.getErrors());
      this.setState({
        debugReportStatus: savedFile ? 'saved' : 'idle',
        debugReportFileName: savedFile?.fileName ?? null,
      });
    } catch (error) {
      logError('Failed to save support report from error boundary:', error);
      this.setState({ debugReportStatus: 'failed' });
    }
  };

  private handleClearData = () => {
    if (!this.state.confirmLocalSettingsReset) {
      this.setState({ confirmLocalSettingsReset: true });
      return;
    }

    const preservedValues: Array<[string, string]> = [];
    for (const key of PRESERVED_RESET_KEYS) {
      const value = readStorageValue('local', key);
      if (value !== null) {
        preservedValues.push([key, value]);
      }
    }

    clearStorage('local');
    for (const [key, value] of preservedValues) {
      writeStorageValue('local', key, value);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      const showClearData = this.state.errorCount >= 2;
      const safeErrorMessage = getSafeErrorMessage(this.state.error);
      const safeErrorStack = getSafeErrorStack(this.state.error);

      return (
          <div className="min-h-screen bg-surface-900 flex items-center justify-center px-6">
          <div className="relative max-w-md w-full bg-white dark:bg-surface-800 rounded-card shadow-card dark:shadow-none border dark:border-surface-700 p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-danger/10 dark:bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-8 w-8 text-danger"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-display-lg text-surface-900 dark:text-white mb-2">
                JobSentinel needs attention
              </h3>
              <p className="text-surface-600 dark:text-surface-400 mb-2">
                {safeErrorMessage}
              </p>
              {this.state.errorCount > 1 && (
                <p className="text-xs text-danger">
                  This happened {this.state.errorCount} times
                </p>
              )}
            </div>

            <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-lg mb-6">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {showClearData
                  ? "This keeps happening. Copy or save a safe support report first. If resetting the app window does not work, close and reopen JobSentinel; saved jobs and applications stay on this device."
                  : "App data stays on this device. Reset the app window to continue."}
              </p>
            </div>

            <div className="space-y-3">
              {this.state.errorCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-sentinel-500 hover:bg-sentinel-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-2 dark:focus:ring-offset-surface-800"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="w-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800"
              >
                Reset App Window
              </button>

              <button
                onClick={this.handleCopyDebugReport}
                disabled={this.state.debugReportStatus === 'copying'}
                className="w-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                {this.state.debugReportStatus === 'copying'
                  ? 'Copying...'
                  : 'Copy Safe Support Report'}
              </button>

              <button
                onClick={this.handleSaveDebugReport}
                disabled={this.state.debugReportStatus === 'saving'}
                className="w-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                {this.state.debugReportStatus === 'saving'
                  ? 'Saving...'
                  : 'Save Safe Support Report'}
              </button>

              {this.state.debugReportStatus === 'copied' && (
                <p className="text-center text-sm text-success" role="status">
                  Safe support report copied
                </p>
              )}
              {this.state.debugReportStatus === 'saved' && this.state.debugReportFileName && (
                <p className="text-center text-sm text-success" role="status">
                  Safe support report saved: {this.state.debugReportFileName}
                </p>
              )}
              {this.state.debugReportStatus === 'failed' && (
                <p className="text-center text-sm text-danger" role="status">
                  Could not create safe support report
                </p>
              )}

              {showClearData && (
                <>
                  {this.state.confirmLocalSettingsReset && (
                    <p className="text-center text-xs text-danger" role="alert">
                      Reset local app settings? Safe support history and visual
                      preferences stay on this device.
                    </p>
                  )}
                  <button
                    onClick={this.handleClearData}
                    className="w-full bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800"
                  >
                    {this.state.confirmLocalSettingsReset
                      ? 'Confirm Reset Local App Settings'
                      : 'Reset Local App Settings'}
                  </button>
                </>
              )}
            </div>

            {import.meta.env.DEV && safeErrorStack && (
              <details className="mt-6 p-4 bg-surface-100 dark:bg-surface-900/50 rounded-lg">
                <summary className="cursor-pointer text-sm text-surface-600 dark:text-surface-400 font-medium">
                  App problem details
                </summary>
                <pre className="mt-2 text-xs text-danger overflow-auto max-h-48 whitespace-pre-wrap">
                  {safeErrorStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
