import { clearStoredResumeJobContext } from "../utils/resumeJobContext";

interface ResumeBuilderJobContextCardProps {
  visible: boolean;
}

export function ResumeBuilderJobContextCard({
  visible,
}: ResumeBuilderJobContextCardProps) {
  if (!visible) {
    return null;
  }

  return (
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
          clearStoredResumeJobContext();
          window.location.reload();
        }}
        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
      >
        Clear job context
      </button>
    </div>
  );
}
