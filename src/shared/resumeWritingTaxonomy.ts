export interface ResumeBulletFramework {
  id: "action_scope_method_outcome" | "xyz" | "car";
  label: string;
  whenToUse: string;
  promptQuestions: string[];
  reviewReminder: string;
}

export interface ResumeExportIntegrityCheck {
  id:
    | "selectable_text"
    | "reading_order"
    | "portable_data"
    | "employer_file_request"
    | "portal_field_review"
    | "simple_layout"
    | "human_review";
  label: string;
  userAction: string;
}

export interface ResumeReferenceDecision {
  id:
    | "do_not_copy_templates"
    | "public_profile_import_needs_consent"
    | "ai_drafts_need_fact_check"
    | "content_before_theme"
    | "portable_schema_first";
  guidance: string;
  privacyNote: string;
}

export const RESUME_BULLET_FRAMEWORKS: ResumeBulletFramework[] = [
  {
    id: "action_scope_method_outcome",
    label: "Action + scope + method + result",
    whenToUse: "Best default for most resume bullets.",
    promptQuestions: [
      "What did you do?",
      "Who or what was affected?",
      "How did you do it?",
      "What changed afterward?",
    ],
    reviewReminder:
      "Only use details that are true and supported by work, training, credentials, or user-confirmed evidence.",
  },
  {
    id: "xyz",
    label: "X-Y-Z",
    whenToUse: "Useful when you have a measurable outcome.",
    promptQuestions: [
      "What was accomplished?",
      "How was it measured?",
      "What action made it happen?",
    ],
    reviewReminder:
      "Only use numbers or outcomes the user can defend in an interview or application form.",
  },
  {
    id: "car",
    label: "CAR",
    whenToUse: "Useful when a bullet needs clearer context.",
    promptQuestions: [
      "What challenge or situation existed?",
      "What action did the user personally take?",
      "What result changed because of that action?",
    ],
    reviewReminder:
      "Only strengthen ownership words when the source evidence supports that level of responsibility.",
  },
];

export const RESUME_EXPORT_INTEGRITY_CHECKS: ResumeExportIntegrityCheck[] = [
  {
    id: "selectable_text",
    label: "Selectable text",
    userAction: "Confirm names, roles, dates, skills, links, and bullets can be selected and copied.",
  },
  {
    id: "reading_order",
    label: "Reading order",
    userAction: "Review the plain preview for headings, jobs, dates, and bullets in the same order a person should read them.",
  },
  {
    id: "portable_data",
    label: "Portable data",
    userAction: "Keep JSON Resume export available so the content can move between local tools without decorative layout code.",
  },
  {
    id: "employer_file_request",
    label: "Employer file request",
    userAction: "Use the file type the employer asks for; keep both a text-based PDF and DOCX ready when no format is named.",
  },
  {
    id: "portal_field_review",
    label: "Portal field review",
    userAction: "After upload, review each auto-filled title, employer, date, education, and skill before submitting.",
  },
  {
    id: "simple_layout",
    label: "Simple layout",
    userAction: "Prefer one column, standard fonts, clear headings, and text over images or sidebars.",
  },
  {
    id: "human_review",
    label: "Human review",
    userAction: "Open the final file and check the same content a recruiter or hiring manager should see.",
  },
];

export const RESUME_REFERENCE_DECISIONS: ResumeReferenceDecision[] = [
  {
    id: "do_not_copy_templates",
    guidance:
      "Use public template collections as design and workflow references, not as bundled assets or copied layouts.",
    privacyNote:
      "Template licenses vary, so JobSentinel should keep local first-party templates and avoid copying unreviewed external files.",
  },
  {
    id: "public_profile_import_needs_consent",
    guidance:
      "A future public-profile importer can help technical users, but it must be user-entered, public-data-only, previewed, and editable before save.",
    privacyNote:
      "Fetching a public profile is an external request and needs explicit consent before JobSentinel contacts that service.",
  },
  {
    id: "ai_drafts_need_fact_check",
    guidance:
      "AI or prompt-based resume drafts can speed up rewriting, but every claim must be checked against the user's real evidence before use.",
    privacyNote:
      "External AI prompts can expose resume content, so JobSentinel should keep local drafting first and require explicit consent for any external provider.",
  },
  {
    id: "content_before_theme",
    guidance:
      "Resume templates should keep content, evidence, and readable order ahead of visual decoration.",
    privacyNote:
      "Keeping content local and readable reduces accidental exposure through remote theme assets, fonts, or hosted builders.",
  },
  {
    id: "portable_schema_first",
    guidance:
      "Prefer portable local formats such as JSON Resume before adding tool-specific exports or static-site flows.",
    privacyNote:
      "Portable local files let users move their own data without uploading sensitive resume content by default.",
  },
];
