import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DocumentIcon } from "./ResumeIcons";

interface ResumeEmptyStateProps {
  uploading: boolean;
  onImportJsonResume: () => void;
  onUploadResume: () => void;
}

export function ResumeEmptyState({
  uploading,
  onImportJsonResume,
  onUploadResume,
}: ResumeEmptyStateProps) {
  return (
    <Card className="text-center py-12 dark:bg-surface-800">
      <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <DocumentIcon className="w-8 h-8 text-surface-400" />
      </div>
      <h3 className="font-display text-display-md text-surface-700 dark:text-surface-300 mb-2">
        No Resume Added
      </h3>
      <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
        Add your resume to review skills, compare fit evidence, and keep match
        history local.
      </p>
      <div className="mx-auto flex max-w-sm flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          onClick={onUploadResume}
          loading={uploading}
          loadingText="Adding..."
        >
          Add Resume
        </Button>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onImportJsonResume}
          loading={uploading}
          loadingText="Importing..."
          title="Use a file exported from JobSentinel or another resume app"
        >
          Import from resume app
        </Button>
      </div>
    </Card>
  );
}
