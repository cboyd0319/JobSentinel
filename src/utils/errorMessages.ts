/**
 * Error message utility for translating technical errors into user-friendly messages.
 *
 * This module provides human-readable error messages for non-technical users,
 * helping them understand what went wrong and what they can do about it.
 */

import { sanitizeTextForStorage } from './errorReporting';

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
  { pattern: /429|rate.?limit/i, title: 'Job Board Asked JobSentinel to Slow Down', message: 'The job board asked JobSentinel to wait before checking again.', action: 'Wait a few minutes, then try again. If it keeps happening, check this site less often.' },
  { pattern: /503|502|504|service.?unavailable/i, title: 'Service Temporarily Down', message: 'The job board\'s servers are temporarily unavailable.', action: 'This is on their end. Try again in 10-15 minutes.' },
  { pattern: /401|unauthorized|authentication/i, title: 'Sign-In Details Not Working', message: 'Your saved sign-in or access details aren\'t working.', action: 'Open Settings, reconnect the job source, or paste updated access details.' },
  { pattern: /403|forbidden/i, title: 'Access Denied', message: 'The job board would not allow this request.', action: 'Check whether this job board needs a signed-in or premium account, then try again.' },
  { pattern: /404|not.?found/i, title: 'Page Not Found', message: 'The job listing or page no longer exists.', action: 'The posting may have been removed. Try refreshing your job list.' },
];

/**
 * Database error patterns
 */
const DATABASE_ERRORS = [
  { pattern: /database.*locked|SQLITE_BUSY/i, title: 'Local Data Busy', message: 'JobSentinel is already saving or reading your local data.', action: 'Wait a moment and try again. If this keeps happening, restart the app.' },
  { pattern: /constraint|unique|duplicate/i, title: 'Duplicate Entry', message: 'This item is already saved.', action: 'Check your existing entries before adding it again.' },
  { pattern: /foreign.?key|reference/i, title: 'Related Information Missing', message: 'This action needs another saved item before it can continue.', action: 'Check that the related job, application, or setting still exists, then try again.' },
  { pattern: /corrupt|malformed|integrity/i, title: 'Local Data Problem', message: 'JobSentinel\'s local data file may be damaged.', action: 'Copy a safe support report and restore from a backup if you have one. Don\'t delete app data yet.' },
  { pattern: /disk|storage|space/i, title: 'Storage Full', message: 'Your computer is running out of disk space.', action: 'Free up some storage space on your hard drive and try again.' },
];

/**
 * Validation error patterns
 */
const VALIDATION_ERRORS = [
  { pattern: /required|missing|empty/i, title: 'Missing Information', message: 'Some required information is missing.', action: 'Fill in all required fields and try again.' },
  { pattern: /invalid.*email/i, title: 'Email Not Recognized', message: 'The email address does not look complete.', action: 'Check the email address and make sure it looks like: name@example.com' },
  { pattern: /invalid.*url|invalid.*webhook/i, title: 'Web Address Not Recognized', message: 'The web address is not in a format JobSentinel can use.', action: 'Copy the full address again. It should usually start with https://.' },
  { pattern: /invalid.*json/i, title: 'Data Not Recognized', message: 'The selected data is not in a format JobSentinel can use.', action: 'Try exporting it again from the original app, or copy a safe support report if you need help.' },
  { pattern: /password.*weak|password.*short/i, title: 'Weak Password', message: 'The password doesn\'t meet security requirements.', action: 'Use a longer password with a mix of letters, numbers, and special characters.' },
  { pattern: /date|time.*invalid/i, title: 'Invalid Date or Time', message: 'The date or time format isn\'t recognized.', action: 'Use a standard date format like MM/DD/YYYY or check your system date/time settings.' },
];

/**
 * Scraper and job source error patterns
 */
const SCRAPER_ERRORS = [
  { pattern: /parse|selector|element.*not.*found/i, title: 'Website Format Changed', message: 'The job board\'s website layout has changed and we can\'t read it properly.', action: 'This usually means we need to update our software. Check for app updates or contact support.' },
  { pattern: /no.*jobs.*found|empty.*results/i, title: 'No Jobs Found', message: 'No job listings matched your search criteria.', action: 'Try broadening your search filters or check different job boards.' },
  { pattern: /scraper.*disabled|source.*unavailable/i, title: 'Job Source Disabled', message: 'This job board is currently disabled in your settings.', action: 'Open Settings, choose More Settings, then View Job Sources.' },
  { pattern: /api.*key|api.*quota|api.*limit/i, title: 'Daily Job Board Limit Reached', message: 'This job board has stopped accepting more requests today.', action: 'Wait until tomorrow, or reduce how often JobSentinel checks this source.' },
  { pattern: /captcha|bot.*detection|cloudflare/i, title: 'Site Asked for a Human Check', message: 'This site asked for an extra human check before showing jobs.', action: 'Open the site yourself, complete any check there, or try again later.' },
];

