/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values for maintainability.
 */

// ============================================================================
// Time Constants
// ============================================================================

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Milliseconds in one hour */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Milliseconds in one day */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// ============================================================================
// Salary Constants
// ============================================================================

/**
 * Multiplier to convert salary from thousands (K) to actual dollars.
 * UI displays salary in thousands (e.g., "100K") but database stores actual values.
 */
export const SALARY_THOUSANDS_MULTIPLIER = 1000;

// ============================================================================
// UI Constants
// ============================================================================

/** Default height for virtualized lists (pixels) */
export const DEFAULT_LIST_HEIGHT = 600;

/** Default row height for job cards in virtualized lists (pixels) */
export const DEFAULT_JOB_CARD_HEIGHT = 140;

/** Ghost job detection threshold (0.0 - 1.0) */
export const GHOST_SCORE_THRESHOLD = 0.5;

// ============================================================================
// Cache Constants
// ============================================================================

/** Default cache TTL for company research (24 hours) */
export const COMPANY_CACHE_TTL = MS_PER_DAY;

/** Default cache TTL for ATS analysis (24 hours) */
export const ATS_CACHE_TTL = MS_PER_DAY;

// ============================================================================
// Validation Constants
// ============================================================================

/** Minimum interview duration in minutes */
export const MIN_INTERVIEW_DURATION = 15;

/** Maximum interview duration in minutes (8 hours) */
export const MAX_INTERVIEW_DURATION = 480;
