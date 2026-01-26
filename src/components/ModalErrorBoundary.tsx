import { Component, ErrorInfo, ReactNode } from 'react';
import { errorReporter } from '../utils/errorReporting';

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
    if (import.meta.env.DEV) {
      console.error(
        `[ModalErrorBoundary] Error in modal "${this.props.modalName || this.props.title}"`,
        error,
        errorInfo
      );
    }
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
    }));
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
                {this.props.title || 'Something went wrong'}
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {showRetryWarning
                  ? "Multiple errors detected. Please close and try again later."
                  : "Your data is safe. You can close this and try again."}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Retry attempt {this.state.retryCount}
                </p>
              )}
            </div>

            {showRetryWarning && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  This feature may be temporarily unavailable. Try closing and checking back later.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleDismiss}
                className="flex-1 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-surface-400 focus:ring-offset-2"
                aria-label="Close error dialog"
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
                  Error Stack (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32 whitespace-pre-wrap">
                  {this.state.error.stack}
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
