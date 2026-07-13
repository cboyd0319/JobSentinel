import type {
  AtsAnalysisResult,
  IssueSeverity,
  KeywordImportance,
  MissingKeyword,
  RequirementMatchState,
} from "./resumeMatchModel";

export function getSeverityVariant(severity: IssueSeverity): "danger" | "alert" | "sentinel" {
  if (severity === "Critical") return "danger";
  if (severity === "Warning") return "alert";
  return "sentinel";
}

export function getImportanceVariant(importance: KeywordImportance): "danger" | "alert" | "success" {
  if (importance === "Required") return "danger";
  if (importance === "Preferred") return "alert";
  return "success";
}

export function getMissingKeywordDetails(analysisResult: AtsAnalysisResult): MissingKeyword[] {
  if (
    analysisResult.missing_keyword_details &&
    analysisResult.missing_keyword_details.length > 0
  ) {
    return analysisResult.missing_keyword_details;
  }

  return analysisResult.missing_keywords.map((keyword) => ({
    keyword,
    importance: "Industry",
  }));
}

export function getMissingKeywordGroups(missing: MissingKeyword[]) {
  return {
    required: missing.filter((gap) => gap.importance === "Required"),
    preferred: missing.filter((gap) => gap.importance === "Preferred"),
    other: missing.filter((gap) => gap.importance === "Industry"),
  };
}

export function getRequirementStateVariant(
  state: RequirementMatchState,
): "success" | "sentinel" | "alert" | "danger" | "surface" {
  if (state === "Strong") return "success";
  if (state === "Direct") return "sentinel";
  if (state === "Partial" || state === "Implied") return "alert";
  if (state === "Missing") return "danger";
  return "surface";
}
