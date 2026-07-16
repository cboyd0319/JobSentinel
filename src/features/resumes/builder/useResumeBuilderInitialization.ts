import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../../shared/toast/useToast";
import { safeInvoke } from "../../../platform/tauri";
import { getSafeErrorToastCopy } from "../../../shared/errorReporting/safeToastCopy";
import type { Template } from "./resumeBuilderData";

export function useResumeBuilderInitialization() {
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [initializationError, setInitializationError] = useState(false);
  const initializedRef = useRef(false);
  const toast = useToast();

  const initializeResume = useCallback(async () => {
    try {
      setLoading(true);
      setInitializationError(false);
      const id = await safeInvoke<number>("create_resume_draft", {}, {
        logContext: "Create resume draft"
      });
      setResumeId(id);

      // Load templates
      const templatesData = await safeInvoke<Template[]>("list_resume_templates", {}, {
        logContext: "List resume templates"
      });
      setTemplates(templatesData);

      toast.success("Resume created", "Let's build your resume");
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Resume builder unavailable",
        fallbackMessage:
          "Resume builder did not start. Copy a safe support report if this keeps happening, then close and reopen JobSentinel.",
      });
      toast.error(safeError.title, safeError.message);
      setInitializationError(true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initialize resume on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeResume();
  }, [initializeResume]);

  return {
    initializationError,
    initializeResume,
    loading,
    resumeId,
    setLoading,
    templates,
  };
}
