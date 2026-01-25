import { memo } from "react";
import { Button, CardHeader } from "../../index";

const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

interface SkillEntry {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
}

interface SkillsStepProps {
  skills: SkillEntry[];
  newSkill: SkillEntry;
  setNewSkill: (skill: SkillEntry) => void;
  onAddSkill: () => void;
  onDeleteSkill: (index: number, skillName: string) => void;
  onImportSkills: () => void;
  importingSkills: boolean;
}

const SkillsStep = memo(function SkillsStep({
  skills,
  newSkill,
  setNewSkill,
  onAddSkill,
  onDeleteSkill,
  onImportSkills,
  importingSkills,
}: SkillsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardHeader
          title="Skills"
          subtitle="Technical and professional skills"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={onImportSkills}
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
            placeholder="React"
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
            placeholder="Frontend"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
            Proficiency
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
              <option value="">Select level</option>
              {PROFICIENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={onAddSkill}>
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
                      {skill.proficiency}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => onDeleteSkill(idx, skill.name)}
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
  );
});

export default SkillsStep;

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
