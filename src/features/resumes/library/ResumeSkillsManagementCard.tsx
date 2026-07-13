import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { Card } from "../../../ui/Card";
import {
  DEFAULT_SKILL_STRENGTH,
  SKILL_CATEGORIES,
  SKILL_STRENGTH_OPTIONS,
  getSkillSourceLabel,
  getSkillStrengthColor,
  getSkillStrengthLabel,
  type NewSkill,
  type SkillUpdate,
  type UserSkill,
} from "./resumePageModel";
import { EditIcon, TrashIcon } from "./ResumeIcons";

interface ResumeSkillsManagementCardProps {
  skills: UserSkill[];
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  showAddSkill: boolean;
  setShowAddSkill: (show: boolean) => void;
  newSkillForm: NewSkill;
  setNewSkillForm: Dispatch<SetStateAction<NewSkill>>;
  editForm: SkillUpdate;
  setEditForm: Dispatch<SetStateAction<SkillUpdate>>;
  editingSkillId: number | null;
  setEditingSkillId: (skillId: number | null) => void;
  onAddSkill: () => void;
  onUpdateSkill: (skillId: number) => void;
  onStartEditingSkill: (skill: UserSkill) => void;
  onConfirmDeleteSkill: (skill: UserSkill) => void;
}

export function ResumeSkillsManagementCard({
  skills,
  categoryFilter,
  setCategoryFilter,
  showAddSkill,
  setShowAddSkill,
  newSkillForm,
  setNewSkillForm,
  editForm,
  setEditForm,
  editingSkillId,
  setEditingSkillId,
  onAddSkill,
  onUpdateSkill,
  onStartEditingSkill,
  onConfirmDeleteSkill,
}: ResumeSkillsManagementCardProps) {
  return (
    <Card className="lg:col-span-2 dark:bg-surface-800">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-display-sm text-surface-900 dark:text-white">
          Skills Management
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <select
            aria-label="Filter skills by category"
            value={categoryFilter || ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus-visible:ring-2 focus-visible:ring-sentinel-500 sm:w-56"
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

      {showAddSkill && (
        <div className="mb-6 p-4 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg border border-sentinel-200 dark:border-sentinel-800">
          <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">
            Add New Skill
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="skill-name" className="sr-only">
                Skill name
              </label>
              <input
                id="skill-name"
                type="text"
                placeholder="Skill name (e.g., Project Management, Customer Support)"
                value={newSkillForm.skill_name}
                onChange={(e) =>
                  setNewSkillForm({ ...newSkillForm, skill_name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus-visible:ring-2 focus-visible:ring-sentinel-500"
              />
            </div>
            <div>
              <label htmlFor="proficiency-level" className="sr-only">
                Skill strength
              </label>
              <select
                id="proficiency-level"
                value={newSkillForm.proficiency_level || DEFAULT_SKILL_STRENGTH}
                onChange={(e) =>
                  setNewSkillForm({ ...newSkillForm, proficiency_level: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus-visible:ring-2 focus-visible:ring-sentinel-500"
              >
                {SKILL_STRENGTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="skill-category" className="sr-only">
                Skill category
              </label>
              <select
                id="skill-category"
                value={newSkillForm.skill_category || ""}
                onChange={(e) =>
                  setNewSkillForm({
                    ...newSkillForm,
                    skill_category: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus-visible:ring-2 focus-visible:ring-sentinel-500"
              >
                <option value="">Select category (optional)</option>
                {SKILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="years-experience" className="sr-only">
                Years of experience
              </label>
              <input
                id="years-experience"
                type="number"
                placeholder="Years of experience (optional)"
                min="0"
                max="50"
                value={newSkillForm.years_experience ?? ""}
                onChange={(e) =>
                  setNewSkillForm({
                    ...newSkillForm,
                    years_experience: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 focus-visible:ring-2 focus-visible:ring-sentinel-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={onAddSkill}>Add Skill</Button>
            <Button variant="ghost" onClick={() => setShowAddSkill(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {skills.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-surface-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <p className="font-medium text-surface-700 dark:text-surface-300 mb-1">
            No skills saved yet
          </p>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
            JobSentinel can suggest skills from a resume, or you can add them yourself.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const uploadSection = document.querySelector('[data-section="upload"]');
                uploadSection?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Add Resume
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setNewSkillForm({
                  skill_name: "",
                  proficiency_level: DEFAULT_SKILL_STRENGTH,
                });
                setShowAddSkill(true);
              }}
            >
              Add Skill
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <input
                        aria-label={`Skill name for ${skill.skill_name}`}
                        type="text"
                        value={editForm.skill_name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, skill_name: e.target.value })
                        }
                        className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                        placeholder="Skill name"
                      />
                      <select
                        aria-label={`Skill strength for ${skill.skill_name}`}
                        value={editForm.proficiency_level || DEFAULT_SKILL_STRENGTH}
                        onChange={(e) =>
                          setEditForm({ ...editForm, proficiency_level: e.target.value })
                        }
                        className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                      >
                        {SKILL_STRENGTH_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`Skill category for ${skill.skill_name}`}
                        value={editForm.skill_category || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            skill_category: e.target.value || null,
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
                        aria-label={`Years of experience for ${skill.skill_name}`}
                        type="number"
                        value={editForm.years_experience ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            years_experience: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        min="0"
                        max="50"
                        placeholder="Years"
                        className="px-2 py-1.5 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onUpdateSkill(skill.id)}>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="min-w-0">
                        <p className="break-words font-medium text-surface-800 dark:text-surface-200">
                          {skill.skill_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <Badge
                            variant={getSkillStrengthColor(skill.proficiency_level)}
                            size="sm"
                          >
                            {getSkillStrengthLabel(skill.proficiency_level)}
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
                          <Badge variant="surface" size="sm">
                            {getSkillSourceLabel(skill.source)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => onStartEditingSkill(skill)}
                        className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                        title="Edit skill"
                        aria-label={`Edit skill: ${skill.skill_name}`}
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onConfirmDeleteSkill(skill)}
                        className="p-1.5 text-surface-400 hover:text-red-500 transition-colors"
                        title="Delete skill"
                        aria-label={`Delete skill: ${skill.skill_name}`}
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
  );
}
