// Type for tracking original form values
export interface FormSnapshot {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  websiteUrl: string;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
}

// Types matching the Rust backend
export interface ApplicationProfile {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  hasResumeFile: boolean;
  resumeFileName: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
}

export interface ApplicationProfileInput {
  full_name: string;
  email: string;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  website_url?: string | null;
  default_resume_id?: number | null;
  resume_file_token?: string | null;
  clear_resume_file?: boolean;
  default_cover_letter_template?: string | null;
  us_work_authorized: boolean;
  requires_sponsorship: boolean;
  max_applications_per_day?: number;
  require_manual_approval?: boolean;
}

export interface ProfileFormProps {
  onSaved?: () => void;
}

export interface ApplicationResumeFileSelection {
  token: string;
  fileName: string;
}
