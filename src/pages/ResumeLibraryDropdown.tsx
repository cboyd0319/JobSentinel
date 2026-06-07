import { Badge } from "../components/Badge";
import type { ResumeData } from "./resumePageModel";
import { getReadableTextLabel, getResumeFormatLabel } from "./resumePageModel";
import { DocumentIcon, TrashIcon } from "./ResumeIcons";

interface ResumeLibraryDropdownProps {
  resumes: ResumeData[];
  onActivateResume: (resumeId: number) => void;
  onDeleteResume: (resume: ResumeData) => void;
}

export function ResumeLibraryDropdown({
  resumes,
  onActivateResume,
  onDeleteResume,
}: ResumeLibraryDropdownProps) {
  if (resumes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3">
          Resume Library
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resumes.map((resume) => (
            <article
              key={resume.id}
              className={`p-3 rounded-lg border ${
                resume.is_active
                  ? "border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/20"
                  : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
              } transition-colors`}
            >
              <div className="flex items-center justify-between">
                {resume.is_active ? (
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="w-5 h-5 text-surface-500" />
                    <ResumeLibrarySummary resume={resume} />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500"
                    onClick={() => onActivateResume(resume.id)}
                    aria-label={`Use resume: ${resume.name}`}
                  >
                    <DocumentIcon className="w-5 h-5 flex-shrink-0 text-surface-500" />
                    <ResumeLibrarySummary resume={resume} />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {resume.is_active && (
                    <Badge variant="sentinel" size="sm">
                      Active
                    </Badge>
                  )}
                  {!resume.is_active && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteResume(resume);
                      }}
                      className="p-1 text-surface-400 hover:text-red-500 transition-colors"
                      title="Delete resume"
                      aria-label={`Delete resume: ${resume.name}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResumeLibrarySummary({ resume }: { resume: ResumeData }) {
  return (
    <div className="min-w-0">
      <p className="break-words [overflow-wrap:anywhere] text-sm font-medium text-surface-800 dark:text-surface-200">
        {resume.name}
      </p>
      <p className="text-xs text-surface-500">
        {new Date(resume.created_at).toLocaleDateString()}
      </p>
      <p className="text-xs text-surface-500">
        {getResumeFormatLabel(resume)} - {getReadableTextLabel(resume)}
      </p>
    </div>
  );
}
