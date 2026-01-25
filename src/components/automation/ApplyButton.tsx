import { memo, useState, useEffect, useCallback } from "react";
// memo applied to ApplyButton, AtsBadge
import { invoke } from "@tauri-apps/api/core";
import { Button, Modal, ModalFooter } from "..";
import { useToast } from "../../contexts";
import { logError } from "../../utils/errorUtils";
import { safeInvoke, safeInvokeWithToast } from "../../utils/api";
import { ApplicationPreview } from "./ApplicationPreview";

interface Job {
  id: number;
  hash: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  score?: number;
}

interface AtsDetectionResponse {
  platform: string;
  commonFields: string[];
  automationNotes: string | null;
}

interface ApplyButtonProps {
  job: Job;
  onApplied?: () => void;
}

const ATS_DISPLAY_NAMES: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  taleo: "Taleo",
  icims: "iCIMS",
  bamboohr: "BambooHR",
  ashbyhq: "Ashby",
  unknown: "Unknown ATS",
};

const ATS_COLORS: Record<string, string> = {
  greenhouse: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lever: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  workday: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  taleo: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  icims: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  bamboohr: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  ashbyhq: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  unknown: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
};

export const ApplyButton = memo(function ApplyButton({ job, onApplied }: ApplyButtonProps) {
  const [atsPlatform, setAtsPlatform] = useState<string | null>(null);
  const [atsLoading, setAtsLoading] = useState(true);
  const [atsInfo, setAtsInfo] = useState<AtsDetectionResponse | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [browserRunning, setBrowserRunning] = useState(false);
  const [lastAttemptId, setLastAttemptId] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [fillError, setFillError] = useState<string | null>(null);
  const toast = useToast();

  // Check for previous attempt on mount
  useEffect(() => {
    const stored = localStorage.getItem(`lastAttempt_${job.hash}`);
    if (stored) {
      setLastAttemptId(parseInt(stored, 10));
    }
  }, [job.hash]);

  // Detect ATS platform from URL
  const detectPlatform = useCallback(async () => {
    try {
      setAtsLoading(true);
      const result = await safeInvoke<AtsDetectionResponse>("detect_ats_platform", {
        url: job.url,
      }, { silent: true }); // Silent mode - ATS detection is optional
      setAtsPlatform(result.platform);
      setAtsInfo(result);
    } catch {
      // Silently fail - ATS detection is optional
    } finally {
      setAtsLoading(false);
    }
  }, [job.url]);

  // Check if user has configured a profile
  const checkProfile = useCallback(async () => {
    try {
      const profile = await safeInvoke<unknown | null>("get_application_profile", undefined, {
        silent: true,
      });
      setHasProfile(profile !== null);
    } catch {
      // Silently fail - will show error when user tries to apply
    }
  }, []);

  // Check if browser is running
  const checkBrowser = useCallback(async () => {
    try {
      const running = await safeInvoke<boolean>("is_browser_running", undefined, { silent: true });
      setBrowserRunning(running);
    } catch {
      // Silently fail - default to false
    }
  }, []);

  useEffect(() => {
    detectPlatform();
    checkProfile();
    checkBrowser();
  }, [detectPlatform, checkProfile, checkBrowser]);

  const handlePrepareApplication = () => {
    if (!hasProfile) {
      toast.error(
        "Profile required",
        "Please set up your application profile first in Settings > One-Click Apply"
      );
      return;
    }
    setShowPreview(true);
  };

  const handleFillForm = async () => {
    try {
      setIsFilling(true);
      setFillError(null);
      toast.info("Opening browser...", "Form filling will begin shortly");

      const result = await invoke<{
        filledFields: string[];
        unfilledFields: string[];
        captchaDetected: boolean;
        readyForReview: boolean;
        errorMessage: string | null;
        attemptId: number | null;
        durationMs: number;
        atsPlatform: string;
      }>("fill_application_form", { jobUrl: job.url, jobHash: job.hash });

      // Count screening questions filled
      const screeningCount = result.filledFields.filter(f => f.startsWith("screening:")).length;
      const basicCount = result.filledFields.length - screeningCount;

      if (result.captchaDetected) {
        toast.warning(
          "CAPTCHA detected",
          "Please complete the CAPTCHA manually, then click submit"
        );
      } else if (result.errorMessage) {
        // Keep modal open with error for retry
        setFillError(result.errorMessage);
        toast.error("Form fill error", result.errorMessage);
        return; // Don't close modal
      } else {
        const unfilled = result.unfilledFields.length;
        let message = `Filled ${basicCount} basic fields`;
        if (screeningCount > 0) {
          message += ` and ${screeningCount} screening questions`;
        }
        if (unfilled > 0) {
          message += `. ${unfilled} fields need attention`;
        }
        message += `. Review and click Submit in ${(result.durationMs / 1000).toFixed(1)}s.`;

        toast.success("Form filled!", message);
      }

      setShowPreview(false);
      setBrowserRunning(true);

      // Store attempt ID for later tracking
      if (result.attemptId) {
        localStorage.setItem(`lastAttempt_${job.hash}`, result.attemptId.toString());
      }

      onApplied?.();
    } catch (error: unknown) {
      // Check if browser is still running after error for recovery guidance
      let stillRunning = false;
      try {
        stillRunning = await safeInvoke<boolean>("is_browser_running", undefined, { silent: true });
        setBrowserRunning(stillRunning);
      } catch {
        // Ignore check failure
      }

      const enhancedError = error as Error & {
        userFriendly?: { title: string; message: string; action?: string };
      };

      const errorMsg = enhancedError.userFriendly?.message || enhancedError.message || "An unexpected error occurred";
      const recoveryHint = stillRunning ? " Browser is still open." : "";
      const actionHint = enhancedError.userFriendly?.action ? `\n\n${enhancedError.userFriendly.action}` : "";

      // Keep modal open with error for retry
      setFillError(errorMsg + recoveryHint + actionHint);
      logError("Failed to fill form:", error);
      toast.error(
        enhancedError.userFriendly?.title || "Form Fill Failed",
        errorMsg + (recoveryHint || actionHint ? recoveryHint + actionHint : "")
      );
    } finally {
      setIsFilling(false);
    }
  };

  const closeBrowser = async () => {
    try {
      await safeInvokeWithToast("close_automation_browser", undefined, toast, {
        logContext: "Close automation browser",
      });
      setBrowserRunning(false);

      // If we have a pending attempt, ask if they submitted
      if (lastAttemptId) {
        setShowSubmitConfirm(true);
      } else {
        toast.info("Browser closed", "The automation browser has been closed");
      }
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleMarkSubmitted = async () => {
    if (!lastAttemptId) return;

    try {
      await safeInvokeWithToast("mark_attempt_submitted", { attemptId: lastAttemptId }, toast, {
        logContext: "Mark application submitted",
      });
      toast.success("Marked as submitted", "Your application has been tracked");
      localStorage.removeItem(`lastAttempt_${job.hash}`);
      setLastAttemptId(null);
      setShowSubmitConfirm(false);
      onApplied?.();
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleSkipTracking = () => {
    localStorage.removeItem(`lastAttempt_${job.hash}`);
    setLastAttemptId(null);
    setShowSubmitConfirm(false);
    toast.info("Browser closed", "Application not tracked");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* ATS Platform Badge */}
        {atsLoading ? (
          <span className="w-16 h-6 bg-surface-200 dark:bg-surface-700 rounded-full animate-pulse" />
        ) : atsPlatform && atsPlatform !== "unknown" ? (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${ATS_COLORS[atsPlatform] || ATS_COLORS.unknown}`}
            title={atsInfo?.automationNotes || undefined}
          >
            {ATS_DISPLAY_NAMES[atsPlatform] || atsPlatform}
          </span>
        ) : null}

        {/* Main Action Button */}
        {browserRunning ? (
          <Button variant="secondary" onClick={closeBrowser} size="sm">
            <XIcon className="w-4 h-4 mr-1" />
            Close Browser
          </Button>
        ) : (
          <Button
            onClick={handlePrepareApplication}
            disabled={!hasProfile || atsLoading}
            size="sm"
            title={
              atsLoading
                ? "Detecting application platform..."
                : !hasProfile
                  ? "Set up your application profile first"
                  : "Prepare to apply - fills form fields automatically"
            }
          >
            <BoltIcon className="w-4 h-4 mr-1" />
            Quick Apply
          </Button>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => { setShowPreview(false); setFillError(null); }}
        title="Prepare Application"
        size="lg"
      >
        <ApplicationPreview job={job} atsPlatform={atsPlatform} />

        {/* Error state with retry */}
        {fillError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-red-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Form filling failed
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {fillError}
                </p>
              </div>
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowPreview(false); setFillError(null); }}>
            Cancel
          </Button>
          <Button onClick={handleFillForm} loading={isFilling} loadingText="Filling...">
            <BoltIcon className="w-4 h-4 mr-2" />
            {fillError ? "Try Again" : "Fill Form"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirm}
        onClose={handleSkipTracking}
        title="Did you submit?"
        size="sm"
      >
        <div className="py-4">
          <p className="text-surface-700 dark:text-surface-300 mb-4">
            Did you click the Submit button on the application form?
          </p>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            This helps track your application status.
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={handleSkipTracking}>
            No, skip
          </Button>
          <Button onClick={handleMarkSubmitted}>
            <CheckIcon className="w-4 h-4 mr-2" />
            Yes, I submitted
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
});

// Standalone ATS badge for use in job cards
export const AtsBadge = memo(function AtsBadge({ url }: { url: string }) {
  const [platform, setPlatform] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    invoke<AtsDetectionResponse>("detect_ats_platform", { url })
      .then((result) => setPlatform(result.platform))
      .catch((err) => {
        logError("ATS detection failed for badge:", err);
        setError(true);
      });
  }, [url]);

  // Don't show badge on error or unknown platform
  if (error || !platform || platform === "unknown") return null;

  // Use inline styles since Badge doesn't support className
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${ATS_COLORS[platform] || ATS_COLORS.unknown}`}
    >
      {ATS_DISPLAY_NAMES[platform] || platform}
    </span>
  );
});

// Icons
function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
