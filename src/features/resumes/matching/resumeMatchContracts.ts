export type {
  ResumeAnalysisInput,
  StructuredResume,
} from "../builder/resumeBuilderData";

export type {
  KeywordImportance,
  IssueSeverity,
  RequirementMatchState,
  HardConstraintCategory,
  SuggestionCategory,
  KeywordMatch,
  MissingKeyword,
  RequirementReview,
  HardConstraintRisk,
  FormatIssue,
  AtsSuggestion,
  AtsAnalysisResult,
} from "../shared/atsAnalysisContracts";

export interface ResumeNextAction {
  title: string;
  detail: string;
  variant: "danger" | "alert" | "success" | "sentinel" | "surface";
  label: string;
}

export interface ResumeFitEvidenceStatus {
  label: string;
  detail: string;
  variant: "danger" | "alert" | "success" | "sentinel" | "surface";
}

export interface ResumeSummary {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  format_label?: string;
  has_readable_text?: boolean;
  readable_text_chars?: number;
}
