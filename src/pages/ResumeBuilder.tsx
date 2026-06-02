import { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Progress } from "../components/Progress";
import { Modal, ModalFooter } from "../components/Modal";
import { AtsLiveScorePanel } from "../components/AtsLiveScorePanel";
import { useToast } from "../hooks/useToast";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import { readStorageValue, removeStorageValue } from "../utils/browserStorage";
import { getSafeErrorToastCopy } from "../utils/safeErrorCopy";
import {
  canProceedResumeBuilderStep,
  getResumeBuilderStepValidationMessage,
} from "./resumeBuilderValidation";

// TypeScript Types
interface Resume {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSkill {
  id: number;
  resume_id: number;
  skill_name: string;
  skill_category: string | null;
  confidence_score: number;
  years_experience: number | null;
  proficiency_level: string | null;
  source: string;
}

interface ATSAnalysis {
  format_score: number;
  issues: string[];
  recommendations: string[];
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  website: string | null;
}

interface Experience {
  id: number;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  achievements: string[];
}

interface Education {
  id: number;
  degree: string;
  institution: string;
  location: string | null;
  graduation_date: string | null;
  gpa: string | null;
  honors: string[];
}

interface SkillEntry {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
}

interface ResumeData {
  id: number;
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillEntry[];
  certifications: string[];
  projects: string[];
  created_at: string;
  updated_at: string;
}

type TemplateId = "Classic" | "Modern" | "Technical" | "Executive" | "Military";

interface Template {
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

interface BackendATSAnalysis {
  format_score: number;
  issues?: string[];
  recommendations?: string[];
  format_issues?: Array<{ issue: string }>;
  suggestions?: Array<{ suggestion: string }>;
}

const STEPS = [
  { id: 1, name: "Contact", description: "Personal information" },
  { id: 2, name: "Summary", description: "Professional summary" },
  { id: 3, name: "Experience", description: "Work history" },
  { id: 4, name: "Education", description: "Academic background" },
  { id: 5, name: "Skills", description: "Role and people skills" },
  { id: 6, name: "Preview", description: "Choose template" },
  { id: 7, name: "Export", description: "Download resume" },
];

const SKILL_STRENGTH_VALUES = ["beginner", "intermediate", "advanced", "expert"] as const;
const SKILL_STRENGTH_LABELS: Record<(typeof SKILL_STRENGTH_VALUES)[number], string> = {
  beginner: "Learning",
  intermediate: "Some practice",
  advanced: "Regular use",
  expert: "Can train others",
};

function getSkillStrengthLabel(proficiency: SkillEntry["proficiency"]) {
  return proficiency ? SKILL_STRENGTH_LABELS[proficiency] : "";
}

function groupSkills(skills: SkillEntry[]): TemplateSkillCategory[] {
  const grouped = skills.reduce<Record<string, string[]>>((acc, skill) => {
    const category = skill.category || "General";
    acc[category] = [...(acc[category] ?? []), skill.name];
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, values]) => ({ name, skills: values }));
}

function toTemplateResumeData(resume: ResumeData): TemplateResumeData {
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
    certifications: [],
    clearance: null,
    military_info: null,
  };
}

function toExportTemplateId(template: TemplateId): ExportTemplateId {
  if (template === "Modern") return "Modern";
  if (template === "Classic") return "Traditional";
  return "Professional";
}

function parseOptionalNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toExportResumeData(resume: ResumeData): ExportResumeData {
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
    certifications: [],
    projects: [],
  };
}

function toAtsResumeData(resume: ResumeData): AtsResumeData {
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
    certifications: resume.certifications,
    projects: resume.projects,
    custom_sections: {},
  };
}

function normalizeAtsAnalysis(analysis: BackendATSAnalysis): ATSAnalysis {
  return {
    format_score: analysis.format_score,
    issues: analysis.issues ?? analysis.format_issues?.map((issue) => issue.issue) ?? [],
    recommendations:
      analysis.recommendations ??
      analysis.suggestions?.map((suggestion) => suggestion.suggestion) ??
      [],
  };
}

interface ResumeBuilderProps {
  onBack: () => void;
}

