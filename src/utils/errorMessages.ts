/**
 * Error message utility for translating technical errors into user-friendly messages.
 *
 * This module provides human-readable error messages for non-technical users,
 * helping them understand what went wrong and what they can do about it.
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  technical?: string; // Original error for debugging
}

/**
 * Network and connection error patterns
 */
const NETWORK_ERRORS = [
  { pattern: /network|fetch|connection|timeout|ECONNREFUSED/i, title: 'Connection Problem', message: 'We couldn\'t connect to the internet or the job board.', action: 'Check your internet connection and try again.' },
  { pattern: /ENOTFOUND|DNS|domain/i, title: 'Website Not Found', message: 'The job board website couldn\'t be reached.', action: 'The website might be down temporarily. Try again in a few minutes.' },
  { pattern: /certificate|ssl|tls/i, title: 'Security Certificate Issue', message: 'There\'s a problem with the website\'s security certificate.', action: 'This is usually temporary. Try again later, or check if your system date/time is correct.' },
  { pattern: /429|rate.?limit/i, title: 'Too Many Requests', message: 'You\'ve made too many requests to this job board.', action: 'Wait a few minutes before trying again. Consider increasing the delay between searches.' },
  { pattern: /503|502|504|service.?unavailable/i, title: 'Service Temporarily Down', message: 'The job board\'s servers are temporarily unavailable.', action: 'This is on their end. Try again in 10-15 minutes.' },
  { pattern: /401|unauthorized|authentication/i, title: 'Authentication Failed', message: 'Your credentials or API key aren\'t working.', action: 'Check your settings and make sure your API keys or login credentials are correct.' },
  { pattern: /403|forbidden/i, title: 'Access Denied', message: 'You don\'t have permission to access this resource.', action: 'Check if you need a premium account or special API access for this feature.' },
  { pattern: /404|not.?found/i, title: 'Page Not Found', message: 'The job listing or page no longer exists.', action: 'The posting may have been removed. Try refreshing your job list.' },
];

/**
 * Database error patterns
 */
const DATABASE_ERRORS = [
  { pattern: /database.*locked|SQLITE_BUSY/i, title: 'Database Busy', message: 'The database is currently in use by another operation.', action: 'Wait a moment and try again. If this keeps happening, try restarting the app.' },
  { pattern: /constraint|unique|duplicate/i, title: 'Duplicate Entry', message: 'This item already exists in the database.', action: 'You might be trying to add something that\'s already saved. Check your existing entries.' },
  { pattern: /foreign.?key|reference/i, title: 'Data Relationship Error', message: 'This action would break a connection between related data.', action: 'Make sure all related information exists before trying this action.' },
  { pattern: /corrupt|malformed|integrity/i, title: 'Database Corruption', message: 'The database file appears to be damaged.', action: 'You may need to restore from a backup or contact support. Don\'t delete the database file yet.' },
  { pattern: /disk|storage|space/i, title: 'Storage Full', message: 'Your computer is running out of disk space.', action: 'Free up some storage space on your hard drive and try again.' },
];

/**
 * Validation error patterns
 */
const VALIDATION_ERRORS = [
  { pattern: /required|missing|empty/i, title: 'Missing Information', message: 'Some required information is missing.', action: 'Fill in all required fields and try again.' },
  { pattern: /invalid.*email/i, title: 'Invalid Email', message: 'The email address isn\'t in the correct format.', action: 'Check the email address and make sure it looks like: name@example.com' },
  { pattern: /invalid.*url|invalid.*webhook/i, title: 'Invalid Web Address', message: 'The web address (URL) isn\'t formatted correctly.', action: 'Make sure the URL starts with http:// or https:// and is spelled correctly.' },
  { pattern: /invalid.*json/i, title: 'Invalid Data Format', message: 'The data isn\'t in the expected format.', action: 'Check that any configuration files are properly formatted. Contact support if you need help.' },
  { pattern: /password.*weak|password.*short/i, title: 'Weak Password', message: 'The password doesn\'t meet security requirements.', action: 'Use a longer password with a mix of letters, numbers, and special characters.' },
  { pattern: /date|time.*invalid/i, title: 'Invalid Date or Time', message: 'The date or time format isn\'t recognized.', action: 'Use a standard date format like MM/DD/YYYY or check your system date/time settings.' },
];

