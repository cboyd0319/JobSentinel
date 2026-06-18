import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Modal, ModalFooter } from "../components/Modal";
import { AtsLiveScorePanel } from "../components/AtsLiveScorePanel";
import ContactStep from "../components/resume-builder/steps/ContactStep";
import EducationStep from "../components/resume-builder/steps/EducationStep";
import ExperienceStep from "../components/resume-builder/steps/ExperienceStep";
import SkillsStep from "../components/resume-builder/steps/SkillsStep";
import SummaryStep from "../components/resume-builder/steps/SummaryStep";
import { useToast } from "../hooks/useToast";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import { getSafeErrorToastCopy } from "../utils/safeErrorCopy";
import { hasStoredResumeJobContext } from "../utils/resumeJobContext";
import {
  canProceedResumeBuilderStep,
  getResumeBuilderStepValidationMessage,
} from "./resumeBuilderValidation";
import {
  downloadResumeDocx,
  downloadResumeJson,
  openResumePrintDialog,
} from "./resumeBuilderExportDom";
import { ResumeBuilderExportStep } from "./ResumeBuilderExportStep";
import { ResumeBuilderJobContextCard } from "./ResumeBuilderJobContextCard";
import { ResumeBuilderNavigation } from "./ResumeBuilderNavigation";
import { ResumeBuilderPreviewStep } from "./ResumeBuilderPreviewStep";
import { ResumeBuilderProgress } from "./ResumeBuilderProgress";
import { ResumeBuilderEducationModal } from "./ResumeBuilderEducationModal";
import { ResumeBuilderExperienceModal } from "./ResumeBuilderExperienceModal";
import {
  STEPS,
  normalizeAtsAnalysis,
  toAtsResumeData,
  toExportResumeData,
  toExportTemplateId,
  toJsonResumeData,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("Modern");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [importingSkills, setImportingSkills] = useState(false);
  const [initializationError, setInitializationError] = useState(false);
  const initializedRef = useRef(false);
  const [hasJobContext] = useState(() => hasStoredResumeJobContext());

  const [contact, setContact] = useState<ContactInfo>({
    name: "",
    email: "",
    phone: null,
    linkedin: null,
    github: null,
    location: null,
    website: null,
  });

  const [summary, setSummary] = useState("");

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  const [educations, setEducations] = useState<Education[]>([]);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [showEducationModal, setShowEducationModal] = useState(false);

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
      setInitializationError(false);
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
      setInitializationError(true);
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

      downloadResumeDocx(docxData, contact.name);
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

  const handleExportJson = () => {
    if (!resumeData) return;

    try {
      setExporting(true);
      downloadResumeJson(toJsonResumeData(resumeData), contact.name);
      toast.success("Resume exported", "Downloaded as JSON Resume");
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

      openResumePrintDialog(html);

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

  if (initializationError && !resumeId) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center dark:bg-surface-800">
          <h1 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
            Resume Builder did not start
          </h1>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">
            Your resume was not changed. Try again, or copy a safe support report
            if this keeps happening.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={initializeResume} loading={loading}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
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

      <ResumeBuilderProgress currentStep={currentStep} />

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

          {currentStep === 7 && (
            <ResumeBuilderExportStep
              exporting={exporting}
              onExportDocx={handleExportDocx}
              onExportJson={handleExportJson}
              onExportPdf={handleExportPdf}
            />
          )}

          <ResumeBuilderNavigation
            currentStep={currentStep}
            exporting={exporting}
            saving={saving}
            onExport={handleExport}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
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

            <ResumeBuilderJobContextCard visible={hasJobContext} />
          </div>
        </div>
      </main>

      <ResumeBuilderExperienceModal
        experience={editingExperience}
        isOpen={showExperienceModal}
        onAdd={handleAddExperience}
        onChange={setEditingExperience}
        onClose={() => setShowExperienceModal(false)}
      />

      <ResumeBuilderEducationModal
        education={editingEducation}
        isOpen={showEducationModal}
        onAdd={handleAddEducation}
        onChange={setEditingEducation}
        onClose={() => setShowEducationModal(false)}
      />

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
