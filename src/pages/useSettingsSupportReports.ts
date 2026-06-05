import { useCallback, useState } from "react";
import type { ToastContextType } from "../contexts/toastContextDef";
import { copySanitizedDebugReport, saveSanitizedDebugReport } from "../services/feedbackService";
import { logError } from "../utils/errorUtils";

export function useSettingsSupportReports(toast: ToastContextType) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [copyingDebugReport, setCopyingDebugReport] = useState(false);
  const [savingDebugReport, setSavingDebugReport] = useState(false);

  const openFeedbackModal = useCallback(() => {
    setShowFeedbackModal(true);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
  }, []);

  const handleCopyDebugReport = useCallback(async () => {
    setCopyingDebugReport(true);

    try {
      await copySanitizedDebugReport();
      toast.success(
        "Safe support report copied",
        "Share it only if you want help. JobSentinel hides common private details; review it before sharing."
      );
    } catch (error) {
      logError("Could not copy support report:", error);
      toast.error(
        "Could not copy safe support report",
        "Try saving the report instead."
      );
    } finally {
      setCopyingDebugReport(false);
    }
  }, [toast]);

  const handleSaveDebugReport = useCallback(async () => {
    setSavingDebugReport(true);

    try {
      const savedFile = await saveSanitizedDebugReport();
      if (savedFile) {
        toast.success(
          "Support report saved for review",
          `Review ${savedFile.fileName} before sharing it. Share it only if you want help.`
        );
      } else {
        toast.info("Safe support report not saved", "No file was created.");
      }
    } catch (error) {
      logError("Failed to save support report:", error);
      toast.error(
        "Could not save safe support report",
        "Try Copy Safe Support Report instead."
      );
    } finally {
      setSavingDebugReport(false);
    }
  }, [toast]);

  return {
    closeFeedbackModal,
    copyingDebugReport,
    handleCopyDebugReport,
    handleSaveDebugReport,
    openFeedbackModal,
    savingDebugReport,
    showFeedbackModal,
  };
}