/**
 * Configuration error patterns
 */
const CONFIG_ERRORS = [
  { pattern: /config.*not.*found|config.*missing/i, title: 'Saved Settings Need Attention', message: 'JobSentinel could not find your saved settings.', action: 'Open Settings and save them again. If this keeps happening, copy a safe support report before resetting anything.' },
  { pattern: /config.*invalid|config.*corrupt/i, title: 'Saved Settings Need Attention', message: 'JobSentinel could not read your saved settings.', action: 'Open Settings and save them again. If this keeps happening, copy a safe support report before resetting anything.' },
  { pattern: /permission|access.*denied|EACCES/i, title: 'Permission Needed', message: 'JobSentinel needs permission to open that file or folder.', action: 'Check your system privacy settings, then try again.' },
  { pattern: /file.*not.*found|ENOENT/i, title: 'File Not Found', message: 'A required file is missing.', action: 'The file may have been moved or deleted. Try reinstalling the app.' },
];

/**
 * Notification and webhook error patterns
 */
const NOTIFICATION_ERRORS = [
  { pattern: /webhook.*failed|webhook.*invalid/i, title: 'Could not set up notifications', message: 'We couldn\'t send notifications to your saved alert channel.', action: 'Open Settings, choose More Settings, then paste a fresh connection link for that channel.' },
  { pattern: /slack.*error/i, title: 'Could not send Slack notification', message: 'Couldn\'t send a notification to Slack.', action: 'Paste a fresh Slack connection link in Settings and make sure the channel still exists.' },
  { pattern: /discord.*error/i, title: 'Could not send Discord notification', message: 'Couldn\'t send a notification to Discord.', action: 'Paste a fresh Discord connection link in Settings and make sure the channel still exists.' },
  { pattern: /teams.*error/i, title: 'Could not send Teams notification', message: 'Couldn\'t send a notification to Microsoft Teams.', action: 'Paste a fresh Teams connection link in Settings and make sure the connector is still active.' },
  { pattern: /email.*error|smtp/i, title: 'Could not send email notification', message: 'Couldn\'t send an email notification.', action: 'Check your email sending settings and saved password.' },
];

/**
 * Application tracking error patterns
 */
const ATS_ERRORS = [
  { pattern: /application.*not.*found/i, title: 'Application Not Found', message: 'The job application you\'re looking for doesn\'t exist.', action: 'It may have been deleted. Check your applications list.' },
  { pattern: /interview.*conflict/i, title: 'Interview Time Conflict', message: 'This interview time overlaps with another one.', action: 'Choose a different time or reschedule one of the interviews.' },
  { pattern: /reminder.*failed/i, title: 'Could not create reminder', message: 'Couldn\'t create a reminder for this event.', action: 'Check your notification settings and try again.' },
];

/**
 * Resume and AI error patterns
 */
const AI_ERRORS = [
  { pattern: /resume.*not.*found|resume.*missing/i, title: 'Resume Not Found', message: 'No resume has been uploaded yet.', action: 'Upload your resume in the Resume section before using this feature.' },
  { pattern: /parsing.*failed|extract.*failed/i, title: 'Resume Could Not Be Read', message: 'JobSentinel could not read the information from your resume.', action: 'Use a PDF, DOCX, or TXT resume, or choose a different file.' },
  { pattern: /ai.*error|model.*error|openai/i, title: 'Resume Analysis Problem', message: 'The resume analysis service had a problem.', action: 'Try again in a moment. If this keeps happening, check any analysis service you connected in Settings.' },
  { pattern: /token.*limit|context.*length/i, title: 'Resume or Job Post Too Long', message: 'The resume or job post is too long for this review.', action: 'Try a shorter resume or job post. Remove repeated sections first.' },
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
  title: 'JobSentinel needs attention',
  message: 'JobSentinel ran into a problem.',
  action: 'Try again in a moment. If the problem continues, copy a safe support report and share it only if you want help.',
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

    return 'Unknown object error';
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
  const rawTechnicalMessage = extractErrorMessage(error);
  const safeTechnicalMessage = sanitizeTextForStorage(rawTechnicalMessage);

  // Try to match against known error patterns
  for (const pattern of ALL_ERROR_PATTERNS) {
    if (pattern.pattern.test(rawTechnicalMessage)) {
      return {
        title: pattern.title,
        message: pattern.message,
        action: pattern.action,
        technical: safeTechnicalMessage,
      };
    }
  }

  // No match found, return generic error
  return {
    ...GENERIC_ERROR,
    technical: safeTechnicalMessage,
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
  return {
    title,
    message,
    action,
    technical: technical ? sanitizeTextForStorage(technical) : undefined,
  };
}
