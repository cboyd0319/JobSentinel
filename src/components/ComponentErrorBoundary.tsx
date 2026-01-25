import { Component, ErrorInfo, ReactNode } from 'react';
import { errorReporter } from '../utils/errorReporting';

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: (error: Error) => ReactNode;
  onError?: (error: Error) => void;
  silentFail?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for individual components and critical sections.
 * Prevents component errors from crashing the entire page.
 *
 * Features:
 * - Isolates component errors
 * - Custom fallback UI
 * - Optional silent failure (just hide component)
 * - Error callback for parent handling
 * - Automatic error reporting
 *
 * Usage:
 * ```tsx
 * <ComponentErrorBoundary componentName="JobList">
 *   <JobList jobs={jobs} />
 * </ComponentErrorBoundary>
 * ```
 */
class ComponentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
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
        location: 'component',
        componentName: this.props.componentName,
        silentFail: this.props.silentFail,
      }
    );

    // Call error callback if provided
    this.props.onError?.(error);

    // Log in development
    if (import.meta.env.DEV) {
      console.error(
        `[ComponentErrorBoundary] Error in component "${this.props.componentName}"`,
        error,
        errorInfo
      );
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      // Silent fail - just don't render anything
      if (this.props.silentFail) {
        return null;
      }

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      // Default error UI - minimal inline error
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {this.props.componentName} Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {this.state.error.message || 'This component failed to load'}
              </p>
              {import.meta.env.DEV && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 dark:text-red-500 cursor-pointer hover:underline">
                    Show details
                  </summary>
                  <pre className="mt-1 text-xs text-red-600 dark:text-red-500 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
