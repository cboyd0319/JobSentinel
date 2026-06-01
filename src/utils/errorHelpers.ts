/**
 * Error Handling Helpers
 *
 * Common error handling utilities for JobSentinel.
 * These work in conjunction with error boundaries to provide
 * robust error handling throughout the application.
 */

import {
  errorReporter,
  sanitizeContext,
  sanitizeTextForStorage,
} from './errorReporting';

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
  [ErrorType.NETWORK]: 'Could not connect. Check your internet connection.',
  [ErrorType.API]: 'This service is unavailable right now. Please try again later.',
  [ErrorType.VALIDATION]: 'Some information needs review. Check your entries.',
  [ErrorType.PARSE]: 'JobSentinel could not read that data. Try again, or copy a safe support report if you need help.',
  [ErrorType.NOT_FOUND]: 'This item could not be found. It may have been moved or deleted.',
  [ErrorType.UNAUTHORIZED]: 'JobSentinel could not open this. Check sign-in or access details.',
  [ErrorType.TIMEOUT]: 'This took too long. Please try again.',
  [ErrorType.UNKNOWN]: 'JobSentinel ran into a problem. Please try again.',
};

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return ERROR_MESSAGES[error.type] || error.message;
  }
  return ERROR_MESSAGES[classifyError(error)] || ERROR_MESSAGES[ErrorType.UNKNOWN];
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
    originalError: sanitizeTextForStorage(error instanceof Error ? error.message : String(error)),
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
    const sanitizedError = sanitizeDebugValue(error);
    const sanitizedContext = sanitizeContext(context);
    const sanitizedStack =
      error instanceof Error && error.stack
        ? sanitizeTextForStorage(error.stack)
        : undefined;

    console.group('Error Details');
    console.error('Error:', sanitizedError);
    console.log('Type:', classifyError(error));
    console.log('Message:', sanitizeTextForStorage(getUserMessage(error)));
    if (sanitizedContext) {
      console.log('Context:', sanitizedContext);
    }
    if (sanitizedStack) {
      console.log('Stack:', sanitizedStack);
    }
    console.groupEnd();
  }
}

interface SanitizedDebugError {
  name: string;
  message: string;
  stack?: string;
}

function sanitizeDebugValue(error: unknown): SanitizedDebugError | unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeTextForStorage(error.message),
      stack: error.stack ? sanitizeTextForStorage(error.stack) : undefined,
    };
  }

  if (typeof error === 'string') {
    return sanitizeTextForStorage(error);
  }

  if (error && typeof error === 'object') {
    return sanitizeContext({ error })?.error ?? '[UNAVAILABLE]';
  }

  return error;
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
