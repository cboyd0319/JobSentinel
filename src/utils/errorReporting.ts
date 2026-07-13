/**
 * Error Reporting System
 *
 * Captures and stores errors for debugging and analysis.
 * Can be extended to integrate with external services like Sentry.
 */

import { readStorageValue, removeStorageValue, writeStorageValue } from '../shared/browserStorage';

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
const MAX_CONTEXT_DEPTH = 4;
const MAX_STORED_STRING_LENGTH = 1_000;

const SENSITIVE_KEY_PATTERN = new RegExp(
  [
    "password",
    "passwd",
    "secret",
    "token",
    "api[_-]?key",
    "cookie",
    "webhook",
    "authorization",
    "credential",
    "phone(?:[_-]?number)?",
    "(?:full|candidate|applicant|user|your)[_-]?name",
    "li_at",
    "salary",
    "compensation",
    "resume",
    "cover[_-]?letter",
    "private[_-]?notes?",
    "notes?",
    "application[_-]?(?:history|notes?)?",
    "screening[_-]?(?:question|answer)",
    "question[_-]?text",
    "answer[_-]?text",
    "location[_-]?(?:preference|prefs?)?",
    "career[_-]?goals?",
    "personal[_-]?circumstances?",
  ].join("|"),
  "i",
);
const URL_PATTERN = /https?:\/\/[^\s"'<>\\)]+/gi;
const USER_PATH_PATTERN = /\/(?:Users|home)\/[^/\s]+/g;
const WINDOWS_USER_PATH_PATTERN = /[A-Za-z]:\\Users\\[^\\\s]+/g;
const LOCAL_UNIX_PATH_PATTERN = /\/(?:private\/var|var\/folders|tmp|var\/tmp|run\/user|Volumes)\/[^\s"'<>\\)]+/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\([2-9][0-9]{2}\)|[2-9][0-9]{2})[\s.-]?[2-9][0-9]{2}[\s.-]?[0-9]{4}\b/g;
const LINKEDIN_COOKIE_PATTERN = /li_at=[^\s;]+/g;
const TOKEN_PATTERN = /\b(?:Bearer\s+[^\s]+|token(?:\s+|=)[^\s&]+|api_key=[^\s&]+|access_token=[^\s&]+|refresh_token=[^\s&]+|secret=[^\s&]+|password=[^\s&]+)/gi;
const WEBHOOK_PATTERN = /https:\/\/(?:hooks\.slack\.com|discord(?:app)?\.com\/api\/webhooks|outlook\.office(?:365)?\.com\/webhook|(?:[a-z0-9-]+\.)+webhook\.office\.com|(?:[a-z0-9-]+\.)+logic\.azure\.com|hooks\.discord\.com\/api\/webhooks|hooks\.teams\.com\/workflows)[^\s"'<>\\)]*/gi;
const SENSITIVE_LABELED_TEXT_PATTERNS = [
  /\b((?:salary|compensation)(?:[_ -]?(?:floor|expectation|range|preference|prefs?))?\s*[:=]\s*)[^\n\r;|]+/gi,
  /\b((?:resume|cover letter)(?:[_ -]?(?:text|data|content|summary))?\s*[:=]\s*)[^\n\r;|]+/gi,
  /\b((?:private notes?|application history|application notes?|screening question|screening answer|answer text|question text|career goals?|personal circumstances?|(?:full|candidate|applicant|user|your)[_ -]?name)\s*[:=]\s*)[^\n\r;|]+/gi,
];
const PERSON_NAME_STATEMENT_PATTERN = /\b((?:my|candidate|applicant|user)\s+name)\s+(?:is|was)\s+[^\n\r;|]+/gi;

function truncateStoredString(value: string): string {
  if (value.length <= MAX_STORED_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STORED_STRING_LENGTH)}...[truncated]`;
}

function sanitizeUrlForStorage(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '[URL]';
  }
}

export function sanitizeTextForStorage(value: string): string {
  let sanitized = value;

  sanitized = sanitized.replace(WEBHOOK_PATTERN, '[WEBHOOK_CONFIGURED]');
  sanitized = sanitized.replace(LINKEDIN_COOKIE_PATTERN, 'li_at=[REDACTED]');
  sanitized = sanitized.replace(USER_PATH_PATTERN, '/[USER_PATH]');
  sanitized = sanitized.replace(WINDOWS_USER_PATH_PATTERN, 'C:\\[USER_PATH]');
  sanitized = sanitized.replace(LOCAL_UNIX_PATH_PATTERN, '/[LOCAL_PATH]');
  sanitized = sanitized.replace(URL_PATTERN, (url) => sanitizeUrlForStorage(url));
  sanitized = sanitized.replace(EMAIL_PATTERN, '[EMAIL]');
  sanitized = sanitized.replace(PHONE_PATTERN, '[PHONE]');
  sanitized = sanitized.replace(TOKEN_PATTERN, '[TOKEN]');
  for (const pattern of SENSITIVE_LABELED_TEXT_PATTERNS) {
    sanitized = sanitized.replace(pattern, '$1[REDACTED]');
  }
  sanitized = sanitized.replace(PERSON_NAME_STATEMENT_PATTERN, '$1 [REDACTED]');

  return truncateStoredString(sanitized);
}

function sanitizeContextValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (typeof value === 'string') {
    return sanitizeTextForStorage(value);
  }

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return value;
  }

  if (depth >= MAX_CONTEXT_DEPTH) {
    return '[DEPTH_LIMIT]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeTextForStorage(value.message),
      stack: value.stack ? sanitizeTextForStorage(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeContextValue(item, depth + 1, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[CIRCULAR]';
    }
    seen.add(value);

    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : sanitizeContextValue(nestedValue, depth + 1, seen);
    }
    return sanitized;
  }

  return String(value);
}

export function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }

  return sanitizeContextValue(context) as Record<string, unknown>;
}

export function sanitizeStorageWarningError(error: unknown): unknown {
  return sanitizeContextValue(error);
}

function sanitizeConsoleValueForLogging(value: unknown): unknown {
  if (value instanceof Error) {
    return sanitizeStorageWarningError(value);
  }

  if (typeof value === 'string') {
    return sanitizeTextForStorage(value);
  }

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return value;
  }

  return sanitizeContextValue(value);
}

export function sanitizeConsoleArgsForLogging(args: unknown[]): unknown[] {
  return args.map((arg) => sanitizeConsoleValueForLogging(arg));
}

const ERROR_REPORT_TYPES = new Set<ErrorReport['type']>([
  'render',
  'unhandled',
  'promise',
  'api',
  'custom',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isErrorReport(value: unknown): value is ErrorReport {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.timestamp === 'string' &&
    Number.isFinite(Date.parse(value.timestamp)) &&
    typeof value.message === 'string' &&
    (value.stack === undefined || typeof value.stack === 'string') &&
    (value.componentStack === undefined || typeof value.componentStack === 'string') &&
    typeof value.type === 'string' &&
    ERROR_REPORT_TYPES.has(value.type as ErrorReport['type']) &&
    (value.context === undefined || isRecord(value.context)) &&
    typeof value.url === 'string' &&
    typeof value.userAgent === 'string'
  );
}

function sanitizeStoredReport(report: ErrorReport): ErrorReport {
  return {
    ...report,
    message: sanitizeTextForStorage(report.message),
    stack: report.stack ? sanitizeTextForStorage(report.stack) : undefined,
    componentStack: report.componentStack
      ? sanitizeTextForStorage(report.componentStack)
      : undefined,
    context: sanitizeContext(report.context),
    url: sanitizeUrlForStorage(report.url),
    userAgent: sanitizeTextForStorage(report.userAgent),
  };
}

export function parseStoredErrorReports(stored: string): ErrorReport[] {
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(isErrorReport)
    .slice(0, MAX_STORED_ERRORS)
    .map((report) => sanitizeStoredReport(report));
}

class ErrorReporter {
  private errors: ErrorReport[] = [];
  private listeners: Set<(errors: ErrorReport[]) => void> = new Set();
  private initialized = false;
  private originalConsoleError: typeof console.error | null = null;

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
      return true;
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

      event.preventDefault();
    };

    // Console error override captures locally and forwards only sanitized values.
    const originalConsoleError = console.error;
    this.originalConsoleError = originalConsoleError;
    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, sanitizeConsoleArgsForLogging(args));

      // Capture if it's an error object
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.startsWith('[ErrorReporter]')) {
        return;
      }

      if (firstArg instanceof Error) {
        this.capture({
          type: 'custom',
          error: firstArg,
          context: { consoleArgs: args.slice(1) },
        });
      } else if (typeof firstArg === 'string' && firstArg.toLowerCase().includes('error')) {
        // Capture string errors too
        this.capture({
          type: 'custom',
          error: new Error(String(firstArg)),
          context: { consoleArgs: args.slice(1) },
        });
      }
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
    const storedReport = sanitizeStoredReport(report);

    // Add to array (newest first)
    this.errors.unshift(storedReport);

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
      const logError = this.originalConsoleError ?? console.error;
      logError(`[ErrorReporter][${type}]`, storedReport.message, {
        report: storedReport,
      });
    }

    return storedReport;
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
    const errors = this.errors.map((report) => sanitizeStoredReport(report));

    return JSON.stringify({
      exported_at: new Date().toISOString(),
      app_version: __APP_VERSION__,
      error_count: errors.length,
      errors,
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
      const stored = readStorageValue('local', STORAGE_KEY);
      if (stored) {
        this.errors = parseStoredErrorReports(stored);
        this.saveToStorage();
      }
    } catch (e: unknown) {
      console.warn('[ErrorReporter] Failed to load from storage:', sanitizeStorageWarningError(e));
      this.errors = [];
      removeStorageValue('local', STORAGE_KEY);
    }
  }

  private saveToStorage(): void {
    try {
      writeStorageValue('local', STORAGE_KEY, JSON.stringify(this.errors));
    } catch (e: unknown) {
      console.warn('[ErrorReporter] Failed to save to storage:', sanitizeStorageWarningError(e));
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
    } catch (error: unknown) {
      errorReporter.captureApiError(
        error instanceof Error ? error : new Error(String(error)),
        { ...context, args }
      );
      throw error;
    }
  }) as T;
}

// Helper to safely execute a function and capture errors
export function trySafe<T>(
  fn: () => T,
  fallback: T,
  context?: Record<string, unknown>
): T {
  try {
    return fn();
  } catch (error: unknown) {
    errorReporter.captureCustom(
      error instanceof Error ? error.message : String(error),
      context
    );
    return fallback;
  }
}

// Helper for async safe execution
export async function tryAsyncSafe<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    errorReporter.captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    return fallback;
  }
}

// Helper to create error context from component props
export function createErrorContext(
  componentName: string,
  props?: Record<string, unknown>
): Record<string, unknown> {
  return {
    component: componentName,
    props: props ? JSON.parse(JSON.stringify(props, (_, v) => {
      // Remove functions and complex objects from props for logging
      if (typeof v === 'function') return '[Function]';
      if (v instanceof Error) return v.message;
      return v;
    })) : undefined,
    timestamp: new Date().toISOString(),
  };
}
