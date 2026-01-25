import { memo } from "react";
import { Button, CardHeader } from "../../index";

interface Experience {
  id: number;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  achievements: string[];
}

interface ExperienceStepProps {
  experiences: Experience[];
  onAddClick: () => void;
  onEditClick?: (exp: Experience) => void;
  onDeleteClick: (exp: Experience) => void;
}

const ExperienceStep = memo(function ExperienceStep({
  experiences,
  onAddClick,
  onDeleteClick,
}: ExperienceStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardHeader
          title="Work Experience"
          subtitle="Your professional work history"
        />
        <Button size="sm" onClick={onAddClick}>
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
          <Button size="sm" onClick={onAddClick}>
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
                  onClick={() => onDeleteClick(exp)}
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
  );
});

export default ExperienceStep;

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
