/**
 * Shared form validation utilities for JobSentinel
 * Provides consistent validation patterns across all forms
 */

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation - strips non-digits and checks length
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

/**
 * Validates an email address
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return undefined; // Empty is valid (optional field)
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address (e.g., user@example.com)";
  }
  return undefined;
}

/**
 * Validates a required email address
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequiredEmail(email: string): string | undefined {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address (e.g., user@example.com)";
  }
  return undefined;
}

/**
 * Validates a URL
 * @param url - URL to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateUrl(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "URL must start with http:// or https://";
    }
    return undefined;
  } catch {
    return "Please enter a valid URL (e.g., https://example.com)";
  }
}

/**
 * Validates a required URL
 * @param url - URL to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequiredUrl(url: string): string | undefined {
  if (!url.trim()) return "URL is required";
  return validateUrl(url);
}

/**
 * Validates a phone number
 * @param phone - Phone number to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) return undefined; // Empty is valid (optional field)

  const digits = phone.replace(/\D/g, "");
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return `Phone number must have ${PHONE_MIN_DIGITS}-${PHONE_MAX_DIGITS} digits`;
  }
  return undefined;
}

/**
 * Validates a Slack webhook URL
 * @param url - Slack webhook URL to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateSlackWebhook(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)

  if (!url.startsWith("https://hooks.slack.com/services/")) {
    return "Must be a valid Slack webhook URL (https://hooks.slack.com/services/...)";
  }
  return undefined;
}

/**
 * Validates a Discord webhook URL
 * @param url - Discord webhook URL to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateDiscordWebhook(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)

  if (!url.startsWith("https://discord.com/api/webhooks/") && !url.startsWith("https://discordapp.com/api/webhooks/")) {
    return "Must be a valid Discord webhook URL";
  }
  return undefined;
}

/**
 * Validates a required text field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error message
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequired(value: string, fieldName: string = "This field"): string | undefined {
  if (!value.trim()) return `${fieldName} is required`;
  return undefined;
}

/**
 * Validates a regex pattern
 * @param pattern - Regex pattern to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateRegex(pattern: string): string | undefined {
  if (!pattern.trim()) return undefined; // Empty is valid (optional field)

  try {
    new RegExp(pattern.trim(), "i");
    return undefined;
  } catch {
    return "Invalid regex pattern. Check for unmatched brackets or special characters.";
  }
}

/**
 * Validates a required regex pattern
 * @param pattern - Regex pattern to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequiredRegex(pattern: string): string | undefined {
  if (!pattern.trim()) return "Pattern is required";
  return validateRegex(pattern);
}

/**
 * Validates a port number
 * @param port - Port number to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validatePort(port: number): string | undefined {
  if (port < 1 || port > 65535) {
    return "Port must be between 1 and 65535";
  }
  return undefined;
}

/**
 * Validates a comma-separated email list
 * @param emails - Comma-separated email addresses
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmailList(emails: string): string | undefined {
  if (!emails.trim()) return undefined; // Empty is valid (optional field)

  const emailList = emails.split(",").map(e => e.trim());
  const invalidEmails = emailList.filter(e => !EMAIL_REGEX.test(e));

  if (invalidEmails.length > 0) {
    return `Invalid email addresses: ${invalidEmails.join(", ")}`;
  }
  return undefined;
}
