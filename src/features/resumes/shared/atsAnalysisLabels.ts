/** Formats readability and resume evidence locations for user review. */
import type {
  HardConstraintCategory,
  IssueSeverity,
  SuggestionCategory,
} from "./atsAnalysisContracts";

export function formatSuggestionCategory(category: SuggestionCategory): string {
  switch (category) {
    case "AddKeyword":
      return "Review job words";
    case "RewordBullet":
      return "Rewrite bullet";
    case "AddSection":
      return "Add section";
    case "ReorderContent":
      return "Reorder content";
    case "FormatFix":
      return "Safety check";
  }
}

export function formatIssueSeverity(severity: IssueSeverity): string {
  switch (severity) {
    case "Critical":
      return "Fix first";
    case "Warning":
      return "Review";
    case "Info":
      return "Note";
  }
}

export function formatHardConstraintCategory(category: HardConstraintCategory): string {
  switch (category) {
    case "WorkAuthorization":
      return "Work authorization";
    case "Citizenship":
      return "Citizenship";
    case "SecurityClearance":
      return "Security clearance";
    case "LicenseOrCertification":
      return "License or certification";
    case "Education":
      return "Education";
    case "Experience":
      return "Years of experience";
    case "Language":
      return "Language requirement";
    case "Age":
      return "Age requirement";
    case "BackgroundScreening":
      return "Background or drug screening";
    case "PhysicalRequirement":
      return "Physical requirement";
    case "Location":
      return "Location, schedule, availability, or travel";
  }
}

export function isCitizenshipRequirement(requirement: string): boolean {
  const lower = requirement.toLowerCase();
  return (
    lower.includes("us citizenship") ||
    lower.includes("u.s. citizenship") ||
    lower.includes("us citizen") ||
    lower.includes("u.s. citizen") ||
    lower.includes("citizenship required")
  );
}

function formatEvidenceSection(section: string): string {
  switch (section) {
    case "current experience":
      return "current role experience";
    case "recent experience":
      return "recent role experience";
    case "experience":
      return "work experience";
    case "skills":
      return "skills list";
    case "summary":
      return "resume summary";
    case "resume text":
      return "resume text";
    case "projects":
      return "projects";
    case "education":
      return "education";
    case "certifications":
      return "certifications";
    case "licenses":
      return "licenses";
    default:
      return section.replace(/[_-]/g, " ");
  }
}

export function formatEvidenceSections(sections: string[]): string {
  return sections.map(formatEvidenceSection).join(", ");
}

function itemNumber(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const index = Number(value);
  return Number.isSafeInteger(index) && index < Number.MAX_SAFE_INTEGER
    ? index + 1
    : null;
}

export function evidenceLocation(fieldPath: string): string {
  if (fieldPath === "summary") return "Professional summary";
  if (fieldPath === "clearance") {
    return "Clearance details, current status not verified";
  }
  if (fieldPath === "military_info") {
    return "Military service details, civilian equivalence not verified";
  }

  const [section, index, field, childIndex, childField] = fieldPath.split(".");
  const item = itemNumber(index);
  if (section === "resume_text" && item) return `Resume text, line ${item}`;
  if (!item) return "Saved resume field";

  if (section === "experience") {
    if (field === "achievements") {
      const bullet = itemNumber(childIndex);
      return bullet
        ? `Work experience ${item}, bullet ${bullet}`
        : `Work experience ${item}`;
    }
    if (field === "title") return `Work experience ${item}, job title`;
    if (field === "company") return `Work experience ${item}, employer`;
    return `Work experience ${item}`;
  }

  if (section === "skills") {
    const skill = field === "skills" ? itemNumber(childIndex) : null;
    return skill && childField === "name"
      ? `Skills group ${item}, item ${skill}`
      : `Skills list, item ${item}`;
  }

  if (section === "education") {
    const honor = field === "honors" ? itemNumber(childIndex) : null;
    if (honor) return `Education ${item}, honor ${honor}`;
    if (field === "degree") return `Education ${item}, degree`;
    if (field === "institution") return `Education ${item}, school`;
    if (field === "location") return `Education ${item}, location`;
    return `Education ${item}`;
  }

  if (section === "certifications") {
    if (field === "name") return `Certification ${item}, name`;
    if (field === "issuer") return `Certification ${item}, issuer`;
    return `Certification ${item}`;
  }

  if (section === "projects") {
    const technology = field === "technologies" ? itemNumber(childIndex) : null;
    if (technology) return `Project ${item}, technology ${technology}`;
    if (field === "name") return `Project ${item}, name`;
    if (field === "description") return `Project ${item}, description`;
    if (field === "url") return `Project ${item}, link`;
    return `Project ${item}`;
  }

  return "Saved resume field";
}
