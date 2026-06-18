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
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
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

interface TemplateSkillCategory {
  name: string;
  skills: string[];
}

interface TemplateResumeData {
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

type ExportTemplateId = "Professional" | "Modern" | "Traditional";

interface ExportResumeData {
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

interface AtsResumeData {
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

export const SKILL_STRENGTH_VALUES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;

export const SKILL_STRENGTH_LABELS: Record<
  (typeof SKILL_STRENGTH_VALUES)[number],
  string
> = {
  beginner: "Learning",
  intermediate: "Some practice",
  advanced: "Regular use",
  expert: "Can train others",
};

export function getSkillStrengthLabel(
  proficiency: SkillEntry["proficiency"],
) {
  return proficiency ? SKILL_STRENGTH_LABELS[proficiency] : "";
}

function groupSkills(skills: SkillEntry[]): TemplateSkillCategory[] {
  const grouped = skills.reduce<Record<string, string[]>>((acc, skill) => {
    const category = skill.category || "General";
    acc[category] = [...(acc[category] ?? []), skill.name];
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, values]) => ({
    name,
    skills: values,
  }));
}

export function toTemplateResumeData(resume: ResumeData): TemplateResumeData {
  return {
    contact: {
      name: resume.contact.name,
      email: resume.contact.email,
      phone: resume.contact.phone,
      location: resume.contact.location,
      linkedin: resume.contact.linkedin,
      website: resume.contact.website,
    },
    summary: resume.summary || null,
    experience: resume.experience.map((experience) => ({
      title: experience.title,
      company: experience.company,
      location: experience.location,
      start_date: experience.start_date,
      end_date: experience.end_date,
      achievements: experience.achievements,
    })),
    education: resume.education,
    skills: groupSkills(resume.skills),
    certifications: resume.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      date: certification.date_obtained,
      expiry: certification.expiration_date,
    })),
    projects: resume.projects.map((project) => ({
      name: project.name,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
      start_date: project.start_date,
      end_date: project.end_date,
    })),
    clearance: null,
    military_info: null,
  };
}

export function toExportTemplateId(template: TemplateId): ExportTemplateId {
  if (template === "Modern") return "Modern";
  if (template === "Classic") return "Traditional";
  return "Professional";
}

function parseOptionalNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toExportResumeData(resume: ResumeData): ExportResumeData {
  return {
    personal: {
      full_name: resume.contact.name,
      email: resume.contact.email,
      phone: resume.contact.phone ?? "",
      location: resume.contact.location ?? "",
      linkedin_url: resume.contact.linkedin,
      website_url: resume.contact.website,
    },
    summary: resume.summary || null,
    experience: resume.experience.map((experience) => ({
      company: experience.company,
      job_title: experience.title,
      start_date: experience.start_date,
      end_date: experience.end_date,
      location: experience.location,
      responsibilities: experience.achievements,
    })),
    education: resume.education.map((education) => ({
      institution: education.institution,
      degree: education.degree,
      field_of_study: "",
      graduation_year: education.graduation_date ?? "",
      gpa: parseOptionalNumber(education.gpa),
      honors: education.honors.length > 0 ? education.honors.join("; ") : null,
    })),
    skills: groupSkills(resume.skills).map((skillGroup) => ({
      category: skillGroup.name,
      skills: skillGroup.skills,
    })),
    certifications: resume.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      date: certification.date_obtained ?? "",
      credential_id: certification.credential_id,
    })),
    projects: resume.projects.map((project) => ({
      name: project.name,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
    })),
  };
}

export function toAtsResumeData(resume: ResumeData): AtsResumeData {
  return {
    contact_info: {
      name: resume.contact.name,
      email: resume.contact.email,
      phone: resume.contact.phone ?? "",
      location: resume.contact.location ?? "",
      linkedin: resume.contact.linkedin,
      github: resume.contact.github,
      website: resume.contact.website,
    },
    summary: resume.summary,
    experience: resume.experience.map((experience) => ({
      title: experience.title,
      company: experience.company,
      location: experience.location ?? "",
      start_date: experience.start_date,
      end_date: experience.end_date ?? "Present",
      achievements: experience.achievements,
      current: !experience.end_date,
    })),
    skills: resume.skills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
    })),
    education: resume.education.map((education) => ({
      degree: education.degree,
      institution: education.institution,
      location: education.location ?? "",
      graduation_date: education.graduation_date ?? "",
      gpa: parseOptionalNumber(education.gpa),
      honors: education.honors,
    })),
    certifications: resume.certifications.map(formatCertificationEvidence),
    projects: resume.projects.map(formatProjectEvidence),
    custom_sections: {},
  };
}

function formatCertificationEvidence(certification: Certification): string {
  return [
    certification.name,
    certification.issuer,
    certification.date_obtained,
    certification.credential_id
      ? `Credential ID: ${certification.credential_id}`
      : null,
  ]
    .filter((part): part is string => !!part)
    .join(" - ");
}

function formatProjectEvidence(project: Project): string {
  return [
    project.name,
    project.description,
    project.technologies.length > 0
      ? `Technologies: ${project.technologies.join(", ")}`
      : null,
    project.url,
  ]
    .filter((part): part is string => !!part)
    .join(" - ");
}

export function normalizeAtsAnalysis(
  analysis: BackendATSAnalysis,
): ATSAnalysis {
  return {
    format_score: analysis.format_score,
    issues:
      analysis.issues ??
      analysis.format_issues?.map((issue) => issue.issue) ??
      [],
    recommendations:
      analysis.recommendations ??
      analysis.suggestions?.map((suggestion) => suggestion.suggestion) ??
      [],
  };
}
