import { Component, ErrorInfo, ReactNode } from 'react';
import { errorReporter, sanitizeTextForStorage } from '../utils/errorReporting';
import { logError } from '../utils/errorUtils';
import {
  copySanitizedDebugReport,
  saveSanitizedDebugReport,
} from '../services/feedbackService';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  title?: string;
  modalName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  debugReportStatus: 'idle' | 'copying' | 'copied' | 'saving' | 'saved' | 'failed';
  debugReportFileName: string | null;
}

function safeModalErrorMessage(error: Error | null): string {
  return error
    ? 'This window could not load. App data stays on this device. Close it and try again.'
    : 'This window needs attention. App data stays on this device.';
}

function safeModalErrorDetails(error: Error | null): string {
  if (!error?.stack) {
    return 'No app problem details available.';
  }

  return sanitizeTextForStorage(error.stack);
}

/**
 * Error boundary specifically for modals.
 * Unlike the main ErrorBoundary, this allows users to dismiss the modal
 * and continue using the application without a full reload.
 *
 * Features:
 * - Graceful error handling without app crash
 * - Retry functionality with count tracking
 * - Automatic error reporting
 * - Modal-specific context for debugging
 */
class ModalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    debugReportStatus: 'idle',
    debugReportFileName: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error with error reporting system
    errorReporter.captureReactError(
      error,
      errorInfo.componentStack || undefined,
      {
        location: 'modal',
        modalName: this.props.modalName || 'unknown',
        title: this.props.title,
        retryCount: this.state.retryCount,
      }
    );

    // Log in development
    logError(`[ModalErrorBoundary] Error in modal "${this.props.modalName || this.props.title}"`, {
      error,
      errorInfo,
    });
  }

  private handleDismiss = () => {
    // Reset error state so modal can be opened again
    this.setState({ hasError: false, error: null, retryCount: 0 });
    // Close the modal
    this.props.onClose?.();
  };

  private handleRetry = () => {
    // Increment retry count
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      debugReportStatus: 'idle',
      debugReportFileName: null,
    }));
  };

  private handleCopyDebugReport = async () => {
    this.setState({ debugReportStatus: 'copying', debugReportFileName: null });

    try {
      await copySanitizedDebugReport(errorReporter.getErrors());
      this.setState({ debugReportStatus: 'copied' });
    } catch (error) {
      logError('Failed to copy support report from modal boundary:', error);
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
      logError('Failed to save support report from modal boundary:', error);
      this.setState({ debugReportStatus: 'failed' });
    }
  };

  public render() {
    if (this.state.hasError) {
      const showRetryWarning = this.state.retryCount >= 2;

      return (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-error-title"
        >
          <div className="w-full max-w-md bg-white dark:bg-surface-800 rounded-card shadow-card border dark:border-surface-700 p-6 motion-safe:animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-6 w-6 text-danger"
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
              <h3
                id="modal-error-title"
                className="font-display text-display-md text-surface-900 dark:text-white mb-2"
              >
                {this.props.title || 'This window needs attention'}
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">
                {safeModalErrorMessage(this.state.error)}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {showRetryWarning
                  ? "This keeps happening. Copy or save a safe support report before closing this window."
                  : "App data stays on this device. You can close this and try again."}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Tried again {this.state.retryCount} {this.state.retryCount === 1 ? "time" : "times"}
                </p>
              )}
            </div>

            {showRetryWarning && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  This feature may be temporarily unavailable. Copy or save a safe support report first, then close this window.
                </p>
              </div>
            )}

            <div className="mb-4 grid grid-cols-1 gap-2">
              <button
                onClick={this.handleCopyDebugReport}
                disabled={this.state.debugReportStatus === 'copying'}
                className="w-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {this.state.debugReportStatus === 'copying'
                  ? 'Copying...'
                  : 'Copy Safe Support Report'}
              </button>

              <button
                onClick={this.handleSaveDebugReport}
                disabled={this.state.debugReportStatus === 'saving'}
                className="w-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
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
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleDismiss}
                className="flex-1 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-surface-400 focus:ring-offset-2"
                aria-label="Close problem dialog"
              >
                Close
              </button>
              {!showRetryWarning && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-sentinel-500 hover:bg-sentinel-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-2"
                  aria-label="Try again"
                >
                  Try Again
                </button>
              )}
            </div>

            {import.meta.env.DEV && this.state.error?.stack && (
              <details className="mt-4 p-3 bg-surface-100 dark:bg-surface-900/50 rounded-lg">
                <summary className="cursor-pointer text-xs text-surface-600 dark:text-surface-400 font-medium">
                  App problem details
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32 whitespace-pre-wrap">
                  {safeModalErrorDetails(this.state.error)}
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

export default ModalErrorBoundary;
