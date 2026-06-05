import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Progress } from "../components/Progress";
import { Modal, ModalFooter } from "../components/Modal";
import { AtsLiveScorePanel } from "../components/AtsLiveScorePanel";
import ContactStep from "../components/resume-builder/steps/ContactStep";
import EducationStep from "../components/resume-builder/steps/EducationStep";
import ExperienceStep from "../components/resume-builder/steps/ExperienceStep";
import SkillsStep from "../components/resume-builder/steps/SkillsStep";
import SummaryStep from "../components/resume-builder/steps/SummaryStep";
import { useToast } from "../hooks/useToast";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import { readStorageValue, removeStorageValue } from "../utils/browserStorage";
import { getSafeErrorToastCopy } from "../utils/safeErrorCopy";
import {
  canProceedResumeBuilderStep,
  getResumeBuilderStepValidationMessage,
} from "./resumeBuilderValidation";
import {
  CheckCircleIcon,
  DocxIcon,
  PdfIcon,
} from "./ResumeBuilderVisuals";
import { ResumeBuilderPreviewStep } from "./ResumeBuilderPreviewStep";
import {
  STEPS,
  normalizeAtsAnalysis,
  toAtsResumeData,
  toExportResumeData,
  toExportTemplateId,
  toTemplateResumeData,
  type ATSAnalysis,
  type BackendATSAnalysis,
  type ContactInfo,
  type Education,
  type Experience,
  type Resume,
  type ResumeData,
  type SkillEntry,
  type Template,
  type TemplateId,
  type UserSkill,
} from "./resumeBuilderData";

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
  const openExperienceModal = () => {
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
  };

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
  const openEducationModal = () => {
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
  };

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
        toast.warning("No resume added", "Add a resume in Resume Match first");
        return;
      }

      // Get skills from resume
      const userSkills = await safeInvoke<UserSkill[]>("get_user_skills", {
        resumeId: activeResume.id,
      }, {
        logContext: "Get user skills for import"
      });

      if (userSkills.length === 0) {
        toast.info("No skills found", "Add and review a resume in Resume Match first");
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
          {currentStep === 1 && (
            <ContactStep contact={contact} setContact={setContact} />
          )}

          {currentStep === 2 && (
            <SummaryStep summary={summary} setSummary={setSummary} />
          )}

          {currentStep === 3 && (
            <ExperienceStep
              experiences={experiences}
              onAddClick={openExperienceModal}
              onDeleteClick={confirmDeleteExperience}
            />
          )}

          {currentStep === 4 && (
            <EducationStep
              educations={educations}
              onAddClick={openEducationModal}
              onDeleteClick={confirmDeleteEducation}
            />
          )}

          {currentStep === 5 && (
            <SkillsStep
              skills={skills}
              newSkill={newSkill}
              setNewSkill={setNewSkill}
              onAddSkill={handleAddSkill}
              onDeleteSkill={confirmDeleteSkill}
              onImportSkills={handleImportSkills}
              importingSkills={importingSkills}
            />
          )}

          {/* Step 6: Preview & Template Selection */}
          {currentStep === 6 && (
            <ResumeBuilderPreviewStep
              templates={templates}
              selectedTemplate={selectedTemplate}
              previewHtml={previewHtml}
              atsAnalysis={atsAnalysis}
              onSelectTemplate={setSelectedTemplate}
            />
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
