import { CardHeader } from "../components/Card";
import {
  MAJOR_ATS_PORTAL_REVIEW_CHECKS,
  RESUME_EXPORT_INTEGRITY_CHECKS,
} from "../shared/resumeWritingTaxonomy";
import type { ATSAnalysis, Template, TemplateId } from "./resumeBuilderData";
import { sanitizeResumeHtmlDocument } from "./resumeHtmlSanitizer";
import { TemplateThumbnail } from "./ResumeBuilderVisuals";

interface ResumeBuilderPreviewStepProps {
  templates: Template[];
  selectedTemplate: TemplateId;
  previewHtml: string;
  atsAnalysis: ATSAnalysis | null;
  onSelectTemplate: (templateId: TemplateId) => void;
}

export function ResumeBuilderPreviewStep({
  templates,
  selectedTemplate,
  previewHtml,
  atsAnalysis,
  onSelectTemplate,
}: ResumeBuilderPreviewStepProps) {
  return (
    <div className="space-y-6">
      <CardHeader
        title="Choose Template"
        subtitle="Select a template and preview your resume"
      />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            aria-label={`Select ${template.name} template: ${template.description}`}
            aria-pressed={selectedTemplate === template.id}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedTemplate === template.id
                ? "border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/20"
                : "border-surface-200 dark:border-surface-600 hover:border-sentinel-300 dark:hover:border-sentinel-700"
            }`}
          >
            <div className="aspect-[8.5/11] bg-surface-100 dark:bg-surface-700 rounded mb-2 overflow-hidden">
              <TemplateThumbnail templateId={template.id} />
            </div>
            <p className="text-xs font-medium text-surface-800 dark:text-surface-200">
              {template.name}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
              {template.description}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100">
          Export checks
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RESUME_EXPORT_INTEGRITY_CHECKS.map((check) => (
            <div key={check.id} className="rounded-md bg-surface-50 p-3 dark:bg-surface-900/70">
              <p className="text-xs font-semibold text-surface-800 dark:text-surface-100">
                {check.label}
              </p>
              <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">
                {check.userAction}
              </p>
            </div>
          ))}
        </div>
        <h4 className="mt-4 text-sm font-semibold text-surface-800 dark:text-surface-100">
          Major ATS portal checks
        </h4>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {MAJOR_ATS_PORTAL_REVIEW_CHECKS.map((portal) => (
            <div
              key={portal.id}
              className="rounded-md border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900/70"
            >
              <p className="text-xs font-semibold text-surface-800 dark:text-surface-100">
                {portal.label}
              </p>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {portal.sourceSignal}
              </p>
              <p className="mt-2 text-xs text-surface-600 dark:text-surface-300">
                {portal.candidateAction}
              </p>
            </div>
          ))}
        </div>
      </div>

      {(atsAnalysis || previewHtml) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {atsAnalysis && (
            <div className="lg:col-span-1">
              <div className="border border-surface-200 dark:border-surface-600 rounded-lg p-4 bg-white dark:bg-surface-800">
                <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">
                  Resume Format Readability
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-surface-200 dark:text-surface-600"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 40 * (1 - atsAnalysis.format_score / 100)
                        }`}
                        className={
                          atsAnalysis.format_score >= 80
                            ? "text-success"
                            : atsAnalysis.format_score >= 60
                            ? "text-warning"
                            : "text-error"
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-surface-800 dark:text-surface-200">
                        {Math.round(atsAnalysis.format_score)}
                      </span>
                    </div>
                  </div>
                </div>

                {atsAnalysis.issues.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">
                      Things To Check
                    </h4>
                    <ul className="space-y-1">
                      {atsAnalysis.issues.slice(0, 3).map((issue, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-surface-600 dark:text-surface-400 flex items-start"
                        >
                          <span className="text-error mr-1">-</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                    {atsAnalysis.issues.length > 3 && (
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                        +{atsAnalysis.issues.length - 3} more things to check
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                  For a fuller review, use Resume Match with the job posting you care
                  about.
                </p>
              </div>
            </div>
          )}

          {previewHtml && (
            <div
              className={`${
                atsAnalysis ? "lg:col-span-2" : "lg:col-span-3"
              } border border-surface-200 dark:border-surface-600 rounded-lg p-6 bg-white dark:bg-surface-700 max-h-96 overflow-y-auto`}
            >
              <iframe
                title="Resume preview"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={sanitizeResumeHtmlDocument(previewHtml)}
                className="h-96 w-full border-0 bg-white"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
