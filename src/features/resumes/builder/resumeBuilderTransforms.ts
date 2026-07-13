import type {
  ATSAnalysis,
  AtsResumeData,
  BackendATSAnalysis,
  Certification,
  ContactInfo,
  ExportResumeData,
  ExportTemplateId,
  JsonResumeData,
  Project,
  ResumeData,
  SkillEntry,
  TemplateId,
  TemplateResumeData,
  TemplateSkillCategory,
} from "./resumeBuilderData";

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

function jsonResumeProfiles(contact: ContactInfo): JsonResumeData["basics"]["profiles"] {
  return [
    contact.linkedin
      ? {
          network: "LinkedIn",
          username: "",
          url: contact.linkedin,
        }
      : null,
    contact.github
      ? {
          network: "GitHub",
          username: "",
          url: contact.github,
        }
      : null,
  ].filter((profile): profile is JsonResumeData["basics"]["profiles"][number] =>
    Boolean(profile),
  );
}

function jsonResumeSkillLevel(skills: SkillEntry[]) {
  const strengthRank: Record<NonNullable<SkillEntry["proficiency"]>, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
  };
  const strongest = skills.reduce<NonNullable<SkillEntry["proficiency"]> | null>(
    (best, skill) => {
      if (!skill.proficiency) return best;
      if (!best) return skill.proficiency;

      return strengthRank[skill.proficiency] > strengthRank[best]
        ? skill.proficiency
        : best;
    },
    null,
  );

  return strongest ?? "intermediate";
}

function toJsonResumeSkillGroups(skills: SkillEntry[]): JsonResumeData["skills"] {
  const grouped = skills.reduce<Record<string, SkillEntry[]>>((acc, skill) => {
    const category = skill.category || "General";
    acc[category] = [...(acc[category] ?? []), skill];
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, values]) => ({
    name,
    level: jsonResumeSkillLevel(values),
    keywords: values.map((skill) => skill.name),
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

export function toJsonResumeData(resume: ResumeData): JsonResumeData {
  return {
    basics: {
      name: resume.contact.name,
      label: "",
      image: "",
      email: resume.contact.email,
      phone: resume.contact.phone ?? "",
      url: resume.contact.website ?? "",
      summary: resume.summary,
      location: {
        address: resume.contact.location ?? "",
        postalCode: "",
        city: "",
        countryCode: "",
        region: "",
      },
      profiles: jsonResumeProfiles(resume.contact),
    },
    work: resume.experience.map((experience) => ({
      name: experience.company,
      position: experience.title,
      url: "",
      startDate: experience.start_date,
      endDate: experience.end_date ?? "",
      summary: "",
      highlights: experience.achievements,
    })),
    education: resume.education.map((education) => ({
      institution: education.institution,
      url: "",
      area: "",
      studyType: education.degree,
      startDate: "",
      endDate: education.graduation_date ?? "",
      score: education.gpa ?? "",
      courses: education.honors,
    })),
    certificates: resume.certifications.map((certification) => ({
      name: certification.name,
      date: certification.date_obtained ?? "",
      issuer: certification.issuer,
      url: "",
    })),
    skills: toJsonResumeSkillGroups(resume.skills),
    projects: resume.projects.map((project) => ({
      name: project.name,
      description: project.description,
      highlights: [],
      keywords: project.technologies,
      startDate: project.start_date ?? "",
      endDate: project.end_date ?? "",
      url: project.url ?? "",
      roles: [],
      entity: "",
      type: "",
    })),
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
