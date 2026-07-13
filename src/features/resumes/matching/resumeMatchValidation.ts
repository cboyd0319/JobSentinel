import type {
  AtsResumeData,
  ContactInfo,
  Education,
  Experience,
  ResumeSummary,
  Skill,
} from "./resumeMatchContracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isContactInfo(value: unknown): value is ContactInfo {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.location === "string" &&
    isNullableString(value.linkedin) &&
    isNullableString(value.github) &&
    isNullableString(value.website)
  );
}

function isExperience(value: unknown): value is Experience {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.company === "string" &&
    typeof value.location === "string" &&
    typeof value.start_date === "string" &&
    typeof value.end_date === "string" &&
    isStringArray(value.achievements) &&
    typeof value.current === "boolean"
  );
}

function isEducation(value: unknown): value is Education {
  return (
    isRecord(value) &&
    typeof value.degree === "string" &&
    typeof value.institution === "string" &&
    typeof value.location === "string" &&
    typeof value.graduation_date === "string" &&
    (value.gpa === null || (typeof value.gpa === "number" && Number.isFinite(value.gpa))) &&
    isStringArray(value.honors)
  );
}

function isSkill(value: unknown): value is Skill {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    isNullableString(value.proficiency)
  );
}

function isCustomSections(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every(isStringArray);
}

function isAtsResumeData(value: unknown): value is AtsResumeData {
  return (
    isRecord(value) &&
    isContactInfo(value.contact_info) &&
    typeof value.summary === "string" &&
    Array.isArray(value.experience) &&
    value.experience.every(isExperience) &&
    Array.isArray(value.skills) &&
    value.skills.every(isSkill) &&
    Array.isArray(value.education) &&
    value.education.every(isEducation) &&
    isStringArray(value.certifications) &&
    isStringArray(value.projects) &&
    isCustomSections(value.custom_sections)
  );
}

export function isResumeSummary(value: unknown): value is ResumeSummary {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.is_active === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    (value.format_label === undefined || typeof value.format_label === "string") &&
    (value.has_readable_text === undefined || typeof value.has_readable_text === "boolean") &&
    (
      value.readable_text_chars === undefined ||
      (typeof value.readable_text_chars === "number" && Number.isFinite(value.readable_text_chars))
    )
  );
}

export function parseAtsResumeInput(value: string): AtsResumeData | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isAtsResumeData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
