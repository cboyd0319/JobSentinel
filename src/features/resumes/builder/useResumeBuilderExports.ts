import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useToast } from "../../../shared/toast/useToast";
import { safeInvoke } from "../../../utils/api";
import { getSafeErrorToastCopy } from "../../../utils/safeErrorCopy";
import {
  downloadResumeDocx,
  downloadResumeJson,
  openResumePrintDialog,
} from "./resumeBuilderExportDom";
import {
  normalizeAtsAnalysis,
  toAtsResumeData,
  toExportResumeData,
  toExportTemplateId,
  toJsonResumeData,
  toTemplateResumeData,
  type ATSAnalysis,
  type BackendATSAnalysis,
  type ResumeData,
  type TemplateId,
} from "./resumeBuilderData";

interface UseResumeBuilderExportsOptions {
  contactName: string;
  currentStep: number;
  resumeData: ResumeData | null;
  resumeId: number | null;
  selectedTemplate: TemplateId;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export function useResumeBuilderExports({
  contactName,
  currentStep,
  resumeData,
  resumeId,
  selectedTemplate,
  setLoading,
}: UseResumeBuilderExportsOptions) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [exporting, setExporting] = useState(false);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const toast = useToast();

  // Preview handlers
  const generatePreview = useCallback(async () => {
    if (!resumeId || !resumeData) return;

    try {
      setLoading(true);
      // NOTE: render_resume_html must sanitize all user input on the Rust side
      // to prevent XSS attacks. The HTML returned here is trusted.
      const html = await safeInvoke<string>("render_resume_html", {
        resume: toTemplateResumeData(resumeData),
        templateId: selectedTemplate,
      }, {
        logContext: "Render resume HTML"
      });
      setPreviewHtml(html);

      // Generate resume readability analysis
      try {
        const analysis = await safeInvoke<BackendATSAnalysis>("analyze_resume_format", {
          resume: toAtsResumeData(resumeData),
        }, {
          logContext: "Analyze resume format",
          silent: true  // Non-critical, don't log failures
        });
        setAtsAnalysis(normalizeAtsAnalysis(analysis));
      } catch {
        // Non-critical, don't block preview
      }
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not create preview",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setLoading(false);
    }
  }, [resumeId, resumeData, selectedTemplate, setLoading, toast]);

  useEffect(() => {
    if (currentStep === 6) {
      generatePreview();
    }
  }, [currentStep, generatePreview]);

  // Export DOCX handler
  const handleExportDocx = async () => {
    if (!resumeData) return;

    try {
      setExporting(true);
      const docxData = await safeInvoke<number[]>("export_resume_docx", {
        resume: toExportResumeData(resumeData),
        template: toExportTemplateId(selectedTemplate),
      }, {
        logContext: "Export resume to DOCX"
      });

      downloadResumeDocx(docxData, contactName);
      toast.success("Resume exported", "Downloaded as DOCX");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not export resume",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = () => {
    if (!resumeData) return;

    try {
      setExporting(true);
      downloadResumeJson(toJsonResumeData(resumeData), contactName);
      toast.success("Resume exported", "Downloaded as JSON Resume");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not export resume",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setExporting(false);
    }
  };

  // Export PDF handler (via browser print)
  const handleExportPdf = async () => {
    if (!resumeData) return;

    try {
      setExporting(true);

      // Generate HTML using the selected template
      const html = await safeInvoke<string>("render_resume_html", {
        resume: toTemplateResumeData(resumeData),
        templateId: selectedTemplate,
      }, {
        logContext: "Render resume for PDF export"
      });

      openResumePrintDialog(html);

      toast.success("Print dialog opened", "Save as PDF using your browser's print dialog");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not open print view",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setExporting(false);
    }
  };

  // Legacy export handler (defaults to DOCX)
  const handleExport = handleExportDocx;

  return {
    atsAnalysis,
    exporting,
    handleExport,
    handleExportDocx,
    handleExportJson,
    handleExportPdf,
    previewHtml,
  };
}
