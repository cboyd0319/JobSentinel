import { Button } from "../components/Button";
import { CardHeader } from "../components/Card";
import { CheckCircleIcon, DocxIcon, PdfIcon } from "./ResumeBuilderVisuals";

interface ResumeBuilderExportStepProps {
  exporting: boolean;
  onExportDocx: () => void;
  onExportPdf: () => void;
}

export function ResumeBuilderExportStep({
  exporting,
  onExportDocx,
  onExportPdf,
}: ResumeBuilderExportStepProps) {
  return (
    <div className="space-y-6 text-center">
      <CardHeader
        title="Export Resume"
        subtitle="Download your resume in PDF or DOCX format"
      />
      <div className="py-8">
        <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-200 mb-2">
          Your resume is ready!
        </h3>
        <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">
          Export as PDF for final submission or DOCX for further editing
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={onExportPdf} loading={exporting} size="lg">
            <PdfIcon className="w-5 h-5 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={onExportDocx}
            loading={exporting}
            size="lg"
            variant="secondary"
          >
            <DocxIcon className="w-5 h-5 mr-2" />
            Download DOCX
          </Button>
        </div>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-4">
          PDF export opens your browser's print dialog - select "Save as PDF"
        </p>
      </div>
    </div>
  );
}