export default function ResumeBuilder({ onBack }: ResumeBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("Modern");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [importingSkills, setImportingSkills] = useState(false);
  const initializedRef = useRef(false);
  const hasJobContext = readStorageValue("session", "jobContext") !== null;

  // Contact form state
  const [contact, setContact] = useState<ContactInfo>({
    name: "",
    email: "",
    phone: null,
    linkedin: null,
    github: null,
    location: null,
    website: null,
  });

  // Summary state
  const [summary, setSummary] = useState("");

  // Experience state
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  // Education state
  const [educations, setEducations] = useState<Education[]>([]);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [showEducationModal, setShowEducationModal] = useState(false);

  // Skills state
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'experience' | 'education' | 'skill';
    id: number;
    name: string;
  } | null>(null);
  const [newSkill, setNewSkill] = useState<SkillEntry>({
    name: "",
    category: "",
    proficiency: null,
  });

  const toast = useToast();

  const initializeResume = useCallback(async () => {
    try {
      setLoading(true);
      const id = await safeInvoke<number>("create_resume_draft", {}, {
        logContext: "Create resume draft"
      });
      setResumeId(id);

      // Load templates
      const templatesData = await safeInvoke<Template[]>("list_resume_templates", {}, {
        logContext: "List resume templates"
      });
      setTemplates(templatesData);

      toast.success("Resume created", "Let's build your resume");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Resume builder unavailable",
        fallbackMessage:
          "Resume builder did not start. Copy a safe support report if this keeps happening, then close and reopen JobSentinel.",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initialize resume on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeResume();
  }, [initializeResume]);

  // Load resume data
  const loadResumeData = useCallback(async () => {
    if (!resumeId) return;

    try {
      const data = await safeInvoke<ResumeData | null>("get_resume_draft", { resumeId }, {
        logContext: "Load resume draft"
      });
      if (data) {
        setResumeData(data);
        setContact(data.contact);
        setSummary(data.summary);
        setExperiences(data.experience);
        setEducations(data.education);
        setSkills(data.skills);
      }
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Couldn't load your resume",
        fallbackMessage:
          "Resume details did not load. Copy a safe support report if this keeps happening, then create a new resume only if you need to keep working.",
      });
      toast.error(safeError.title, safeError.message);
    }
  }, [resumeId, toast]);

  // Auto-save on step change
  const saveCurrentStep = useCallback(async () => {
    if (!resumeId) return;

    try {
      setSaving(true);

      switch (currentStep) {
        case 1:
          await safeInvoke("update_resume_contact", { resumeId, contact }, {
            logContext: "Update resume contact"
          });
          break;
        case 2:
          await safeInvoke("update_resume_summary", { resumeId, summary }, {
            logContext: "Update resume summary"
          });
          break;
        case 5:
          await safeInvoke("set_resume_skills", { resumeId, skills }, {
            logContext: "Set resume skills"
          });
          break;
      }

      await loadResumeData();
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Your changes weren't saved",
        fallbackMessage:
          "The resume section couldn't be saved. Copy your work to a safe place and try again.",
      });
      toast.error(safeError.title, safeError.message);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [resumeId, currentStep, contact, summary, skills, loadResumeData, toast]);

  // Navigation handlers
  const handleNext = async () => {
    if (!canProceed()) {
      toast.warning("Add missing resume details", getValidationMessage());
      return;
    }

    try {
      await saveCurrentStep();
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    } catch {
      // Error already shown by saveCurrentStep
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Validation using lookup pattern (better performance than switch)
  const canProceed = useCallback((): boolean => {
    return canProceedResumeBuilderStep(currentStep, {
      contact,
      summary,
      experiences,
      educations,
      skills,
    });
  }, [currentStep, contact, summary, experiences, educations, skills]);

  // Validation messages using lookup pattern
  const getValidationMessage = useCallback((): string => {
    return getResumeBuilderStepValidationMessage(currentStep, {
      contact,
      summary,
      experiences,
      educations,
      skills,
    });
  }, [currentStep, contact, summary, experiences, educations, skills]);

  // Experience handlers
  const handleAddExperience = async () => {
    if (!resumeId || !editingExperience) return;

    try {
      const id = await safeInvokeWithToast<number>("add_resume_experience", {
        resumeId,
        experience: editingExperience,
      }, toast, {
        logContext: "Add resume experience"
      });

      setExperiences([...experiences, { ...editingExperience, id }]);
      setShowExperienceModal(false);
      setEditingExperience(null);
      toast.success("Experience added", "");
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleDeleteExperience = async (experienceId: number) => {
    if (!resumeId) return;

    try {
      await safeInvokeWithToast("delete_resume_experience", { resumeId, experienceId }, toast, {
        logContext: "Delete resume experience"
      });
      setExperiences(experiences.filter((e) => e.id !== experienceId));
      toast.success("Experience removed", "");
    } catch {
      // Error already logged and shown to user
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteExperience = (exp: Experience) => {
    setDeleteConfirm({ type: 'experience', id: exp.id, name: `${exp.title} at ${exp.company}` });
  };

  // Education handlers
  const handleAddEducation = async () => {
    if (!resumeId || !editingEducation) return;

    try {
      const id = await safeInvokeWithToast<number>("add_resume_education", {
        resumeId,
        education: editingEducation,
      }, toast, {
        logContext: "Add resume education"
      });

      setEducations([...educations, { ...editingEducation, id }]);
      setShowEducationModal(false);
      setEditingEducation(null);
      toast.success("Education added", "");
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleDeleteEducation = async (educationId: number) => {
    if (!resumeId) return;

    try {
      await safeInvokeWithToast("delete_resume_education", { resumeId, educationId }, toast, {
        logContext: "Delete resume education"
      });
      setEducations(educations.filter((e) => e.id !== educationId));
      toast.success("Education removed", "");
    } catch {
      // Error already logged and shown to user
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteEducation = (edu: Education) => {
    setDeleteConfirm({ type: 'education', id: edu.id, name: `${edu.degree} at ${edu.institution}` });
  };

  // Skills handlers
  const handleAddSkill = () => {
    if (!newSkill.name || !newSkill.category) {
      toast.warning("Add skill details", "Add a skill name and category, then add the skill.");
      return;
    }

    setSkills([...skills, newSkill]);
    setNewSkill({ name: "", category: "", proficiency: null });
  };

  const handleDeleteSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
    setDeleteConfirm(null);
  };

  const confirmDeleteSkill = (index: number, skillName: string) => {
    setDeleteConfirm({ type: 'skill', id: index, name: skillName });
  };

  const handleImportSkills = async () => {
    try {
      setImportingSkills(true);

      // Get active resume
      const activeResume = await safeInvoke<Resume>("get_active_resume", {}, {
        logContext: "Get active resume for skill import"
      });
      if (!activeResume) {
        toast.warning("No resume uploaded", "Please upload a resume in Resume Match first");
        return;
      }

      // Get skills from resume
      const userSkills = await safeInvoke<UserSkill[]>("get_user_skills", {
        resumeId: activeResume.id,
      }, {
        logContext: "Get user skills for import"
      });

      if (userSkills.length === 0) {
        toast.info("No skills found", "Upload and review a resume in Resume Match first");
        return;
      }

      // Map UserSkill to SkillEntry format
      const importedSkills: SkillEntry[] = userSkills.map((skill) => ({
        name: skill.skill_name,
        category: skill.skill_category || "General",
        proficiency: mapProficiencyLevel(skill.proficiency_level),
      }));

      // Merge with existing skills (avoid duplicates)
      const existingSkillNames = new Set(skills.map((s) => s.name.toLowerCase()));
      const newSkills = importedSkills.filter(
        (skill) => !existingSkillNames.has(skill.name.toLowerCase())
      );

      if (newSkills.length === 0) {
        toast.info("All skills already added", "No new skills to import");
        return;
      }

      setSkills([...skills, ...newSkills]);
      toast.success(`Imported ${newSkills.length} skills`, "Skills added from resume");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not import skills",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setImportingSkills(false);
    }
  };

  // Map proficiency level from UserSkill to builder format
  const mapProficiencyLevel = (
    level: string | null
  ): "beginner" | "intermediate" | "advanced" | "expert" | null => {
    if (!level) return null;
    const normalized = level.toLowerCase();
    if (normalized.includes("expert") || normalized.includes("advanced")) return "expert";
    if (normalized.includes("intermediate") || normalized.includes("proficient"))
      return "intermediate";
    if (normalized.includes("beginner") || normalized.includes("basic")) return "beginner";
    return "intermediate"; // Default fallback
  };

  // Preview handlers
  const generatePreview = useCallback(async () => {
    if (!resumeId || !resumeData) return;

    try {
      setLoading(true);
      // NOTE: render_resume_html must sanitize all user input on the Rust side
      // to prevent XSS attacks. The HTML returned here is trusted.
      const html = await safeInvoke<string>("render_resume_html", {
        resume: toTemplateResumeData(resumeData),
        templateId: selectedTemplate,
      }, {
        logContext: "Render resume HTML"
      });
      setPreviewHtml(html);

      // Generate resume readability analysis
      try {
        const analysis = await safeInvoke<BackendATSAnalysis>("analyze_resume_format", {
          resume: toAtsResumeData(resumeData),
        }, {
          logContext: "Analyze resume format",
          silent: true  // Non-critical, don't log failures
        });
        setAtsAnalysis(normalizeAtsAnalysis(analysis));
      } catch {
        // Non-critical, don't block preview
      }
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not create preview",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setLoading(false);
    }
  }, [resumeId, resumeData, selectedTemplate, toast]);

  useEffect(() => {
    if (currentStep === 6) {
      generatePreview();
    }
  }, [currentStep, generatePreview]);

  // Export DOCX handler
  const handleExportDocx = async () => {
    if (!resumeData) return;

    try {
      setExporting(true);
      const docxData = await safeInvoke<number[]>("export_resume_docx", {
        resume: toExportResumeData(resumeData),
        template: toExportTemplateId(selectedTemplate),
      }, {
        logContext: "Export resume to DOCX"
      });

      // Create Blob and download
      const blob = new Blob([new Uint8Array(docxData)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contact.name.replace(/\s+/g, "_")}_Resume.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Resume exported", "Downloaded as DOCX");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not export resume",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setExporting(false);
    }
  };

  // Export PDF handler (via browser print)
  const handleExportPdf = async () => {
    if (!resumeData) return;

    try {
      setExporting(true);

      // Generate HTML using the selected template
      const html = await safeInvoke<string>("render_resume_html", {
        resume: toTemplateResumeData(resumeData),
        templateId: selectedTemplate,
      }, {
        logContext: "Render resume for PDF export"
      });

      // Create a hidden iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      // Write HTML to iframe
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        // Wait for content to load, then trigger print
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            // Remove iframe after print dialog closes (3s to allow for print dialog)
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 3000);
          }, 250);
        };

        // Fallback: trigger print after a delay if onload doesn't fire
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch {
            // Print dialog may have been triggered already
          }
        }, 500);
      }

      toast.success("Print dialog opened", "Save as PDF using your browser's print dialog");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not open print view",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setExporting(false);
    }
  };

  // Legacy export handler (defaults to DOCX)
  const handleExport = handleExportDocx;

  // Loading state
  if (loading && !resumeId) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-surface-600 dark:text-surface-400">Initializing resume builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <svg className="w-5 h-5 text-surface-600 dark:text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
                Resume Builder
              </h1>
              <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.name ?? 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <Progress
            value={((currentStep - 1) / (STEPS.length - 1)) * 100}
            size="sm"
            variant="sentinel"
          />
          <div className="flex justify-between mt-3">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`text-xs text-center ${
                  step.id === currentStep
                    ? "text-sentinel-600 dark:text-sentinel-400 font-semibold"
                    : step.id < currentStep
                    ? "text-surface-600 dark:text-surface-400"
                    : "text-surface-400 dark:text-surface-500"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm ${
                    step.id === currentStep
                      ? "bg-sentinel-500 text-white"
                      : step.id < currentStep
                      ? "bg-sentinel-100 dark:bg-sentinel-900/30 text-sentinel-600 dark:text-sentinel-400"
                      : "bg-surface-100 dark:bg-surface-700 text-surface-400"
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="hidden sm:block">{step.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card>
          {/* Step 1: Contact Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <CardHeader
                title="Contact Information"
                subtitle="How can employers reach you?"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="Jordan Lee"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contact.phone || ""}
                    onChange={(e) =>
                      setContact({ ...contact, phone: e.target.value || null })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={contact.location || ""}
                    onChange={(e) =>
                      setContact({ ...contact, location: e.target.value || null })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="Chicago, IL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={contact.linkedin || ""}
                    onChange={(e) =>
                      setContact({ ...contact, linkedin: e.target.value || null })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="linkedin.com/in/your-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Portfolio or work samples
                  </label>
                  <input
                    type="url"
                    value={contact.github || ""}
                    onChange={(e) =>
                      setContact({ ...contact, github: e.target.value || null })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="portfolio.example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Personal website or credential page
                  </label>
                  <input
                    type="url"
                    value={contact.website || ""}
                    onChange={(e) =>
                      setContact({ ...contact, website: e.target.value || null })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="https://your-name.example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Professional Summary */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <CardHeader
                title="Professional Summary"
                subtitle="A brief overview of your professional background (2-3 sentences)"
              />
              <div>
                <label htmlFor="professional-summary" className="sr-only">Professional Summary</label>
                <textarea
                  id="professional-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={6}
                  aria-describedby="summary-hint"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-none"
                  placeholder="Customer success manager with 5+ years improving onboarding, renewals, and customer experience. Known for clear communication, strong follow-through, and practical process improvements."
                />
                <p id="summary-hint" className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                  {summary.length} characters (minimum 10)
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Work Experience */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <CardHeader
                  title="Work Experience"
                  subtitle="Your professional work history"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingExperience({
                      id: 0,
                      title: "",
                      company: "",
                      location: null,
                      start_date: "",
                      end_date: null,
                      achievements: [],
                    });
                    setShowExperienceModal(true);
                  }}
                >
                  + Add Experience
                </Button>
              </div>
              {experiences.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="font-medium text-surface-700 dark:text-surface-300 mb-1">No work experience added yet</p>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                    Add your relevant work history to strengthen your resume
                  </p>
                  <Button size="sm" onClick={() => setShowExperienceModal(true)}>
                    Add Your First Job
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-surface-800 dark:text-surface-200">
                            {exp.title}
                          </h4>
                          <p className="text-sm text-surface-600 dark:text-surface-400">
                            {exp.company}
                            {exp.location && ` • ${exp.location}`}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {exp.start_date} - {exp.end_date || "Present"}
                          </p>
                          {exp.achievements.length > 0 && (
                            <ul className="list-disc list-inside mt-2 text-sm text-surface-600 dark:text-surface-400 space-y-1">
                              {exp.achievements.map((achievement, idx) => (
                                <li key={idx}>{achievement}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          onClick={() => confirmDeleteExperience(exp)}
                          className="p-2 text-surface-400 hover:text-red-500 transition-colors"
                          aria-label="Delete experience"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Education */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <CardHeader
                  title="Education"
                  subtitle="Your academic background"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingEducation({
                      id: 0,
                      degree: "",
                      institution: "",
                      location: null,
                      graduation_date: null,
                      gpa: null,
                      honors: [],
                    });
                    setShowEducationModal(true);
                  }}
                >
                  + Add Education
                </Button>
              </div>
              {educations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <p className="font-medium text-surface-700 dark:text-surface-300 mb-1">No education added yet</p>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                    Add your educational background to complete your profile
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingEducation({
                        id: 0,
                        degree: "",
                        institution: "",
                        location: null,
                        graduation_date: null,
                        gpa: null,
                        honors: [],
                      });
                      setShowEducationModal(true);
                    }}
                  >
                    Add Education
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {educations.map((edu) => (
                    <div
                      key={edu.id}
                      className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-surface-800 dark:text-surface-200">
                            {edu.degree}
                          </h4>
                          <p className="text-sm text-surface-600 dark:text-surface-400">
                            {edu.institution}
                            {edu.location && ` • ${edu.location}`}
                          </p>
                          {edu.graduation_date && (
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                              Graduated: {edu.graduation_date}
                            </p>
                          )}
                          {edu.gpa && (
                            <p className="text-xs text-surface-500 dark:text-surface-400">
                              GPA: {edu.gpa}
                            </p>
                          )}
                          {edu.honors.length > 0 && (
                            <ul className="list-disc list-inside mt-2 text-sm text-surface-600 dark:text-surface-400">
                              {edu.honors.map((honor, idx) => (
                                <li key={idx}>{honor}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          onClick={() => confirmDeleteEducation(edu)}
                          className="p-2 text-surface-400 hover:text-red-500 transition-colors"
                          aria-label="Delete education"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Skills */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <CardHeader
                  title="Skills"
                  subtitle="Role and professional skills"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleImportSkills}
                  loading={importingSkills}
                >
                  Import from Resume
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="Project Management"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newSkill.category}
                    onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    placeholder="Operations"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Skill strength
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newSkill.proficiency || ""}
                      onChange={(e) =>
                        setNewSkill({
                          ...newSkill,
                          proficiency: (e.target.value as typeof newSkill.proficiency) || null,
                        })
                      }
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                    >
                      <option value="">Select strength</option>
                      {SKILL_STRENGTH_VALUES.map((level) => (
                        <option key={level} value={level}>
                          {SKILL_STRENGTH_LABELS[level]}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleAddSkill}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              {skills.length > 0 && (
                <div className="space-y-2">
                  {skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-surface-800 dark:text-surface-200">
                          {skill.name}
                        </span>
                        <span className="mx-2 text-surface-400">•</span>
                        <span className="text-sm text-surface-600 dark:text-surface-400">
                          {skill.category}
                        </span>
                        {skill.proficiency && (
                          <>
                            <span className="mx-2 text-surface-400">•</span>
                            <span className="text-xs text-surface-500 dark:text-surface-400">
                              {getSkillStrengthLabel(skill.proficiency)}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => confirmDeleteSkill(idx, skill.name)}
                        className="p-2 text-surface-400 hover:text-red-500 transition-colors"
                        aria-label="Delete skill"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Preview & Template Selection */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <CardHeader
                title="Choose Template"
                subtitle="Select a template and preview your resume"
              />
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    aria-label={`Select ${template.name} template: ${template.description}`}
                    aria-pressed={selectedTemplate === template.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? "border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/20"
                        : "border-surface-200 dark:border-surface-600 hover:border-sentinel-300 dark:hover:border-sentinel-700"
                    }`}
                  >
                    <div className="aspect-[8.5/11] bg-surface-100 dark:bg-surface-700 rounded mb-2 overflow-hidden">
                      <TemplateThumbnail templateId={template.id} />
                    </div>
                    <p className="text-xs font-medium text-surface-800 dark:text-surface-200">
                      {template.name}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Resume readability card and preview */}
              {(atsAnalysis || previewHtml) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Resume readability card */}
                  {atsAnalysis && (
                    <div className="lg:col-span-1">
                      <div className="border border-surface-200 dark:border-surface-600 rounded-lg p-4 bg-white dark:bg-surface-800">
                        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">
                          Resume Format Readability
                        </h3>
                        <div className="flex items-center justify-center mb-4">
                          <div className="relative w-24 h-24">
                            <svg className="w-24 h-24 transform -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-surface-200 dark:text-surface-600"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={`${
                                  2 * Math.PI * 40 * (1 - atsAnalysis.format_score / 100)
                                }`}
                                className={
                                  atsAnalysis.format_score >= 80
                                    ? "text-success"
                                    : atsAnalysis.format_score >= 60
                                    ? "text-warning"
                                    : "text-error"
                                }
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl font-bold text-surface-800 dark:text-surface-200">
                                {Math.round(atsAnalysis.format_score)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {atsAnalysis.issues.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">
                              Things To Check
                            </h4>
                            <ul className="space-y-1">
                              {atsAnalysis.issues.slice(0, 3).map((issue, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-surface-600 dark:text-surface-400 flex items-start"
                                >
                                  <span className="text-error mr-1">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                            {atsAnalysis.issues.length > 3 && (
                              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                +{atsAnalysis.issues.length - 3} more things to check
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                          For a fuller review, use Resume Match with the job posting you care
                          about.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* HTML Preview */}
                  {previewHtml && (
                    <div
                      className={`${
                        atsAnalysis ? "lg:col-span-2" : "lg:col-span-3"
                      } border border-surface-200 dark:border-surface-600 rounded-lg p-6 bg-white dark:bg-surface-700 max-h-96 overflow-y-auto`}
                    >
                      {/* SAFETY: HTML is sanitized by DOMPurify (defense in depth with Rust backend) */}
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 7: Export */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center">
              <CardHeader
                title="Export Resume"
                subtitle="Download your resume in PDF or DOCX format"
              />
              <div className="py-8">
                <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-200 mb-2">
                  Your resume is ready!
                </h3>
                <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">
                  Export as PDF for final submission or DOCX for further editing
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={handleExportPdf} loading={exporting} size="lg">
                    <PdfIcon className="w-5 h-5 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={handleExportDocx} loading={exporting} size="lg" variant="secondary">
                    <DocxIcon className="w-5 h-5 mr-2" />
                    Download DOCX
                  </Button>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-4">
                  PDF export opens your browser's print dialog - select "Save as PDF"
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-surface-200 dark:border-surface-700">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            <div className="text-sm text-surface-500 dark:text-surface-400">
              {saving && "Saving..."}
            </div>
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} loading={saving}>
                Next
              </Button>
            ) : (
              <Button onClick={handleExport} loading={exporting}>
                Export Resume
              </Button>
            )}
          </div>
        </Card>
          </div>

          {/* Resume readability sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <AtsLiveScorePanel
              resumeData={
                contact.name
                  ? {
                      contact,
                      summary,
                      experience: experiences,
                      education: educations,
                      skills,
                    }
                  : null
              }
              currentStep={currentStep}
              debounceMs={1500}
              showFullAnalysis={true}
            />

            {/* Job Context Info */}
            {hasJobContext && (
              <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm p-4">
                <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-sentinel-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Tailoring for Job
                </h4>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Your resume is being checked against a saved job description from Resume Match.
                </p>
                <button
                  onClick={() => {
                    removeStorageValue("session", "jobContext");
                    window.location.reload();
                  }}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear job context
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Experience Modal */}
      <Modal
        isOpen={showExperienceModal}
        onClose={() => setShowExperienceModal(false)}
        title="Add Work Experience"
      >
        {editingExperience && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={editingExperience.title}
                  onChange={(e) =>
                    setEditingExperience({ ...editingExperience, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Marketing Manager"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={editingExperience.company}
                  onChange={(e) =>
                    setEditingExperience({ ...editingExperience, company: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Start Date
                </label>
                <input
                  type="text"
                  value={editingExperience.start_date}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Jan 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  End Date
                </label>
                <input
                  type="text"
                  value={editingExperience.end_date || ""}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      end_date: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Present"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editingExperience.location || ""}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      location: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Chicago, IL"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Achievements (one per line)
                </label>
                <textarea
                  value={editingExperience.achievements.join("\n")}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      achievements: e.target.value.split("\n").filter((a) => a.trim()),
                    })
                  }
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-none"
                  placeholder="Improved renewal rate by 18%&#10;Built onboarding checklist for new customers&#10;Trained 12 teammates on support workflows"
                />
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowExperienceModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddExperience}
                disabled={!editingExperience.title || !editingExperience.company}
              >
                Add Experience
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Education Modal */}
      <Modal
        isOpen={showEducationModal}
        onClose={() => setShowEducationModal(false)}
        title="Add Education"
      >
        {editingEducation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Degree
                </label>
                <input
                  type="text"
                  value={editingEducation.degree}
                  onChange={(e) =>
                    setEditingEducation({ ...editingEducation, degree: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="B.A. Business Administration"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={editingEducation.institution}
                  onChange={(e) =>
                    setEditingEducation({ ...editingEducation, institution: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Stanford University"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Graduation Date
                </label>
                <input
                  type="text"
                  value={editingEducation.graduation_date || ""}
                  onChange={(e) =>
                    setEditingEducation({
                      ...editingEducation,
                      graduation_date: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="May 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  GPA
                </label>
                <input
                  type="text"
                  value={editingEducation.gpa || ""}
                  onChange={(e) =>
                    setEditingEducation({
                      ...editingEducation,
                      gpa: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="3.8"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editingEducation.location || ""}
                  onChange={(e) =>
                    setEditingEducation({
                      ...editingEducation,
                      location: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                  placeholder="Stanford, CA"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Honors & Awards (one per line)
                </label>
                <textarea
                  value={editingEducation.honors.join("\n")}
                  onChange={(e) =>
                    setEditingEducation({
                      ...editingEducation,
                      honors: e.target.value.split("\n").filter((h) => h.trim()),
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-none"
                  placeholder="Dean's List&#10;Summa Cum Laude"
                />
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowEducationModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddEducation}
                disabled={!editingEducation.degree || !editingEducation.institution}
              >
                Add Education
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.type === 'experience' ? 'Experience' : deleteConfirm?.type === 'education' ? 'Education' : 'Skill'}?`}
      >
        <p className="text-surface-600 dark:text-surface-400 mb-4">
          Are you sure you want to delete <span className="font-medium text-surface-800 dark:text-surface-200">{deleteConfirm?.name}</span>? This action cannot be undone.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!deleteConfirm) return;
              if (deleteConfirm.type === 'experience') {
                handleDeleteExperience(deleteConfirm.id);
              } else if (deleteConfirm.type === 'education') {
                handleDeleteEducation(deleteConfirm.id);
              } else {
                handleDeleteSkill(deleteConfirm.id);
              }
            }}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// Template Thumbnail Component
function TemplateThumbnail({ templateId }: { templateId: TemplateId }) {
  const thumbnails: Record<TemplateId, React.ReactElement> = {
    Classic: (
      <div className="w-full h-full bg-white dark:bg-surface-800 p-2 text-[4px] leading-tight">
        <div className="text-center mb-1">
          <div className="font-bold">JOHN DOE</div>
          <div className="text-surface-500">Marketing Manager</div>
        </div>
        <div className="space-y-1">
          <div className="border-t border-surface-300 dark:border-surface-600 pt-1">
            <div className="font-semibold">EXPERIENCE</div>
            <div className="text-surface-600 dark:text-surface-400">Content Lead • 2020-2024</div>
          </div>
          <div className="border-t border-surface-300 dark:border-surface-600 pt-1">
            <div className="font-semibold">EDUCATION</div>
            <div className="text-surface-600 dark:text-surface-400">B.A. Communications</div>
          </div>
        </div>
      </div>
    ),
    Modern: (
      <div className="w-full h-full bg-gradient-to-br from-sentinel-50 to-white dark:from-surface-800 dark:to-surface-900 p-2 text-[4px] leading-tight">
        <div className="bg-sentinel-600 text-white p-1 mb-1">
          <div className="font-bold">JOHN DOE</div>
          <div>Operations Manager</div>
        </div>
        <div className="space-y-1 px-1">
          <div>
            <div className="font-semibold text-sentinel-600">Experience</div>
            <div className="text-surface-600 dark:text-surface-400">Program Manager</div>
          </div>
          <div>
            <div className="font-semibold text-sentinel-600">Education</div>
            <div className="text-surface-600 dark:text-surface-400">Business Administration</div>
          </div>
        </div>
      </div>
    ),
    Technical: (
      <div className="w-full h-full bg-white dark:bg-surface-800 p-2 text-[4px] leading-tight">
        <div className="border-b-2 border-success pb-1 mb-1">
          <div className="font-bold">JOHN DOE</div>
          <div className="text-success">Community Program Lead</div>
        </div>
        <div className="space-y-1">
          <div className="border-l-2 border-surface-300 dark:border-surface-600 pl-1">
            <div className="font-semibold text-success">SKILLS</div>
            <div className="text-surface-600 dark:text-surface-400">Scheduling • Outreach</div>
          </div>
          <div className="border-l-2 border-surface-300 dark:border-surface-600 pl-1">
            <div className="font-semibold text-success">EXPERIENCE</div>
            <div className="text-surface-600 dark:text-surface-400">Program Coordinator</div>
          </div>
        </div>
      </div>
    ),
    Executive: (
      <div className="w-full h-full bg-white dark:bg-surface-800 p-2 text-[4px] leading-tight">
        <div className="border-b-2 border-surface-800 dark:border-surface-200 pb-1 mb-1">
          <div className="font-bold text-lg">JOHN DOE</div>
          <div className="text-surface-600 dark:text-surface-400 italic">
            Chief Operations Officer
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <div className="font-semibold uppercase tracking-wider">Experience</div>
            <div className="text-surface-600 dark:text-surface-400">COO • 2020-2024</div>
          </div>
          <div>
            <div className="font-semibold uppercase tracking-wider">Education</div>
            <div className="text-surface-600 dark:text-surface-400">MBA, Stanford</div>
          </div>
        </div>
      </div>
    ),
    Military: (
      <div className="w-full h-full bg-surface-50 dark:bg-surface-900 p-2 text-[4px] leading-tight">
        <div className="border-4 border-surface-800 dark:border-surface-200 p-1 mb-1">
          <div className="text-center font-bold">DOE, JOHN A.</div>
          <div className="text-center text-surface-600 dark:text-surface-400">
            LOGISTICS MANAGER
          </div>
        </div>
        <div className="space-y-1">
          <div className="border border-surface-300 dark:border-surface-600 p-1">
            <div className="font-semibold">PROFESSIONAL EXPERIENCE</div>
            <div className="text-surface-600 dark:text-surface-400">
              Logistics Manager
            </div>
          </div>
          <div className="border border-surface-300 dark:border-surface-600 p-1">
            <div className="font-semibold">EDUCATION & TRAINING</div>
            <div className="text-surface-600 dark:text-surface-400">Operations Leadership</div>
          </div>
        </div>
      </div>
    ),
  };

  return thumbnails[templateId] || null;
}

// Icons
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h2v2H9v-2zm0 0V9l4 4m-4 0h4"
      />
    </svg>
  );
}

function DocxIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
