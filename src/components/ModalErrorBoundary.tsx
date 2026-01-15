import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for modals.
 * Unlike the main ErrorBoundary, this allows users to dismiss the modal
 * and continue using the application without a full reload.
 */
class ModalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in development
    if (import.meta.env.DEV) {
      console.error('Modal error:', error, errorInfo);
    }
  }

  private handleDismiss = () => {
    // Reset error state so modal can be opened again
    this.setState({ hasError: false, error: null });
    // Close the modal
    this.props.onClose?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-800 rounded-card shadow-card border dark:border-surface-700 p-6 animate-fade-in">
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
              <h3 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
                {this.props.title || 'Something went wrong'}
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Your data is safe. You can close this and try again.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleDismiss}
                className="flex-1 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 bg-sentinel-500 hover:bg-sentinel-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;
