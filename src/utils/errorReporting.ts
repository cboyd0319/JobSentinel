/**
 * Error Reporting System
 *
 * Captures and stores errors for debugging and analysis.
 * Can be extended to integrate with external services like Sentry.
 */

export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  type: 'render' | 'unhandled' | 'promise' | 'api' | 'custom';
  context?: Record<string, unknown>;
  url: string;
  userAgent: string;
}

const MAX_STORED_ERRORS = 100;
const STORAGE_KEY = 'jobsentinel_error_logs';

class ErrorReporter {
  private errors: ErrorReport[] = [];
  private listeners: Set<(errors: ErrorReport[]) => void> = new Set();
  private initialized = false;

  /**
   * Initialize the error reporter and set up global handlers
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Load stored errors
    this.loadFromStorage();

    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      this.capture({
        type: 'unhandled',
        error: error || new Error(String(message)),
        context: { source, lineno, colno },
      });
      return false; // Don't prevent default handling
    };

    // Unhandled promise rejections
    window.onunhandledrejection = (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      this.capture({
        type: 'promise',
        error,
        context: { reason: event.reason },
      });
    };

    // Log initialization
    if (import.meta.env.DEV) {
      console.log('[ErrorReporter] Initialized with', this.errors.length, 'stored errors');
    }
  }

  /**
   * Capture an error
   */
  capture(options: {
    type: ErrorReport['type'];
    error: Error;
    componentStack?: string;
    context?: Record<string, unknown>;
  }): ErrorReport {
    const { type, error, componentStack, context } = options;

    const report: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      componentStack,
      type,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Add to array (newest first)
    this.errors.unshift(report);

    // Keep only recent errors
    if (this.errors.length > MAX_STORED_ERRORS) {
      this.errors = this.errors.slice(0, MAX_STORED_ERRORS);
    }

    // Persist to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners();

    // Log in development
    if (import.meta.env.DEV) {
      console.error(`[ErrorReporter][${type}]`, error.message, {
        report,
        originalError: error,
      });
    }

    return report;
  }

  /**
   * Capture a React error boundary error
   */
  captureReactError(error: Error, componentStack?: string, context?: Record<string, unknown>): ErrorReport {
    return this.capture({
      type: 'render',
      error,
      componentStack,
      context,
    });
  }

  /**
   * Capture an API error
   */
  captureApiError(error: Error, context?: Record<string, unknown>): ErrorReport {
    return this.capture({
      type: 'api',
      error,
      context,
    });
  }

  /**
   * Capture a custom error
   */
  captureCustom(message: string, context?: Record<string, unknown>): ErrorReport {
    return this.capture({
      type: 'custom',
      error: new Error(message),
      context,
    });
  }

  /**
   * Get all stored errors
   */
  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  /**
   * Get error count
   */
  getCount(): number {
    return this.errors.length;
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorReport['type']): ErrorReport[] {
    return this.errors.filter((e) => e.type === type);
  }

  /**
   * Clear all stored errors
   */
  clear(): void {
    this.errors = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear a specific error
   */
  clearError(id: string): void {
    this.errors = this.errors.filter((e) => e.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Export errors as JSON
   */
  export(): string {
    return JSON.stringify({
      exported_at: new Date().toISOString(),
      app_version: '1.2.0',
      error_count: this.errors.length,
      errors: this.errors,
    }, null, 2);
  }

  /**
   * Export errors as a downloadable file
   */
  downloadExport(): void {
    const data = this.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobsentinel-errors-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Subscribe to error updates
   */
  subscribe(listener: (errors: ErrorReport[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const errors = this.getErrors();
    this.listeners.forEach((listener) => listener(errors));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[ErrorReporter] Failed to load from storage:', e);
      this.errors = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors));
    } catch (e) {
      console.warn('[ErrorReporter] Failed to save to storage:', e);
    }
  }
}

// Singleton instance
export const errorReporter = new ErrorReporter();

// Helper function to wrap async functions with error capture
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorReporter.captureApiError(
        error instanceof Error ? error : new Error(String(error)),
        { ...context, args }
      );
      throw error;
    }
  }) as T;
}