/**
 * Scraper and job source error patterns
 */
const SCRAPER_ERRORS = [
  { pattern: /parse|selector|element.*not.*found/i, title: 'Website Format Changed', message: 'The job board\'s website layout has changed and we can\'t read it properly.', action: 'This usually means we need to update our software. Check for app updates or contact support.' },
  { pattern: /no.*jobs.*found|empty.*results/i, title: 'No Jobs Found', message: 'No job listings matched your search criteria.', action: 'Try broadening your search filters or check different job boards.' },
  { pattern: /scraper.*disabled|source.*unavailable/i, title: 'Job Source Disabled', message: 'This job board is currently disabled in your settings.', action: 'Go to Settings > Job Sources to enable this job board.' },
  { pattern: /api.*key|api.*quota|api.*limit/i, title: 'API Limit Reached', message: 'You\'ve reached the daily limit for this job board\'s API.', action: 'Wait until tomorrow, or upgrade your API plan with the job board if available.' },
  { pattern: /captcha|bot.*detection|cloudflare/i, title: 'Bot Detection Triggered', message: 'The website thinks you\'re a bot and blocked the request.', action: 'This is a safety measure. Reduce search frequency or try again later.' },
];

/**
 * Configuration error patterns
 */
const CONFIG_ERRORS = [
  { pattern: /config.*not.*found|config.*missing/i, title: 'Configuration Missing', message: 'The app configuration file is missing or couldn\'t be found.', action: 'Try resetting your settings to defaults, or reinstall the app if the problem continues.' },
  { pattern: /config.*invalid|config.*corrupt/i, title: 'Configuration Error', message: 'The configuration file is damaged or has invalid settings.', action: 'Go to Settings and check for any error messages. You may need to reset to defaults.' },
  { pattern: /permission|access.*denied|EACCES/i, title: 'Permission Denied', message: 'The app doesn\'t have permission to access a file or folder.', action: 'Make sure the app has the necessary permissions in your system settings.' },
  { pattern: /file.*not.*found|ENOENT/i, title: 'File Not Found', message: 'A required file is missing.', action: 'The file may have been moved or deleted. Try reinstalling the app.' },
];

/**
 * Notification and webhook error patterns
 */
const NOTIFICATION_ERRORS = [
  { pattern: /webhook.*failed|webhook.*invalid/i, title: 'Notification Setup Failed', message: 'We couldn\'t send notifications to your configured channel.', action: 'Check your webhook URL in Settings > Notifications and make sure it\'s correct.' },
  { pattern: /slack.*error/i, title: 'Slack Notification Failed', message: 'Couldn\'t send a notification to Slack.', action: 'Verify your Slack webhook URL is correct and the channel still exists.' },
  { pattern: /discord.*error/i, title: 'Discord Notification Failed', message: 'Couldn\'t send a notification to Discord.', action: 'Verify your Discord webhook URL is correct and the channel still exists.' },
  { pattern: /teams.*error/i, title: 'Teams Notification Failed', message: 'Couldn\'t send a notification to Microsoft Teams.', action: 'Verify your Teams webhook URL is correct and the connector is still active.' },
  { pattern: /email.*error|smtp/i, title: 'Email Notification Failed', message: 'Couldn\'t send an email notification.', action: 'Check your email settings and make sure your SMTP credentials are correct.' },
];

/**
 * Application tracking error patterns
 */
const ATS_ERRORS = [
  { pattern: /application.*not.*found/i, title: 'Application Not Found', message: 'The job application you\'re looking for doesn\'t exist.', action: 'It may have been deleted. Check your applications list.' },
  { pattern: /interview.*conflict/i, title: 'Interview Time Conflict', message: 'This interview time overlaps with another one.', action: 'Choose a different time or reschedule one of the interviews.' },
  { pattern: /reminder.*failed/i, title: 'Reminder Setup Failed', message: 'Couldn\'t create a reminder for this event.', action: 'Check your notification settings and try again.' },
];

/**
 * Resume and AI error patterns
 */
