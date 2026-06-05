export type MockKeywordImportance = "Required" | "Preferred" | "Industry";
export type MockIssueSeverity = "Critical" | "Warning" | "Info";
export type MockRequirementMatchState = "Direct" | "Strong" | "Partial" | "Implied" | "Missing";
export type MockHardConstraintCategory =
  | "WorkAuthorization"
  | "SecurityClearance"
  | "LicenseOrCertification"
  | "Education"
  | "Experience"
  | "Language"
  | "BackgroundScreening"
  | "PhysicalRequirement"
  | "Location";
export type MockSuggestionCategory =
  | "AddKeyword"
  | "RewordBullet"
  | "AddSection"
  | "ReorderContent"
  | "FormatFix";

export interface MockKeywordMatch {
  keyword: string;
  found_in: string[];
  frequency: number;
  importance: MockKeywordImportance;
}

export interface MockFormatIssue {
  severity: MockIssueSeverity;
  issue: string;
  fix: string;
}

export interface MockRequirementReview {
  keyword: string;
  importance: MockKeywordImportance;
  match_state: MockRequirementMatchState;
  evidence_sections: string[];
  hard_constraint: boolean;
  recommendation: string;
}

export interface MockHardConstraintRisk {
  requirement: string;
  category: MockHardConstraintCategory;
  score_cap: number;
  reason: string;
  action: string;
}

export interface MockAtsSuggestion {
  category: MockSuggestionCategory;
  suggestion: string;
  impact: string;
}

export interface MockAtsAnalysisResult {
  overall_score: number;
  keyword_score: number;
  format_score: number;
  completeness_score: number;
  keyword_matches: MockKeywordMatch[];
  missing_keywords: string[];
  missing_keyword_details: MockAtsKeyword[];
  requirement_reviews: MockRequirementReview[];
  hard_constraint_risks: MockHardConstraintRisk[];
  format_issues: MockFormatIssue[];
  suggestions: MockAtsSuggestion[];
}

export interface MockAtsKeyword {
  keyword: string;
  importance: MockKeywordImportance;
}

export const MOCK_HUMAN_LANGUAGES = [
  "spanish",
  "french",
  "mandarin",
  "cantonese",
  "arabic",
  "portuguese",
  "german",
  "japanese",
  "korean",
] as const;

export const ATS_POWER_WORDS = [
  "led",
  "managed",
  "directed",
  "coordinated",
  "supervised",
  "mentored",
  "achieved",
  "accomplished",
  "delivered",
  "exceeded",
  "developed",
  "created",
  "designed",
  "built",
  "implemented",
  "launched",
  "improved",
  "optimized",
  "enhanced",
  "streamlined",
  "organized",
  "trained",
  "increased",
  "reduced",
  "saved",
  "generated",
  "analyzed",
  "researched",
  "evaluated",
  "collaborated",
  "partnered",
  "supported",
] as const;

export const ATS_KNOWN_KEYWORDS = [
  "forecasting",
  "workflow improvement",
  "quality assurance",
  "qa",
  "customer service",
  "guest service",
  "guest services",
  "front desk",
  "front-desk",
  "reception",
  "receptionist",
  "crm",
  "salesforce",
  "leadership",
  "scheduling",
  "calendar management",
  "appointment setting",
  "case management",
  "case coordination",
  "client intake",
  "onboarding",
  "new hire orientation",
  "employee orientation",
  "customer support",
  "project coordination",
  "pmp",
  "project management professional",
  "bookkeeping",
  "bookkeeper",
  "quickbooks",
  "qbo",
  "accounts payable",
  "accounts receivable",
  "a/p",
  "a/r",
  "inventory",
  "inventory control",
  "inventory management",
  "stock control",
  "stock management",
  "stockroom",
  "logistics",
  "shipping",
  "receiving",
  "procurement",
  "purchasing",
  "vendor management",
  "supplier management",
  "budgeting",
  "budget tracking",
  "data entry",
  "bilingual",
  "data analysis",
  "data analytics",
  "analytics",
  "training",
  "patient-care",
  "security clearance",
  "work authorization",
  "driver's license",
  "bachelor's degree",
  "high school diploma",
  "ged",
  "high school equivalency",
  "degree",
  "patient care",
  "cna",
  "certified nursing assistant",
  "lpn",
  "licensed practical nurse",
  "medication administration",
  "medication-administration",
  "vital sign",
  "vital-sign",
  "vital signs",
  "vital-signs",
  "care plan",
  "care-plan",
  "care plans",
  "care-plans",
  "medical record",
  "medical-record",
  "medical records",
  "medical-records",
  "charting",
  "lesson planning",
  "classroom management",
  "curriculum",
  "iep",
  "student support",
  "student services",
  "parent communication",
  "family communication",
  "guardian communication",
  "forklift",
  "welding",
  "equipment maintenance",
  "safety inspections",
  "food safety",
  "food safety certification",
  "servsafe",
  "food handler certification",
  "first aid",
  "first aid certification",
  "cash handling",
  "cashier",
  "point of sale",
  "pos system",
  "pos systems",
  "forklift certification",
  "osha 10",
  "osha 10 certification",
  "osha 30",
  "osha 30 certification",
  "document review",
  "document-review",
  "case files",
  "case-files",
  "legal research",
  "legal-research",
  "records management",
  "records-management",
  "policy analysis",
  "policy-analysis",
  "grant administration",
  "grant-administration",
  "public benefits",
  "financial reconciliation",
  "financial-reconciliation",
  "reconciliation",
  "billing",
  "invoicing",
  "loan processing",
  "loan-processing",
  "financial reporting",
] as const;
