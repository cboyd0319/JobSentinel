import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { errorReporter } from "../utils/errorReporting";

interface Props {
  children: ReactNode;
  pageName?: string;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for individual pages.
 * Provides a friendlier error UI with options to retry or go back.
 */
class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error with error reporting system
    errorReporter.captureReactError(
      error,
      errorInfo.componentStack || undefined,
      { page: this.props.pageName || "unknown" }
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const { pageName, onBack } = this.props;

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <EmptyState
              illustration="error"
              title={`${pageName || "Page"} Error`}
              description={
                this.state.error?.message ||
                "Something went wrong loading this page. Your data is safe."
              }
            />

            <div className="flex gap-3 justify-center mt-6">
              {onBack && (
                <Button variant="secondary" onClick={onBack}>
                  Go Back
                </Button>
              )}
              <Button onClick={this.handleRetry}>
                Try Again
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm">
                <summary className="cursor-pointer text-surface-600 dark:text-surface-400 font-medium">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
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

export default PageErrorBoundary;
