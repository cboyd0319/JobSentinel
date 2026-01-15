import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in development - in production, consider sending to error tracking service
    if (import.meta.env.DEV) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-900 flex items-center justify-center px-6">
          {/* Background effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-danger/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-md w-full bg-white dark:bg-surface-800 rounded-card shadow-card dark:shadow-none border dark:border-surface-700 p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
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
                Something went wrong
              </h3>
              <p className="text-surface-600 dark:text-surface-400">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-lg mb-6">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Your data is safe. Try reloading the application to continue.
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-sentinel-500 hover:bg-sentinel-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-sentinel-500 focus:ring-offset-2 dark:focus:ring-offset-surface-800"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
