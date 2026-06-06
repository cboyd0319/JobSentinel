import { useEffect, useState, useCallback } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { ResumeSkeleton } from "../components/Skeleton";
import { useToast } from "../contexts";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import { getSafeErrorToastCopy } from "../utils/safeErrorCopy";
import {
  DEFAULT_SKILL_STRENGTH,
  SKILL_STRENGTH_OPTIONS,
  getReadableTextBadgeVariant,
  getReadableTextDescription,
  getReadableTextLabel,
  getResumeFormatLabel,
  getSkillSourceLabel,
  getSkillStrengthColor,
  getSkillStrengthLabel,
  isResumeMatchingEnabled,
  optionalTrimmedText,
  optionalYearsValue,
  type MatchResult,
  type NewSkill,
  type ResumeData,
  type ResumeMatchingPreference,
  type ResumeTextPreview,
  type SkillUpdate,
  type UserSkill,
} from "./resumePageModel";
import {
  BackIcon,
  DocumentIcon,
  FolderIcon,
  PlusIcon,
} from "./ResumeIcons";
import { ResumeLibraryDropdown } from "./ResumeLibraryDropdown";
import { ResumeEmptyState } from "./ResumeEmptyState";
import { ResumeRecentMatches } from "./ResumeRecentMatches";
import { ResumeTextPreviewModal } from "./ResumeTextPreviewModal";
import { ResumeSkillsManagementCard } from "./ResumeSkillsManagementCard";

interface ResumeProps {
  onBack: () => void;
}

