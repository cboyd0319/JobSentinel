import { Component, ErrorInfo, ReactNode } from 'react';
import { errorReporter } from '../utils/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Global error boundary for the entire application.
 * Catches unhandled errors and provides recovery options.
 *
 * Features:
 * - Automatic error reporting and logging
 * - Retry functionality with error count tracking
 * - Fallback to full reload if too many errors
 * - Custom fallback UI support
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Increment error count
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));

    // Capture error with error reporting system
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
    if (import.meta.env.DEV) {
      console.error('Global Error Boundary caught error:', error, errorInfo);
    }
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

  private handleClearData = () => {
    // Clear all localStorage except theme preference
    const theme = localStorage.getItem('jobsentinel_theme');
    localStorage.clear();
    if (theme) {
      localStorage.setItem('jobsentinel_theme', theme);
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

      return (
        <div className="min-h-screen bg-surface-900 flex items-center justify-center px-6">
          {/* Background effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-danger/10 rounded-full blur-3xl" />
          </div>

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
                Application Error
              </h3>
              <p className="text-surface-600 dark:text-surface-400 mb-2">
                {this.state.error.message || 'An unexpected error occurred'}
              </p>
              {this.state.errorCount > 1 && (
                <p className="text-xs text-danger">
                  Error occurred {this.state.errorCount} times
                </p>
              )}
            </div>

            <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-lg mb-6">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {showClearData
                  ? "Multiple errors detected. Try clearing app data or reloading."
                  : "Your data is safe. Try reloading the application to continue."}
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
                className="w-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-surface-400 focus:ring-offset-2 dark:focus:ring-offset-surface-800"
              >
                Reload Application
              </button>

              {showClearData && (
                <button
                  onClick={this.handleClearData}
                  className="w-full bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 dark:focus:ring-offset-surface-800"
                >
                  Clear App Data & Reload
                </button>
              )}
            </div>

            {import.meta.env.DEV && this.state.error.stack && (
              <details className="mt-6 p-4 bg-surface-100 dark:bg-surface-900/50 rounded-lg">
                <summary className="cursor-pointer text-sm text-surface-600 dark:text-surface-400 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-danger overflow-auto max-h-48 whitespace-pre-wrap">
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

export default ErrorBoundary;
