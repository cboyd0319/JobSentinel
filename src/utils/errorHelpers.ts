/**
 * Error Handling Helpers
 *
 * Common error handling utilities for JobSentinel.
 * These work in conjunction with error boundaries to provide
 * robust error handling throughout the application.
 */

import { errorReporter } from './errorReporting';

/**
 * Error types for better error handling
 */
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  PARSE = 'parse',
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Structured error class with additional context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType = ErrorType.UNKNOWN,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: 'Network connection issue. Please check your internet connection.',
  [ErrorType.API]: 'Service temporarily unavailable. Please try again later.',
  [ErrorType.VALIDATION]: 'Invalid input. Please check your entries.',
  [ErrorType.PARSE]: 'Data format error. Please contact support.',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.UNAUTHORIZED]: 'You do not have permission to access this.',
  [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return ERROR_MESSAGES[error.type] || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return ERROR_MESSAGES[ErrorType.UNKNOWN];
}

/**
 * Determine error type from error object
 */
export function classifyError(error: unknown): ErrorType {
  if (error instanceof AppError) {
    return error.type;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  if (lowerMessage.includes('timeout')) {
    return ErrorType.TIMEOUT;
  }
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    return ErrorType.UNAUTHORIZED;
  }
  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return ErrorType.NOT_FOUND;
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return ErrorType.VALIDATION;
  }
  if (lowerMessage.includes('parse') || lowerMessage.includes('json')) {
    return ErrorType.PARSE;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Handle API errors consistently
 */
export async function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<never> {
  const errorType = classifyError(error);
  const message = getUserMessage(error);

  const appError = new AppError(message, errorType, {
    ...context,
    originalError: error instanceof Error ? error.message : String(error),
  });

  // Report to error tracking
  errorReporter.captureApiError(
    appError,
    appError.context
  );

  throw appError;
}

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>,
  fallback?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Report error
    errorReporter.captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );

    // If fallback provided, return it instead of throwing
    if (fallback !== undefined) {
      return fallback;
    }

    // Re-throw as AppError (handleApiError always throws)
    throw await handleApiError(error, context);
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (error) => {
      const type = classifyError(error);
      return type === ErrorType.NETWORK || type === ErrorType.TIMEOUT;
    },
    onRetry,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if we're out of attempts or error shouldn't be retried
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }

      // Call retry callback if provided
      onRetry?.(attempt + 1, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  // All retries failed, throw last error
  throw lastError;
}

/**
 * Debounced error handler to prevent error spam
 */
export function createDebouncedErrorHandler(
  handler: (error: unknown) => void,
  delay: number = 1000
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastError: unknown = null;

  return (error: unknown) => {
    lastError = error;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastError) {
        handler(lastError);
        lastError = null;
      }
      timeoutId = null;
    }, delay);
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const type = classifyError(error);
  return [
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.API,
  ].includes(type);
}

/**
 * Log error for debugging
 */
export function logErrorDetails(error: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.group('🔴 Error Details');
    console.error('Error:', error);
    console.log('Type:', classifyError(error));
    console.log('Message:', getUserMessage(error));
    if (context) {
      console.log('Context:', context);
    }
    if (error instanceof Error && error.stack) {
      console.log('Stack:', error.stack);
    }
    console.groupEnd();
  }
}

/**
 * Create error from response
 */
export function createErrorFromResponse(
  response: Response,
  context?: Record<string, unknown>
): AppError {
  let type: ErrorType = ErrorType.API;

  if (response.status === 404) {
    type = ErrorType.NOT_FOUND;
  } else if (response.status === 401 || response.status === 403) {
    type = ErrorType.UNAUTHORIZED;
  } else if (response.status === 408 || response.status === 504) {
    type = ErrorType.TIMEOUT;
  } else if (response.status >= 400 && response.status < 500) {
    type = ErrorType.VALIDATION;
  }

  return new AppError(
    `Request failed: ${response.statusText}`,
    type,
    {
      ...context,
      status: response.status,
      statusText: response.statusText,
    }
  );
}