export default function Resume({ onBack }: ResumeProps) {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [allResumes, setAllResumes] = useState<ResumeData[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showResumeLibrary, setShowResumeLibrary] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [textPreview, setTextPreview] = useState<ResumeTextPreview | null>(null);
  const [textPreviewLoading, setTextPreviewLoading] = useState(false);
  const [resumeMatchingEnabled, setResumeMatchingEnabled] = useState(false);
  const [resumeMatchingLoading, setResumeMatchingLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'resume' | 'skill';
    id: number;
    name: string;
  } | null>(null);
  const toast = useToast();

  // Form state for editing/adding skills
  const [editForm, setEditForm] = useState<SkillUpdate>({});
  const [newSkillForm, setNewSkillForm] = useState<NewSkill>({
    skill_name: "",
    proficiency_level: DEFAULT_SKILL_STRENGTH,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [resumeData, resumesData, preferenceData] = await Promise.all([
          safeInvoke<ResumeData | null>("get_active_resume", {}, { logContext: "Load active resume" }),
          safeInvoke<ResumeData[]>("list_all_resumes", {}, { logContext: "List all resumes" }),
          safeInvoke<ResumeMatchingPreference | null>(
            "get_resume_matching_preference",
            {},
            { logContext: "Load resume sorting preference" },
          ),
        ]);

        if (cancelled) return;

        setResume(resumeData);
        setAllResumes(resumesData);
        setResumeMatchingEnabled(isResumeMatchingEnabled(preferenceData));

        if (resumeData) {
          const [skillsData, matchesData] = await Promise.all([
            safeInvoke<UserSkill[]>("get_user_skills", { resumeId: resumeData.id }, { logContext: "Load user skills" }),
            safeInvoke<MatchResult[]>("get_recent_matches", { resumeId: resumeData.id, limit: 10 }, { logContext: "Load recent matches" }),
          ]);

          if (cancelled) return;

          setSkills(skillsData);
          setRecentMatches(matchesData);
        } else {
          setSkills([]);
          setRecentMatches([]);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const safeError = getSafeErrorToastCopy(error, {
          fallbackTitle: "Could not load resume",
        });
        toast.error(safeError.title, safeError.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Refetch data after operations
  const refetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resumeData, resumesData, preferenceData] = await Promise.all([
        safeInvoke<ResumeData | null>("get_active_resume", {}, { logContext: "Refetch active resume" }),
        safeInvoke<ResumeData[]>("list_all_resumes", {}, { logContext: "Refetch all resumes" }),
        safeInvoke<ResumeMatchingPreference | null>(
          "get_resume_matching_preference",
          {},
          { logContext: "Refetch resume sorting preference" },
        ),
      ]);
      setResume(resumeData);
      setAllResumes(resumesData);
      setResumeMatchingEnabled(isResumeMatchingEnabled(preferenceData));

      if (resumeData) {
        const [skillsData, matchesData] = await Promise.all([
          safeInvoke<UserSkill[]>("get_user_skills", { resumeId: resumeData.id }, { logContext: "Refetch user skills" }),
          safeInvoke<MatchResult[]>("get_recent_matches", { resumeId: resumeData.id, limit: 10 }, { logContext: "Refetch recent matches" }),
        ]);
        setSkills(skillsData);
        setRecentMatches(matchesData);
      } else {
        setSkills([]);
        setRecentMatches([]);
      }
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not load resume",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleUploadResume = async () => {
    try {
      setUploading(true);
      const resumeId = await safeInvokeWithToast<number | null>("select_and_upload_resume", undefined, toast, {
        logContext: "Add resume"
      });
      if (!resumeId) return;
      toast.success("Resume added", "Your resume is ready for local review.");
      refetchData();
    } catch {
      // Error already logged and shown to user
    } finally {
      setUploading(false);
    }
  };

  const handleImportJsonResume = async () => {
    try {
      setUploading(true);
      const resumeId = await safeInvokeWithToast<number | null>("select_and_import_json_resume", undefined, toast, {
        logContext: "Import structured resume data"
      });
      if (!resumeId) return;
      toast.success("Resume imported", "Your resume is ready for local review.");
      refetchData();
    } catch {
      // Error already logged and shown to user
    } finally {
      setUploading(false);
    }
  };

  const handleSetActiveResume = async (resumeId: number) => {
    try {
      await safeInvokeWithToast("set_active_resume", { resumeId }, toast, {
        logContext: "Set active resume"
      });
      toast.success("Resume activated", "Switched to selected resume");
      setShowResumeLibrary(false);
      refetchData();
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleDeleteResume = async (resumeId: number) => {
    try {
      await safeInvokeWithToast("delete_resume", { resumeId }, toast, {
        logContext: "Delete resume"
      });
      toast.success("Resume deleted", "Resume and associated data removed");
      refetchData();
    } catch {
      // Error already logged and shown to user
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteResume = (r: ResumeData) => {
    setDeleteConfirm({ type: 'resume', id: r.id, name: r.name });
  };

  const handlePreviewResumeText = async () => {
    if (!resume) {
      return;
    }

    try {
      setTextPreviewLoading(true);
      const preview = await safeInvoke<ResumeTextPreview>(
        "get_resume_text_preview",
        { resumeId: resume.id },
        { logContext: "Preview resume text" },
      );
      setTextPreview(preview);
      setShowTextPreview(true);
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not show resume text",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setTextPreviewLoading(false);
    }
  };

  const handleCopyResumeText = async () => {
    if (!textPreview?.text_preview) {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      toast.error("Could not copy text", "Select the text and copy it manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textPreview.text_preview);
      toast.success("Text copied", "Readable resume text copied to your clipboard.");
    } catch {
      toast.error("Could not copy text", "Select the text and copy it manually.");
    }
  };

  const handleSetResumeMatching = async (enabled: boolean) => {
    if (enabled && (!resume || skills.length === 0)) {
      toast.error("Review skills first", "Add or review at least one skill before using it to sort jobs.");
      return;
    }

    try {
      setResumeMatchingLoading(true);
      const preference = await safeInvoke<ResumeMatchingPreference>(
        "set_resume_matching_enabled",
        { enabled },
        { logContext: enabled ? "Use resume skills for job sorting" : "Stop using resume skills for job sorting" },
      );
      setResumeMatchingEnabled(preference.enabled);
      if (preference.enabled) {
        toast.success(
          "Resume skills will help sort jobs",
          "JobSentinel will use these reviewed local skills in job sorting.",
        );
      } else {
        toast.success(
          "Resume skills paused",
          "JobSentinel will sort jobs from your saved titles, words, salary, location, and company preferences.",
        );
      }
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not update resume sorting",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setResumeMatchingLoading(false);
    }
  };

  const handleUpdateSkill = async (skillId: number) => {
    const skillName = editForm.skill_name?.trim() ?? "";
    if (!skillName) {
      toast.error("Name the skill", "Add a skill name, then save again.");
      return;
    }

    const updates: SkillUpdate = {
      skill_name: skillName,
      skill_category: optionalTrimmedText(editForm.skill_category),
      proficiency_level: optionalTrimmedText(editForm.proficiency_level),
      years_experience: optionalYearsValue(editForm.years_experience),
    };

    try {
      await safeInvokeWithToast("update_user_skill", { skillId, updates }, toast, {
        logContext: "Update user skill"
      });
      toast.success("Skill updated", "Your skill has been updated");
      setEditingSkillId(null);
      setEditForm({});
      refetchData();
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    try {
      await safeInvokeWithToast("delete_user_skill", { skillId }, toast, {
        logContext: "Delete user skill"
      });
      toast.success("Skill deleted", "Skill removed from your resume");
      refetchData();
    } catch {
      // Error already logged and shown to user
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteSkill = (skill: UserSkill) => {
    setDeleteConfirm({ type: 'skill', id: skill.id, name: skill.skill_name });
  };

  const handleAddSkill = async () => {
    const skillName = newSkillForm.skill_name.trim();
    if (!resume || !skillName) {
      toast.error("Name the skill", "Add a skill name, then save again.");
      return;
    }

    try {
      await safeInvokeWithToast("add_user_skill", {
        resumeId: resume.id,
        skill: {
          ...newSkillForm,
          skill_name: skillName,
          skill_category: optionalTrimmedText(newSkillForm.skill_category) ?? undefined,
          proficiency_level: optionalTrimmedText(newSkillForm.proficiency_level) ?? undefined,
          years_experience: optionalYearsValue(newSkillForm.years_experience) ?? undefined,
        },
      }, toast, {
        logContext: "Add user skill"
      });
      toast.success("Skill added", `Added "${skillName}" to your skills`);
      setShowAddSkill(false);
      setNewSkillForm({ skill_name: "", proficiency_level: DEFAULT_SKILL_STRENGTH });
      refetchData();
    } catch {
      // Error already logged and shown to user
    }
  };

  const startEditingSkill = (skill: UserSkill) => {
    setEditingSkillId(skill.id);
    setEditForm({
      skill_name: skill.skill_name,
      skill_category: skill.skill_category || undefined,
      proficiency_level: skill.proficiency_level
        ? getSkillStrengthLabel(skill.proficiency_level)
        : DEFAULT_SKILL_STRENGTH,
      years_experience: skill.years_experience ?? undefined,
    });
  };


  if (loading) {
    return <ResumeSkeleton />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                aria-label="Go back"
              >
                <BackIcon />
              </button>
              <div>
                <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                  Resume Match
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Local resume review and job fit evidence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {allResumes.length > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => setShowResumeLibrary(!showResumeLibrary)}
                >
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Library ({allResumes.length})
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleImportJsonResume}
                loading={uploading}
                loadingText="Importing..."
                title="Use a file exported from JobSentinel or another resume app"
              >
                Import from resume app
              </Button>
              <Button onClick={handleUploadResume} loading={uploading} loadingText="Adding...">
                {resume ? "Add New" : "Add Resume"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {showResumeLibrary && (
        <ResumeLibraryDropdown
          resumes={allResumes}
          onActivateResume={handleSetActiveResume}
          onDeleteResume={confirmDeleteResume}
        />
      )}

      <main className="max-w-7xl mx-auto p-6">
        {!resume ? (
          <ResumeEmptyState
            uploading={uploading}
            onImportJsonResume={handleImportJsonResume}
            onUploadResume={handleUploadResume}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resume Info */}
            <Card className="lg:col-span-1 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Active Resume
              </h2>
              <div className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-700 rounded-lg mb-4">
                <div className="w-12 h-12 shrink-0 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                  <DocumentIcon className="w-6 h-6 text-sentinel-600 dark:text-sentinel-400" />
                </div>
                <div className="min-w-0">
                  <p className="break-words [overflow-wrap:anywhere] font-medium text-surface-800 dark:text-surface-200">
                    {resume.name}
                  </p>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Added: {new Date(resume.created_at).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>
              <div
                data-testid="resume-import-status"
                className="mb-4 border-l-2 border-surface-200 dark:border-surface-700 pl-3 py-1"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="surface" size="sm">
                    {getResumeFormatLabel(resume)}
                  </Badge>
                  <Badge variant={getReadableTextBadgeVariant(resume)} size="sm">
                    {getReadableTextLabel(resume)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                  {getReadableTextDescription(resume)}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full mb-4"
                onClick={handlePreviewResumeText}
                loading={textPreviewLoading}
                loadingText="Reading..."
              >
                See what JobSentinel read
              </Button>

              <div className="mb-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      Resume Skills Sorting
                    </h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Use reviewed local skills as one signal when sorting jobs.
                    </p>
                  </div>
                  {resumeMatchingEnabled && (
                    <Badge variant="success" size="sm">
                      On
                    </Badge>
                  )}
                </div>
                {resumeMatchingEnabled ? (
                  <div className="space-y-3">
                    <p className="text-sm text-surface-600 dark:text-surface-300">
                      Resume skills are helping sort jobs.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSetResumeMatching(false)}
                      loading={resumeMatchingLoading}
                      loadingText="Saving..."
                    >
                      Stop using resume skills
                    </Button>
                  </div>
                ) : skills.length > 0 ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleSetResumeMatching(true)}
                    loading={resumeMatchingLoading}
                    loadingText="Saving..."
                  >
                    Use these skills to sort jobs
                  </Button>
                ) : (
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Review or add skills before using them to sort jobs.
                  </p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Saved Skills ({skills.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddSkill(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.slice(0, 15).map((skill) => (
                    <Badge key={skill.id} variant={getSkillStrengthColor(skill.proficiency_level)}>
                      {skill.skill_name}
                      {skill.years_experience && ` • ${skill.years_experience}y`}
                      <span className="ml-1 text-xs opacity-70">
                        {getSkillSourceLabel(skill.source)}
                      </span>
                    </Badge>
                  ))}
                  {skills.length > 15 && (
                    <Badge variant="surface">+{skills.length - 15} more</Badge>
                  )}
                </div>
                {/* Skill strength mix */}
                <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                  <h4 className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
                    Skill Strength Mix
                  </h4>
                  <div className="space-y-2">
                    {SKILL_STRENGTH_OPTIONS.map((option) => {
                      const count = skills.filter(
                        (s) => getSkillStrengthLabel(s.proficiency_level) === option.label
                      ).length;
                      const percentage = skills.length > 0 ? (count / skills.length) * 100 : 0;
                      return (
                        <div key={option.value} className="flex items-center gap-2">
                          <span className="text-xs text-surface-600 dark:text-surface-400 w-20">
                            {option.label}
                          </span>
                          <div className="flex-1 h-5 bg-surface-100 dark:bg-surface-700 rounded overflow-hidden">
                            <div
                              className={`h-full ${
                                option.value === "Can train others"
                                  ? "bg-sentinel-500"
                                  : option.value === "Regular use"
                                    ? "bg-alert-500"
                                    : option.value === "Some practice"
                                      ? "bg-blue-500"
                                      : "bg-surface-400"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-surface-500 dark:text-surface-400 w-12 text-right">
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <ResumeSkillsManagementCard
              skills={skills}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              showAddSkill={showAddSkill}
              setShowAddSkill={setShowAddSkill}
              newSkillForm={newSkillForm}
              setNewSkillForm={setNewSkillForm}
              editForm={editForm}
              setEditForm={setEditForm}
              editingSkillId={editingSkillId}
              setEditingSkillId={setEditingSkillId}
              onAddSkill={handleAddSkill}
              onUpdateSkill={handleUpdateSkill}
              onStartEditingSkill={startEditingSkill}
              onConfirmDeleteSkill={confirmDeleteSkill}
            />

            <ResumeRecentMatches matches={recentMatches} />
          </div>
        )}
      </main>

      <ResumeTextPreviewModal
        isOpen={showTextPreview}
        resume={resume}
        textPreview={textPreview}
        onClose={() => setShowTextPreview(false)}
        onCopyText={handleCopyResumeText}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.type === 'resume' ? 'Resume' : 'Skill'}?`}
      >
        <p className="text-surface-600 dark:text-surface-400 mb-4">
          Are you sure you want to delete <span className="font-medium text-surface-800 dark:text-surface-200">{deleteConfirm?.name}</span>?
          {deleteConfirm?.type === 'resume' && (
            <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
              This will also remove all associated skills and match data.
            </span>
          )}
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!deleteConfirm) return;
              if (deleteConfirm.type === 'resume') {
                handleDeleteResume(deleteConfirm.id);
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
