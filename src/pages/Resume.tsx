import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button, Card, Badge, ScoreDisplay, Modal, ModalFooter, ResumeSkeleton } from "../components";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";

// Proficiency color lookup (better performance than switch)
type BadgeVariant = "sentinel" | "alert" | "surface" | "success" | "danger";

const PROFICIENCY_COLORS: Record<string, BadgeVariant> = {
  expert: "sentinel",
  advanced: "alert",
  intermediate: "surface",
};

const getProficiencyColor = (proficiency: string | null): BadgeVariant =>
  PROFICIENCY_COLORS[proficiency?.toLowerCase() ?? ""] ?? "surface";

// Backend types (matching Rust types)
interface ResumeData {
  id: number;
  name: string;
  file_path: string;
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

interface SkillUpdate {
  skill_name?: string;
  skill_category?: string;
  proficiency_level?: string;
  years_experience?: number;
}

interface NewSkill {
  skill_name: string;
  skill_category?: string;
  proficiency_level?: string;
  years_experience?: number;
}

interface MatchResult {
  id: number;
  resume_id: number;
  job_hash: string;
  job_title: string;
  company: string;
  overall_match_score: number;
  skills_match_score: number | null;
  experience_match_score: number | null;
  education_match_score: number | null;
  matching_skills: string[];
  missing_skills: string[];
  gap_analysis: string | null;
  created_at: string;
}

const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const SKILL_CATEGORIES = [
  "Programming Languages",
  "Frameworks",
  "Cloud & DevOps",
  "Databases",
  "Tools",
  "Soft Skills",
  "Other",
];

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
    proficiency_level: "Intermediate",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [resumeData, resumesData] = await Promise.all([
          invoke<ResumeData | null>("get_active_resume"),
          invoke<ResumeData[]>("list_all_resumes"),
        ]);

        if (cancelled) return;

        setResume(resumeData);
        setAllResumes(resumesData);

