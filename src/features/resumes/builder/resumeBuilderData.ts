import {
  SKILL_PROFICIENCY_LABELS,
  SKILL_PROFICIENCY_VALUES,
  type SkillProficiency,
} from "../shared/resumeSkillUiTaxonomy";

export interface Resume {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: number;
  resume_id: number;
  skill_name: string;
  skill_category: string | null;
  confidence_score: number;
  years_experience: number | null;
  proficiency_level: string | null;
  source: string;
}

export interface ATSAnalysis {
  format_score: number;
  issues: string[];
  recommendations: string[];
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  website: string | null;
}

export interface Experience {
  id: number;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  achievements: string[];
}

export interface Education {
  id: number;
  degree: string;
  institution: string;
  location: string | null;
  graduation_date: string | null;
  gpa: string | null;
  honors: string[];
}

export interface SkillEntry {
  name: string;
  category: string;
  proficiency: SkillProficiency | null;
}

export interface Certification {
  name: string;
  issuer: string;
  date_obtained: string | null;
  expiration_date: string | null;
  credential_id: string | null;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ResumeData {
  id: number;
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillEntry[];
  certifications: Certification[];
  projects: Project[];
  created_at: string;
  updated_at: string;
}

export type TemplateId =
  | "Classic"
  | "Modern"
  | "Technical"
  | "Executive"
  | "Military";

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  preview_image: string;
}

export interface TemplateSkillCategory {
  name: string;
  skills: string[];
}

export interface TemplateResumeData {
  contact: {
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    website: string | null;
  };
  summary: string | null;
  experience: Array<{
    title: string;
    company: string;
    location: string | null;
    start_date: string;
    end_date: string | null;
    achievements: string[];
  }>;
  education: Education[];
  skills: TemplateSkillCategory[];
  certifications: Array<{
    name: string;
    issuer: string;
    date: string | null;
    expiry: string | null;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url: string | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  clearance: string | null;
  military_info: string | null;
}

export type ExportTemplateId = "Professional" | "Modern" | "Traditional";

export interface ExportResumeData {
  personal: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin_url: string | null;
    website_url: string | null;
  };
  summary: string | null;
  experience: Array<{
    company: string;
    job_title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    responsibilities: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    graduation_year: string;
    gpa: number | null;
    honors: string | null;
  }>;
  skills: Array<{
    category: string;
    skills: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credential_id: string | null;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url: string | null;
  }>;
}

export interface AtsResumeData {
  contact_info: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string | null;
    github: string | null;
    website: string | null;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location: string;
    start_date: string;
    end_date: string;
    achievements: string[];
    current: boolean;
  }>;
  skills: Array<{
    name: string;
    category: string;
    proficiency: string | null;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location: string;
    graduation_date: string;
    gpa: number | null;
    honors: string[];
  }>;
  certifications: string[];
  projects: string[];
  custom_sections: Record<string, string[]>;
}

export interface JsonResumeData {
  basics: {
    name: string;
    label: string;
    image: string;
    email: string;
    phone: string;
    url: string;
    summary: string;
    location: {
      address: string;
      postalCode: string;
      city: string;
      countryCode: string;
      region: string;
    };
    profiles: Array<{
      network: string;
      username: string;
      url: string;
    }>;
  };
  work: Array<{
    name: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    url: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
    courses: string[];
  }>;
  certificates: Array<{
    name: string;
    date: string;
    issuer: string;
    url: string;
  }>;
  skills: Array<{
    name: string;
    level: string;
    keywords: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    highlights: string[];
    keywords: string[];
    startDate: string;
    endDate: string;
    url: string;
    roles: string[];
    entity: string;
    type: string;
  }>;
}

export interface BackendATSAnalysis {
  format_score: number;
  issues?: string[];
  recommendations?: string[];
  format_issues?: Array<{ issue: string }>;
  suggestions?: Array<{ suggestion: string }>;
}

export const STEPS = [
  { id: 1, name: "Contact", description: "Personal information" },
  { id: 2, name: "Summary", description: "Professional summary" },
  { id: 3, name: "Experience", description: "Work history" },
  { id: 4, name: "Education", description: "Academic background" },
  { id: 5, name: "Skills", description: "Role and people skills" },
  { id: 6, name: "Preview", description: "Choose template" },
  { id: 7, name: "Export", description: "Download resume" },
];

export const SKILL_STRENGTH_VALUES = SKILL_PROFICIENCY_VALUES;

export const SKILL_STRENGTH_LABELS: Record<
  (typeof SKILL_STRENGTH_VALUES)[number],
  string
> = SKILL_PROFICIENCY_LABELS;

export function getSkillStrengthLabel(
  proficiency: SkillEntry["proficiency"],
) {
  return proficiency ? SKILL_STRENGTH_LABELS[proficiency] : "";
}

export {
  normalizeAtsAnalysis,
  toAtsResumeData,
  toExportResumeData,
  toExportTemplateId,
  toJsonResumeData,
  toTemplateResumeData,
} from "./resumeBuilderTransforms";
