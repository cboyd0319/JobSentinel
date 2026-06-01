import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { errorReporter, sanitizeTextForStorage } from "../utils/errorReporting";
import { logError } from "../utils/errorUtils";
import { saveSanitizedDebugReport } from "../services/feedbackService";

function getSafeErrorMessage(error: Error | null): string {
  return error
    ? "This page needs attention. Your data is safe. Try again, go back, or save a safe support report if it keeps happening."
    : "This page needs attention. Your data is safe.";
}

function getSafeErrorStack(error: Error | null): string | null {
  const stack = error?.stack?.trim();
  return stack ? sanitizeTextForStorage(stack) : null;
}

interface Props {
  children: ReactNode;
  pageName?: string;
  onBack?: () => void;
  fallback?: (error: Error, retry: () => void, goBack?: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  reportStatus: "idle" | "saving" | "saved" | "failed";
  reportFileName: string | null;
}

/**
 * Error boundary for individual pages.
 * Provides a friendlier error UI with options to retry or go back.
 *
 * Features:
 * - Page-specific error handling without full app crash
 * - Retry functionality with count tracking
 * - Navigation back to safety
 * - Custom fallback UI support
 * - Automatic error reporting
 */
class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    reportStatus: "idle",
    reportFileName: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, reportStatus: "idle", reportFileName: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error with error reporting system
    errorReporter.captureReactError(
      error,
      errorInfo.componentStack || undefined,
      {
        location: 'page',
        page: this.props.pageName || "unknown",
        retryCount: this.state.retryCount,
        hasBackButton: !!this.props.onBack,
      }
    );

    // Log in development
    logError(`[PageErrorBoundary] Error on page "${this.props.pageName}"`, {
      error,
      errorInfo,
    });
  }

  private handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  private handleBack = () => {
    // Reset state before navigating
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      reportStatus: "idle",
      reportFileName: null,
    });
    this.props.onBack?.();
  };

  private handleSaveDebugReport = async () => {
    this.setState({ reportStatus: "saving", reportFileName: null });

    try {
      const savedFile = await saveSanitizedDebugReport(errorReporter.getErrors());
      this.setState({
        reportStatus: savedFile ? "saved" : "idle",
        reportFileName: savedFile?.fileName ?? null,
      });
    } catch (error) {
      logError("Failed to save debug report from page error boundary:", error);
      this.setState({ reportStatus: "failed" });
    }
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const { pageName, onBack, fallback } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback(this.state.error, this.handleRetry, onBack ? this.handleBack : undefined);
      }

      // Show warning if multiple retries
      const showRetryWarning = this.state.retryCount >= 2;
      const safeErrorMessage = getSafeErrorMessage(this.state.error);
      const safeErrorStack = getSafeErrorStack(this.state.error);

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <EmptyState
              illustration="error"
              title={`${pageName || "This page"} needs attention`}
              description={safeErrorMessage}
            />

            {showRetryWarning && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This keeps happening. This page may be temporarily unavailable.
                  {onBack && " Try going back to the previous page."}
                </p>
              </div>
            )}

            {this.state.retryCount > 0 && (
              <p className="text-center text-sm text-surface-500 dark:text-surface-400 mt-4">
                Tried again {this.state.retryCount} {this.state.retryCount === 1 ? "time" : "times"}
              </p>
            )}

            <div className="flex gap-3 justify-center mt-6">
              {onBack && (
                <Button variant="secondary" onClick={this.handleBack}>
                  Go Back
                </Button>
              )}
              {!showRetryWarning && (
                <Button onClick={this.handleRetry}>
                  Try Again
                </Button>
              )}
              {showRetryWarning && (
                <Button onClick={() => window.location.reload()}>
                  Reload App
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={this.handleSaveDebugReport}
                loading={this.state.reportStatus === "saving"}
                loadingText="Saving..."
              >
                Save Safe Support Report
              </Button>
            </div>

            {this.state.reportStatus === "saved" && this.state.reportFileName && (
              <p className="text-center text-sm text-success mt-4" role="status">
                Safe support report saved: {this.state.reportFileName}
              </p>
            )}
            {this.state.reportStatus === "failed" && (
              <p className="text-center text-sm text-danger mt-4" role="status">
                Could not save safe support report
              </p>
            )}

            {import.meta.env.DEV && safeErrorStack && (
              <details className="mt-6 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm">
                <summary className="cursor-pointer text-surface-600 dark:text-surface-400 font-medium">
                  Support details (development only)
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap max-h-64">
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

export default PageErrorBoundary;
