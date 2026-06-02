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
    return "Use an email address like user@example.com.";
  }
  return undefined;
}

/**
 * Validates a required email address
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequiredEmail(email: string): string | undefined {
  if (!email.trim()) return "Add email address.";
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Use an email address like user@example.com.";
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
 * Validates a URL, allowing users to omit http:// or https:// for profile links.
 * @param url - URL to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateUrlWithOptionalProtocol(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)

  const trimmed = url.trim();
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);

  try {
    const parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "Paste a normal web link. Start with https:// if the link does not work.";
    }
    if (parsed.username || parsed.password) {
      return "Remove any sign-in name or password from the link, then try again.";
    }
    return undefined;
  } catch {
    return "Please enter a valid URL";
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
 * Validates a Slack notification connection link.
 * @param url - Slack connection link to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateSlackWebhook(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)
  const help =
    "Paste the full Slack connection link copied from Slack. If you are not sure, leave it blank and set it up later.";

  // Parse URL to validate host/origin, not just string prefix
  // This prevents bypass attacks like "https://evil.com?https://hooks.slack.com/services/..."
  try {
    const parsed = new URL(url);
    
    // Validate scheme
    if (parsed.protocol !== "https:") {
      return help;
    }

    if (parsed.username || parsed.password) {
      return help;
    }

    if (parsed.port && parsed.port !== "443") {
      return help;
    }
    
    // Validate host
    if (parsed.hostname !== "hooks.slack.com") {
      return help;
    }
    
    // Validate path
    if (!parsed.pathname.startsWith("/services/")) {
      return help;
    }
    
    return undefined;
  } catch {
    return help;
  }
}

/**
 * Validates a Discord notification connection link.
 * @param url - Discord connection link to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateDiscordWebhook(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)
  const help =
    "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later.";

  // Parse URL to validate host/origin, not just string prefix
  // This prevents bypass attacks like "https://evil.com?https://discord.com/api/webhooks/..."
  try {
    const parsed = new URL(url);
    
    // Validate scheme
    if (parsed.protocol !== "https:") {
      return help;
    }

    if (parsed.username || parsed.password) {
      return help;
    }

    if (parsed.port && parsed.port !== "443") {
      return help;
    }
    
    // Validate host
    if (parsed.hostname !== "discord.com" && parsed.hostname !== "discordapp.com") {
      return help;
    }
    
    // Validate path
    if (!parsed.pathname.startsWith("/api/webhooks/")) {
      return help;
    }
    
    return undefined;
  } catch {
    return help;
  }
}

/**
 * Validates a Microsoft Teams notification connection link.
 * @param url - Teams connection link to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateTeamsWebhook(url: string): string | undefined {
  if (!url.trim()) return undefined; // Empty is valid (optional field)
  const help =
    "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later.";

  // Parse URL to validate host/origin, not just string prefix
  // This prevents bypass attacks like "https://evil.com?https://outlook.office.com/webhook/..."
  try {
    const parsed = new URL(url);

    // Validate scheme
    if (parsed.protocol !== "https:") {
      return help;
    }

    if (parsed.username || parsed.password) {
      return help;
    }

    if (parsed.port && parsed.port !== "443") {
      return help;
    }

    // Validate host
    if (parsed.hostname !== "outlook.office.com" && parsed.hostname !== "outlook.office365.com") {
      return help;
    }

    // Validate path
    if (!parsed.pathname.startsWith("/webhook/")) {
      return help;
    }

    return undefined;
  } catch {
    return help;
  }
}

/**
 * Validates a required text field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error message
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequired(value: string, fieldName: string = "This field"): string | undefined {
  if (!value.trim()) {
    const field = fieldName === "This field" ? "this detail" : fieldName.toLowerCase();
    return `Add ${field}.`;
  }
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
    return "Question match has unsupported pattern symbols. Check brackets or special characters.";
  }
}

/**
 * Validates a required regex pattern
 * @param pattern - Regex pattern to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateRequiredRegex(pattern: string): string | undefined {
  if (!pattern.trim()) return "Add question wording.";
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
