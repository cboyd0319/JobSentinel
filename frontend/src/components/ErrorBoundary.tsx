/**
 * Error Boundary Component
 * 
 * Catches React errors and displays a user-friendly fallback UI.
 * Implements error recovery and logging.
 */

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // In production, you could send this to an error tracking service
    // For now, we keep it local (privacy-first)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-4">
            <div className="bg-white shadow-lg rounded-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center mb-4">
                <svg
                  className="w-6 h-6 text-red-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">
                  Something went wrong
                </h2>
              </div>

              <p className="text-gray-600 mb-4">
                We encountered an unexpected error. Don't worry, your data is safe and stored locally.
              </p>

              {this.state.error && (
                <details className="mb-4 text-sm">
                  <summary className="cursor-pointer text-gray-700 font-medium mb-2">
                    Error details
                  </summary>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                      {this.state.error.toString()}
                      {this.state.errorInfo && (
                        <>
                          {'\n\n'}
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Go Home
                </button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>
                100% Privacy Protected - All data stays local
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