const AI_ERRORS = [
  { pattern: /resume.*not.*found|resume.*missing/i, title: 'Resume Not Found', message: 'No resume has been uploaded yet.', action: 'Upload your resume in the Resume section before using this feature.' },
  { pattern: /parsing.*failed|extract.*failed/i, title: 'Resume Parsing Failed', message: 'We couldn\'t read the information from your resume.', action: 'Make sure your resume is in a supported format (PDF, DOCX, or TXT).' },
  { pattern: /ai.*error|model.*error|openai/i, title: 'AI Service Error', message: 'The AI service encountered a problem.', action: 'This is usually temporary. Try again in a moment. If it persists, check your API key.' },
  { pattern: /token.*limit|context.*length/i, title: 'Document Too Large', message: 'Your resume or the job description is too long for processing.', action: 'Try using a shorter resume or job description. Remove any unnecessary content.' },
];

/**
 * All error pattern groups combined
 */
const ALL_ERROR_PATTERNS = [
  ...NETWORK_ERRORS,
  ...DATABASE_ERRORS,
  ...VALIDATION_ERRORS,
  ...SCRAPER_ERRORS,
  ...CONFIG_ERRORS,
  ...NOTIFICATION_ERRORS,
  ...ATS_ERRORS,
  ...AI_ERRORS,
];

/**
 * Generic fallback error
 */
const GENERIC_ERROR: UserFriendlyError = {
  title: 'Something Went Wrong',
  message: 'An unexpected error occurred.',
  action: 'Try again in a moment. If the problem continues, please contact support with the error details below.',
};

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    // Check for common error properties
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    if ('msg' in error && typeof error.msg === 'string') {
      return error.msg;
    }

    // Fallback to JSON stringify
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

/**
 * Convert any error into a user-friendly error object
 *
 * @param error - The error to convert (can be string, Error, or unknown)
 * @returns A UserFriendlyError object with plain English explanation
 *
 * @example
 * ```typescript
 * try {
 *   await fetchJobs();
 * } catch (error) {
 *   const friendlyError = getUserFriendlyError(error);
 *   showNotification(friendlyError.title, friendlyError.message);
 * }
 * ```
 */
export function getUserFriendlyError(error: unknown): UserFriendlyError {
  const technicalMessage = extractErrorMessage(error);

  // Try to match against known error patterns
  for (const pattern of ALL_ERROR_PATTERNS) {
    if (pattern.pattern.test(technicalMessage)) {
      return {
        title: pattern.title,
        message: pattern.message,
        action: pattern.action,
        technical: technicalMessage,
      };
    }
  }

  // No match found, return generic error
  return {
    ...GENERIC_ERROR,
    technical: technicalMessage,
  };
}

/**
 * Format a user-friendly error for display
 *
 * @param error - The UserFriendlyError to format
 * @param includeAction - Whether to include the action in the output (default: true)
 * @returns A formatted string for display
 *
 * @example
 * ```typescript
 * const error = getUserFriendlyError(err);
 * console.error(formatErrorForDisplay(error));
 * ```
 */
export function formatErrorForDisplay(error: UserFriendlyError, includeAction = true): string {
  let result = `${error.title}\n${error.message}`;

  if (includeAction && error.action) {
    result += `\n\nWhat to do: ${error.action}`;
  }

  return result;
}

/**
 * Check if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return NETWORK_ERRORS.some(pattern => pattern.pattern.test(message));
}

/**
 * Check if an error is database-related
 */
export function isDatabaseError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return DATABASE_ERRORS.some(pattern => pattern.pattern.test(message));
}

/**
 * Check if an error is validation-related
 */
export function isValidationError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return VALIDATION_ERRORS.some(pattern => pattern.pattern.test(message));
}

/**
 * Get a short error summary (title only)
 */
export function getErrorSummary(error: unknown): string {
  return getUserFriendlyError(error).title;
}

/**
 * Create a user-friendly error from a custom message
 *
 * Useful for creating consistent error objects in application code
 */
export function createUserError(
  title: string,
  message: string,
  action?: string,
  technical?: string
): UserFriendlyError {
  return { title, message, action, technical };
}
