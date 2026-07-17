import type {
  ResumeAnalysisInput,
  ResumeSummary,
  StructuredResume,
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

function isPersonal(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    isNullableString(value.phone) &&
    isNullableString(value.location) &&
    isNullableString(value.linkedin) &&
    isNullableString(value.github) &&
    isNullableString(value.website)
  );
}

function isExperience(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.company === "string" &&
    isNullableString(value.location) &&
    typeof value.start_date === "string" &&
    isNullableString(value.end_date) &&
    typeof value.is_current === "boolean" &&
    isStringArray(value.achievements)
  );
}

function isEducation(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.degree === "string" &&
    typeof value.institution === "string" &&
    isNullableString(value.field_of_study) &&
    isNullableString(value.location) &&
    isNullableString(value.graduation_date) &&
    isNullableString(value.gpa) &&
    isStringArray(value.honors)
  );
}

function isSkillCategory(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.skills) &&
    value.skills.every(
      (skill) =>
        isRecord(skill) &&
        typeof skill.name === "string" &&
        isNullableString(skill.proficiency) &&
        (skill.years_experience === null ||
          (typeof skill.years_experience === "number" &&
            Number.isFinite(skill.years_experience))),
    )
  );
}

function isCertification(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.issuer === "string" &&
    isNullableString(value.date_obtained) &&
    isNullableString(value.expiration_date) &&
    isNullableString(value.credential_id)
  );
}

function isProject(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isStringArray(value.technologies) &&
    isNullableString(value.url) &&
    isNullableString(value.start_date) &&
    isNullableString(value.end_date)
  );
}

function isStructuredResume(value: unknown): value is StructuredResume {
  return (
    isRecord(value) &&
    isPersonal(value.personal) &&
    isNullableString(value.summary) &&
    Array.isArray(value.experience) &&
    value.experience.every(isExperience) &&
    Array.isArray(value.education) &&
    value.education.every(isEducation) &&
    Array.isArray(value.skills) &&
    value.skills.every(isSkillCategory) &&
    Array.isArray(value.certifications) &&
    value.certifications.every(isCertification) &&
    Array.isArray(value.projects) &&
    value.projects.every(isProject) &&
    isNullableString(value.clearance) &&
    isNullableString(value.military_info)
  );
}

function isCustomSections(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every(isStringArray);
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
    (value.readable_text_chars === undefined ||
      (typeof value.readable_text_chars === "number" &&
        Number.isFinite(value.readable_text_chars)))
  );
}

export function parseAtsResumeInput(value: string): ResumeAnalysisInput | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) &&
      isStructuredResume(parsed.resume) &&
      isCustomSections(parsed.custom_sections)
      ? { resume: parsed.resume, custom_sections: parsed.custom_sections }
      : null;
  } catch {
    return null;
  }
}
