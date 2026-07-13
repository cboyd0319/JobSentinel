import {
  SKILL_STRENGTH_OPTIONS,
  getSkillStrengthLabel,
  type UserSkill,
} from "./resumePageModel";

export function ResumeSkillStrengthMix({ skills }: { skills: UserSkill[] }) {
  return (
    <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
      <h4 className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
        Skill Strength Mix
      </h4>
      <div className="space-y-2">
        {SKILL_STRENGTH_OPTIONS.map((option) => {
          const count = skills.filter(
            (skill) => getSkillStrengthLabel(skill.proficiency_level) === option.label,
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
                        ? "bg-info"
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
  );
}