        if (resumeData) {
          const [skillsData, matchesData] = await Promise.all([
            invoke<UserSkill[]>("get_user_skills", { resumeId: resumeData.id }),
            invoke<MatchResult[]>("get_recent_matches", { resumeId: resumeData.id, limit: 10 }),
          ]);

          if (cancelled) return;

          setSkills(skillsData);
          setRecentMatches(matchesData);
        }
      } catch (err) {
        if (cancelled) return;
        logError("Failed to fetch resume data:", err);
        toast.error("Failed to load resume", getErrorMessage(err));
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
      const [resumeData, resumesData] = await Promise.all([
        invoke<ResumeData | null>("get_active_resume"),
        invoke<ResumeData[]>("list_all_resumes"),
      ]);
      setResume(resumeData);
      setAllResumes(resumesData);

      if (resumeData) {
        const [skillsData, matchesData] = await Promise.all([
          invoke<UserSkill[]>("get_user_skills", { resumeId: resumeData.id }),
          invoke<MatchResult[]>("get_recent_matches", { resumeId: resumeData.id, limit: 10 }),
        ]);
        setSkills(skillsData);
        setRecentMatches(matchesData);
      }
    } catch (err) {
      logError("Failed to fetch resume data:", err);
      toast.error("Failed to load resume", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleUploadResume = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!selected) return;

      setUploading(true);
      const filePath = selected as string;
      const fileName = filePath.split("/").pop() || "Resume";

      await invoke("upload_resume", { name: fileName, filePath });
      toast.success("Resume uploaded", "Your resume has been parsed and analyzed");
      refetchData();
    } catch (err) {
      logError("Failed to upload resume:", err);
      toast.error("Upload failed", getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSetActiveResume = async (resumeId: number) => {
    try {
      await invoke("set_active_resume", { resumeId });
      toast.success("Resume activated", "Switched to selected resume");
      setShowResumeLibrary(false);
      refetchData();
    } catch (err) {
      logError("Failed to set active resume:", err);
      toast.error("Failed to switch resume", getErrorMessage(err));
    }
  };

  const handleDeleteResume = async (resumeId: number) => {
    try {
      await invoke("delete_resume", { resumeId });
      toast.success("Resume deleted", "Resume and associated data removed");
      refetchData();
    } catch (err) {
      logError("Failed to delete resume:", err);
      toast.error("Failed to delete resume", getErrorMessage(err));
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteResume = (r: ResumeData) => {
    setDeleteConfirm({ type: 'resume', id: r.id, name: r.name });
  };

  const handleUpdateSkill = async (skillId: number) => {
    try {
      await invoke("update_user_skill", { skillId, updates: editForm });
      toast.success("Skill updated", "Your skill has been updated");
      setEditingSkillId(null);
      setEditForm({});
      refetchData();
    } catch (err) {
      logError("Failed to update skill:", err);
      toast.error("Failed to update skill", getErrorMessage(err));
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    try {
      await invoke("delete_user_skill", { skillId });
      toast.success("Skill deleted", "Skill removed from your resume");
      refetchData();
    } catch (err) {
      logError("Failed to delete skill:", err);
      toast.error("Failed to delete skill", getErrorMessage(err));
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteSkill = (skill: UserSkill) => {
    setDeleteConfirm({ type: 'skill', id: skill.id, name: skill.skill_name });
  };

  const handleAddSkill = async () => {
    if (!resume || !newSkillForm.skill_name.trim()) {
      toast.error("Invalid skill", "Please enter a skill name");
      return;
    }

    try {
      await invoke("add_user_skill", {
        resumeId: resume.id,
        skill: newSkillForm,
      });
      toast.success("Skill added", `Added "${newSkillForm.skill_name}" to your skills`);
      setShowAddSkill(false);
      setNewSkillForm({ skill_name: "", proficiency_level: "Intermediate" });
      refetchData();
    } catch (err) {
      logError("Failed to add skill:", err);
      toast.error("Failed to add skill", getErrorMessage(err));
    }
  };

  const startEditingSkill = (skill: UserSkill) => {
    setEditingSkillId(skill.id);
    setEditForm({
      skill_name: skill.skill_name,
      skill_category: skill.skill_category || undefined,
      proficiency_level: skill.proficiency_level || "Intermediate",
      years_experience: skill.years_experience || undefined,
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
                  Resume Matcher
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  AI-powered resume analysis and job matching
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
              <Button onClick={handleUploadResume} loading={uploading} loadingText="Uploading...">
                {resume ? "Upload New" : "Upload Resume"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Resume Library Dropdown */}
      {showResumeLibrary && allResumes.length > 0 && (
        <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">
              Resume Library
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allResumes.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-lg border ${
                    r.is_active
                      ? "border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/20"
                      : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                  } cursor-pointer transition-colors`}
                  onClick={() => !r.is_active && handleSetActiveResume(r.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DocumentIcon className="w-5 h-5 text-surface-500" />
                      <div>
                        <p className="font-medium text-surface-800 dark:text-surface-200 text-sm">
                          {r.name}
                        </p>
                        <p className="text-xs text-surface-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.is_active && (
                        <Badge variant="sentinel" size="sm">
                          Active
                        </Badge>
                      )}
                      {!r.is_active && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteResume(r);
                          }}
                          className="p-1 text-surface-400 hover:text-red-500 transition-colors"
                          title="Delete resume"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6">
        {!resume ? (
          <Card className="text-center py-12 dark:bg-surface-800">
            <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentIcon className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="font-display text-display-md text-surface-700 dark:text-surface-300 mb-2">
              No Resume Uploaded
            </h3>
            <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
              Upload your resume to enable AI-powered job matching. We'll extract your skills
              and match them against job requirements.
            </p>
            <Button onClick={handleUploadResume} loading={uploading} loadingText="Uploading...">
              Upload Resume (PDF)
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resume Info */}
            <Card className="lg:col-span-1 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Active Resume
              </h2>
              <div className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-700 rounded-lg mb-4">
                <div className="w-12 h-12 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                  <DocumentIcon className="w-6 h-6 text-sentinel-600 dark:text-sentinel-400" />
                </div>
                <div>
                  <p className="font-medium text-surface-800 dark:text-surface-200">{resume.name}</p>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Uploaded: {new Date(resume.created_at).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Skills Extracted ({skills.length})
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
                    <Badge key={skill.id} variant={getProficiencyColor(skill.proficiency_level)}>
                      {skill.skill_name}
                      {skill.years_experience && ` • ${skill.years_experience}y`}
                      <span className="ml-1 text-xs opacity-70">
                        ({Math.round(skill.confidence_score * 100)}%)
                      </span>
                    </Badge>
                  ))}
                  {skills.length > 15 && (
                    <Badge variant="surface">+{skills.length - 15} more</Badge>
                  )}
                </div>
                {/* Proficiency Distribution Chart */}
                <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                  <h4 className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
                    Proficiency Distribution
                  </h4>
                  <div className="space-y-2">
                    {PROFICIENCY_LEVELS.map((level) => {
                      const count = skills.filter(
                        (s) => s.proficiency_level?.toLowerCase() === level.toLowerCase()
                      ).length;
                      const percentage = skills.length > 0 ? (count / skills.length) * 100 : 0;
                      return (
                        <div key={level} className="flex items-center gap-2">
                          <span className="text-xs text-surface-600 dark:text-surface-400 w-20">
                            {level}
                          </span>
                          <div className="flex-1 h-5 bg-surface-100 dark:bg-surface-700 rounded overflow-hidden">
                            <div
                              className={`h-full ${
                                level === "Expert"
                                  ? "bg-sentinel-500"
                                  : level === "Advanced"
                                  ? "bg-alert-500"
                                  : level === "Intermediate"
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

            {/* Skills Management */}
            <Card className="lg:col-span-2 dark:bg-surface-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-display-sm text-surface-900 dark:text-white">
                  Skills Management
                </h2>
                <div className="flex items-center gap-3">
                  <select
                    value={categoryFilter || ""}
                    onChange={(e) => setCategoryFilter(e.target.value || null)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus:ring-2 focus:ring-sentinel-500"
                  >
                    <option value="">All Categories</option>
                    {SKILL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Edit, delete, or add skills
                  </p>
                </div>
              </div>

              {/* Add Skill Form */}
              {showAddSkill && (
                <div className="mb-6 p-4 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg border border-sentinel-200 dark:border-sentinel-800">
                  <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">
                    Add New Skill
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Skill name (e.g., Python, React)"
                      value={newSkillForm.skill_name}
                      onChange={(e) =>
                        setNewSkillForm({ ...newSkillForm, skill_name: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus:ring-2 focus:ring-sentinel-500"
                    />
                    <select
                      value={newSkillForm.proficiency_level || "Intermediate"}
                      onChange={(e) =>
                        setNewSkillForm({ ...newSkillForm, proficiency_level: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus:ring-2 focus:ring-sentinel-500"
                    >
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newSkillForm.skill_category || ""}
                      onChange={(e) =>
                        setNewSkillForm({
                          ...newSkillForm,
                          skill_category: e.target.value || undefined,
                        })
                      }
                      className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus:ring-2 focus:ring-sentinel-500"
                    >
                      <option value="">Select category (optional)</option>
                      {SKILL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Years of experience (optional)"
                      min="0"
                      max="50"
                      value={newSkillForm.years_experience || ""}
                      onChange={(e) =>
                        setNewSkillForm({
                          ...newSkillForm,
                          years_experience: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus:ring-2 focus:ring-sentinel-500"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={handleAddSkill}>Add Skill</Button>
                    <Button variant="ghost" onClick={() => setShowAddSkill(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {skills.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="font-medium text-surface-700 dark:text-surface-300 mb-1">
                    No skills extracted yet
                  </p>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                    Upload a resume to extract skills automatically, or add them manually
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        // Scroll to upload section
                        const uploadSection = document.querySelector('[data-section="upload"]');
                        uploadSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Upload Resume
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSkillId(-1);
                        setNewSkillForm({ skill_name: '', proficiency_level: 'Intermediate' });
                      }}
                    >
                      Add Skill
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {skills
                    .filter((skill) => !categoryFilter || skill.skill_category === categoryFilter)
                    .map((skill) => (
                    <div
                      key={skill.id}
                      className={`p-3 rounded-lg border ${
                        editingSkillId === skill.id
                          ? "border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/20"
                          : "border-surface-200 dark:border-surface-700"
                      } transition-colors`}
                    >
                      {editingSkillId === skill.id ? (
                        /* Edit Mode */
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <input
                              type="text"
                              value={editForm.skill_name || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, skill_name: e.target.value })
                              }
                              className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                              placeholder="Skill name"
                            />
                            <select
                              value={editForm.proficiency_level || "Intermediate"}
                              onChange={(e) =>
                                setEditForm({ ...editForm, proficiency_level: e.target.value })
                              }
                              className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                            >
                              {PROFICIENCY_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editForm.skill_category || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  skill_category: e.target.value || undefined,
                                })
                              }
                              className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                            >
                              <option value="">No category</option>
                              {SKILL_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={editForm.years_experience || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  years_experience: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              min="0"
                              max="50"
                              placeholder="Years"
                              className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateSkill(skill.id)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingSkillId(null);
                                setEditForm({});
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-surface-800 dark:text-surface-200">
                                {skill.skill_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant={getProficiencyColor(skill.proficiency_level)}
                                  size="sm"
                                >
                                  {skill.proficiency_level || "Unknown"}
                                </Badge>
                                {skill.years_experience && (
                                  <span className="text-xs text-surface-500">
                                    {skill.years_experience} years
                                  </span>
                                )}
                                {skill.skill_category && (
                                  <span className="text-xs text-surface-400">
                                    {skill.skill_category}
                                  </span>
                                )}
                                {skill.source === "manual" && (
                                  <Badge variant="surface" size="sm">
                                    Manual
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditingSkill(skill)}
                              className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                              title="Edit skill"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteSkill(skill)}
                              className="p-1.5 text-surface-400 hover:text-red-500 transition-colors"
                              title="Delete skill"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Matches */}
            <Card className="lg:col-span-3 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Recent Match Results
              </h2>

              {recentMatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-surface-500 dark:text-surface-400 mb-2">
                    No job matches yet
                  </p>
                  <p className="text-sm text-surface-400 dark:text-surface-500">
                    Match results will appear here when you view job details from the dashboard
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentMatches.map((match) => (
                    <div
                      key={match.job_hash}
                      className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-surface-300 dark:hover:border-surface-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-surface-800 dark:text-surface-200">
                            {match.job_title}
                          </h3>
                          <p className="text-sm text-surface-500 dark:text-surface-400">
                            {match.company}
                          </p>
                        </div>
                        <ScoreDisplay score={match.overall_match_score} size="sm" />
                      </div>

                      {/* Score Breakdown */}
                      {(match.skills_match_score !== null ||
                        match.experience_match_score !== null ||
                        match.education_match_score !== null) && (
                        <div className="mb-4 p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                          <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
                            Score Breakdown
                          </p>
                          <div className="space-y-2">
                            {match.skills_match_score !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-surface-600 dark:text-surface-400 w-24">
                                  Skills (50%)
                                </span>
                                <div className="flex-1 h-4 bg-surface-200 dark:bg-surface-800 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-sentinel-500"
                                    style={{ width: `${match.skills_match_score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-surface-700 dark:text-surface-300 w-12 text-right">
                                  {Math.round(match.skills_match_score)}%
                                </span>
                              </div>
                            )}
                            {match.experience_match_score !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-surface-600 dark:text-surface-400 w-24">
                                  Experience (30%)
                                </span>
                                <div className="flex-1 h-4 bg-surface-200 dark:bg-surface-800 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-alert-500"
                                    style={{ width: `${match.experience_match_score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-surface-700 dark:text-surface-300 w-12 text-right">
                                  {Math.round(match.experience_match_score)}%
                                </span>
                              </div>
                            )}
                            {match.education_match_score !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-surface-600 dark:text-surface-400 w-24">
                                  Education (20%)
                                </span>
                                <div className="flex-1 h-4 bg-surface-200 dark:bg-surface-800 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${match.education_match_score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-surface-700 dark:text-surface-300 w-12 text-right">
                                  {Math.round(match.education_match_score)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                            <CheckIcon className="w-3.5 h-3.5" />
                            Matched Skills ({match.matching_skills.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matching_skills.length > 0 ? (
                              match.matching_skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800"
                                >
                                  <CheckIcon className="w-3 h-3" />
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-surface-400 dark:text-surface-500 italic">
                                No matching skills found
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                            <XIcon className="w-3.5 h-3.5" />
                            Missing Skills ({match.missing_skills.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.missing_skills.length > 0 ? (
                              match.missing_skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800"
                                >
                                  <XIcon className="w-3 h-3" />
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                You have all required skills!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {match.gap_analysis && (
                        <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                          <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
                            Gap Analysis
                          </p>
                          <ul className="space-y-1">
                            {match.gap_analysis.split("\n").map((line, idx) => {
                              const trimmed = line.trim();
                              if (!trimmed) return null;
                              const isMatch = trimmed.startsWith("✓");
                              const isMissing = trimmed.startsWith("✗");
                              const text = trimmed.replace(/^[✓✗]\s*/, "");
                              return (
                                <li
                                  key={idx}
                                  className={`text-sm flex items-start gap-2 ${
                                    isMatch
                                      ? "text-green-600 dark:text-green-400"
                                      : isMissing
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-surface-500 dark:text-surface-400"
                                  }`}
                                >
                                  {isMatch && <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                  {isMissing && <XIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                  <span>{text}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

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

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function DocumentIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}
