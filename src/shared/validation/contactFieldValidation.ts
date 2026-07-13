const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return undefined;
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Use an email address like user@example.com.";
  }
  return undefined;
}

export function validateRequiredEmail(email: string): string | undefined {
  if (!email.trim()) return "Add email address.";
  return validateEmail(email);
}

export function validateUrl(url: string): string | undefined {
  if (!url.trim()) return undefined;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "Use a web link that starts with https:// or http://.";
    }
    return undefined;
  } catch {
    return "Use a web link like https://example.com.";
  }
}

export function validateUrlWithOptionalProtocol(
  url: string,
): string | undefined {
  if (!url.trim()) return undefined;

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
    return "Use a normal web link.";
  }
}

export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) return undefined;

  const digitCount = phone.replace(/\D/g, "").length;
  if (digitCount < PHONE_MIN_DIGITS || digitCount > PHONE_MAX_DIGITS) {
    return `Use a phone number with ${PHONE_MIN_DIGITS} to ${PHONE_MAX_DIGITS} digits.`;
  }
  return undefined;
}
