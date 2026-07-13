export const REQUIRED_RESUME_ROLE_FAMILY_IDS = [
  "technical",
  "content",
  "operations",
  "healthcare",
  "service",
  "trades",
  "education",
  "sales",
  "early-career",
] as const;

export type ResumeRoleFamilyId =
  (typeof REQUIRED_RESUME_ROLE_FAMILY_IDS)[number];

export interface ResumeRoleFamily {
  id: ResumeRoleFamilyId;
  label: string;
  plainLanguageCue: string;
  examples: string[];
  evidencePrompt: string;
  careerProfileIds: string[];
  resumeEvidencePromptIds: string[];
}

export const RESUME_ROLE_FAMILY_TAXONOMY: readonly ResumeRoleFamily[] = [
  {
    id: "technical",
    label: "Technical",
    plainLanguageCue: "Software, data, security, product, and systems work",
    examples: ["software engineer", "security analyst", "data analyst"],
    evidencePrompt: "Use concrete work, tools, systems, incidents, projects, or credentials as evidence.",
    careerProfileIds: [
      "software-engineering",
      "cybersecurity",
      "data-science",
      "product-management",
    ],
    resumeEvidencePromptIds: ["technical_data", "security"],
  },
  {
    id: "content",
    label: "Content",
    plainLanguageCue: "Writing, content strategy, documentation, and communications work",
    examples: ["content strategist", "copywriter", "technical writer"],
    evidencePrompt: "Use published work, documentation, content operations, campaigns, or measurable audience outcomes as evidence.",
    careerProfileIds: ["content-copywriting", "seo-digital-marketing"],
    resumeEvidencePromptIds: ["design_creative", "sales_marketing"],
  },
  {
    id: "operations",
    label: "Operations",
    plainLanguageCue: "Project, office, admin, logistics, finance, HR, and program operations",
    examples: ["operations coordinator", "project manager", "office manager"],
    evidencePrompt: "Use process, scheduling, records, vendor, finance, HR, project, or workflow examples as evidence.",
    careerProfileIds: [
      "office-administration",
      "project-operations",
      "finance-accounting",
      "hr-recruiting",
    ],
    resumeEvidencePromptIds: ["service_operations", "regulated_work"],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    plainLanguageCue: "Patient support, care coordination, clinical operations, and licensed work",
    examples: ["medical assistant", "care coordinator", "patient support specialist"],
    evidencePrompt: "Use patient-care, clinical workflow, care coordination, license, certificate, or compliance evidence.",
    careerProfileIds: ["healthcare"],
    resumeEvidencePromptIds: ["healthcare"],
  },
  {
    id: "service",
    label: "Service",
    plainLanguageCue: "Customer support, hospitality, retail, and customer success roles",
    examples: ["customer support lead", "store manager", "guest service agent"],
    evidencePrompt: "Use customer, guest, member, account, complaint, retention, or service recovery examples as evidence.",
    careerProfileIds: [
      "retail-hospitality",
      "customer-success",
      "sales-business-dev",
    ],
    resumeEvidencePromptIds: ["service_operations", "sales_marketing"],
  },
  {
    id: "trades",
    label: "Trades",
    plainLanguageCue: "Field service, maintenance, warehouse, driving, installation, and skilled trades",
    examples: ["field service technician", "warehouse supervisor", "maintenance technician"],
    evidencePrompt: "Use work orders, tools, safety training, equipment, routes, installations, licenses, or repair records.",
    careerProfileIds: ["trades-field-service"],
    resumeEvidencePromptIds: ["trades_field"],
  },
  {
    id: "education",
    label: "Education",
    plainLanguageCue: "Student support, teaching, training, academic, and school operations",
    examples: ["teacher", "student services coordinator", "training specialist"],
    evidencePrompt: "Use student, learner, classroom, curriculum, family communication, training, or academic records as evidence.",
    careerProfileIds: ["education"],
    resumeEvidencePromptIds: ["education_academic"],
  },
  {
    id: "sales",
    label: "Sales",
    plainLanguageCue: "Sales, account, recruiting, marketing, partnership, and revenue work",
    examples: ["account executive", "business development rep", "marketing specialist"],
    evidencePrompt: "Use pipeline, quota, account, retention, campaign, conversion, referral, or customer outcome evidence.",
    careerProfileIds: [
      "sales-business-dev",
      "seo-digital-marketing",
      "customer-success",
    ],
    resumeEvidencePromptIds: ["sales_marketing"],
  },
  {
    id: "early-career",
    label: "Early career",
    plainLanguageCue: "Entry-level, trainee, apprenticeship, internship, return-to-work, and career-change paths",
    examples: ["new graduate", "apprentice", "career changer"],
    evidencePrompt: "Use training, projects, coursework, transferable work, volunteer work, or verified credentials as evidence.",
    careerProfileIds: [
      "education",
      "office-administration",
      "retail-hospitality",
      "trades-field-service",
    ],
    resumeEvidencePromptIds: ["early_career", "career_change"],
  },
] as const;

export function resumeRoleFamiliesForSummary(): string[] {
  return RESUME_ROLE_FAMILY_TAXONOMY.map((family) =>
    family.label.toLowerCase(),
  );
}
