import {
  validatePhone,
  validateRequiredEmail,
  validateUrlWithOptionalProtocol,
} from "./formValidation";

export interface ResumeContactValidationInput {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

export function getResumeContactValidationMessage(
  contact: ResumeContactValidationInput
): string | undefined {
  if (!contact.name.trim()) return "Please enter your name";

  const emailError = validateRequiredEmail(contact.email);
  if (emailError) return emailError;

  const phoneError = validatePhone(contact.phone ?? "");
  if (phoneError) return phoneError;

  for (const [label, value] of [
    ["LinkedIn", contact.linkedin],
    ["GitHub", contact.github],
    ["Website", contact.website],
  ] as const) {
    const error = validateUrlWithOptionalProtocol(value ?? "");
    if (error) return `${label}: ${error}`;
  }

  return undefined;
}
