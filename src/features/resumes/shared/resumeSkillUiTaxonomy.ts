export const SKILL_PROFICIENCY_VALUES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;

export type SkillProficiency = (typeof SKILL_PROFICIENCY_VALUES)[number];

export const SKILL_PROFICIENCY_LABELS: Record<SkillProficiency, string> = {
  beginner: "Learning",
  intermediate: "Some practice",
  advanced: "Regular use",
  expert: "Can train others",
};

export const SKILL_STRENGTH_LABELS: Record<string, string> = {
  ...SKILL_PROFICIENCY_LABELS,
  proficient: "Regular use",
};

export const SKILL_STRENGTH_COLORS = {
  "can train others": "sentinel",
  "regular use": "alert",
  "some practice": "surface",
  learning: "surface",
  expert: "sentinel",
  advanced: "alert",
  intermediate: "surface",
  beginner: "surface",
} as const;

export const SKILL_STRENGTH_OPTIONS = [
  { value: "Learning", label: "Learning" },
  { value: "Some practice", label: "Some practice" },
  { value: "Regular use", label: "Regular use" },
  { value: "Can train others", label: "Can train others" },
] as const;

export const DEFAULT_SKILL_STRENGTH = "Regular use";

export const RESUME_SKILL_CATEGORIES = [
  "Work Skills",
  "Tools and Systems",
  "People and Communication",
  "Customer or Patient Support",
  "Operations and Administration",
  "Leadership",
  "Languages",
  "Licenses and Credentials",
  "Other",
] as const;

export function mapSkillProficiencyLevel(
  level: string | null | undefined,
): SkillProficiency | null {
  if (!level) return null;

  const normalized = level.toLowerCase();
  if (normalized.includes("expert") || normalized.includes("advanced")) return "expert";
  if (normalized.includes("intermediate") || normalized.includes("proficient")) {
    return "intermediate";
  }
  if (normalized.includes("beginner") || normalized.includes("basic")) return "beginner";

  return "intermediate";
}
