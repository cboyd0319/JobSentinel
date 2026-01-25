import { memo } from "react";
import { Button, CardHeader } from "../../index";

interface Education {
  id: number;
  degree: string;
  institution: string;
  location: string | null;
  graduation_date: string | null;
  gpa: string | null;
  honors: string[];
}

interface EducationStepProps {
  educations: Education[];
  onAddClick: () => void;
  onDeleteClick: (edu: Education) => void;
}

const EducationStep = memo(function EducationStep({
  educations,
  onAddClick,
  onDeleteClick,
}: EducationStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardHeader
          title="Education"
          subtitle="Your academic background"
        />
        <Button size="sm" onClick={onAddClick}>
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
          <Button size="sm" onClick={onAddClick}>
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
                  onClick={() => onDeleteClick(edu)}
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
  );
});

export default EducationStep;

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
