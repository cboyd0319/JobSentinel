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
