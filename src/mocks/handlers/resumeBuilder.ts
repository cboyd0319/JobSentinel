export interface MockBuilderContact {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  website: string | null;
}

export interface MockBuilderExperience {
  id: number;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  achievements: string[];
}

export interface MockBuilderEducation {
  id: number;
  degree: string;
  institution: string;
  location: string | null;
  graduation_date: string | null;
  gpa: string | null;
  honors: string[];
}

export interface MockBuilderSkill {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
}

export interface MockResumeDraft {
  id: number;
  contact: MockBuilderContact;
  summary: string;
  experience: MockBuilderExperience[];
  education: MockBuilderEducation[];
  skills: MockBuilderSkill[];
  certifications: string[];
  projects: string[];
  created_at: string;
  updated_at: string;
}

export interface MockResumeTemplate {
  id: "Classic" | "Modern" | "Technical" | "Executive" | "Military";
  name: string;
  description: string;
  preview_image: string;
}

export function getEmptyBuilderContact(): MockBuilderContact {
  return {
    name: "",
    email: "",
    phone: null,
    linkedin: null,
    github: null,
    location: null,
    website: null,
  };
}

export function normalizeBuilderContact(value: unknown): MockBuilderContact {
  const source = isRecord(value) ? value : {};
  const defaults = getEmptyBuilderContact();

  return {
    name: typeof source.name === "string" ? source.name : defaults.name,
    email: typeof source.email === "string" ? source.email : defaults.email,
    phone: nullableString(source.phone),
    linkedin: nullableString(source.linkedin),
    github: nullableString(source.github),
    location: nullableString(source.location),
    website: nullableString(source.website),
  };
}

export function normalizeBuilderExperience(
  value: unknown,
  fallbackId: number,
): MockBuilderExperience {
  const source = isRecord(value) ? value : {};
  const achievements = stringArray(source.achievements);

  return {
    id: typeof source.id === "number" && source.id > 0 ? source.id : fallbackId,
    title: typeof source.title === "string" ? source.title : "",
    company: typeof source.company === "string" ? source.company : "",
    location: nullableString(source.location),
    start_date: typeof source.start_date === "string" ? source.start_date : "",
    end_date: nullableString(source.end_date),
    achievements: achievements.length > 0 ? achievements : stringArray(source.bullets),
  };
}

export function normalizeBuilderEducation(
  value: unknown,
  fallbackId: number,
): MockBuilderEducation {
  const source = isRecord(value) ? value : {};

  return {
    id: typeof source.id === "number" && source.id > 0 ? source.id : fallbackId,
    degree: typeof source.degree === "string" ? source.degree : "",
    institution: typeof source.institution === "string" ? source.institution : "",
    location: nullableString(source.location),
    graduation_date: nullableString(source.graduation_date),
    gpa: nullableString(source.gpa),
    honors: stringArray(source.honors),
  };
}

export function normalizeBuilderSkill(value: unknown): MockBuilderSkill | null {
  const source = isRecord(value) ? value : {};
  if (typeof source.name !== "string" || typeof source.category !== "string") {
    return null;
  }

  return {
    name: source.name,
    category: source.category,
    proficiency: isBuilderProficiency(source.proficiency) ? source.proficiency : null,
  };
}

export function normalizeResumeDraft(value: unknown): MockResumeDraft {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "number" ? source.id : 1,
    contact: normalizeBuilderContact(source.contact),
    summary: typeof source.summary === "string" ? source.summary : "",
    experience: Array.isArray(source.experience)
      ? source.experience.map((experience, index) =>
        normalizeBuilderExperience(experience, index + 1)
      )
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((education, index) => normalizeBuilderEducation(education, index + 1))
      : [],
    skills: Array.isArray(source.skills)
      ? source.skills.map(normalizeBuilderSkill).filter((skill): skill is MockBuilderSkill => !!skill)
      : [],
    certifications: stringArray(source.certifications),
    projects: stringArray(source.projects),
    created_at: typeof source.created_at === "string" ? source.created_at : now,
    updated_at: typeof source.updated_at === "string" ? source.updated_at : now,
  };
}

export function getResumeTemplates(): MockResumeTemplate[] {
  return [
    {
      id: "Classic",
      name: "Classic Professional",
      description: "Traditional chronological format with clear sections. Works with most upload forms.",
      preview_image: "/templates/classic-preview.png",
    },
    {
      id: "Modern",
      name: "Modern Minimal",
      description: "Clean, contemporary design with subtle styling and upload-friendly structure.",
      preview_image: "/templates/modern-preview.png",
    },
    {
      id: "Technical",
      name: "Skills-First",
      description: "Highlights relevant skills and projects when skills matter most.",
      preview_image: "/templates/technical-preview.png",
    },
    {
      id: "Executive",
      name: "Executive Summary",
      description: "Highlights leadership and impact metrics. Ideal for senior positions.",
      preview_image: "/templates/executive-preview.png",
    },
    {
      id: "Military",
      name: "Military Transition",
      description: "Translates military experience for civilian employers. Includes clearance.",
      preview_image: "/templates/military-preview.png",
    },
  ];
}

export function renderMockResumeHtml(value: unknown): string {
  const draft = normalizeResumeDraft(value);
  const skills = draft.skills.map((skill) => escapeHtml(skill.name)).join(", ");
  const experience = draft.experience
    .map((item) => `<li>${escapeHtml(item.title)} at ${escapeHtml(item.company)}</li>`)
    .join("");

  return `
    <article>
      <h1>${escapeHtml(draft.contact.name)}</h1>
      <p>${escapeHtml(draft.contact.email)}</p>
      <section>
        <h2>Summary</h2>
        <p>${escapeHtml(draft.summary)}</p>
      </section>
      <section>
        <h2>Experience</h2>
        <ul>${experience}</ul>
      </section>
      <section>
        <h2>Skills</h2>
        <p>${skills}</p>
      </section>
    </article>
  `;
}

export function exportMockResumeText(value: unknown): string {
  const draft = normalizeResumeDraft(value);
  return `${draft.contact.name}\n${draft.contact.email}\n\n${draft.summary}`;
}

function isBuilderProficiency(value: unknown): value is MockBuilderSkill["proficiency"] {
  return (
    value === null ||
    value === "beginner" ||
    value === "intermediate" ||
    value === "advanced" ||
    value === "expert"
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const escapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return escapes[char] ?? char;
  });
}
