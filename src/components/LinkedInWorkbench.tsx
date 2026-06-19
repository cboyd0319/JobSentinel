import { useEffect, useState } from "react";
import { Button } from "./Button";
import { useToast } from "../contexts";
import { openDeepLink } from "../services/deeplinks";
import { recordLinkedInWorkbenchEvent } from "../services/linkedinWorkbench";
import {
  defaultLinkedInWorkbenchPrefill,
  LINKEDIN_WORKBENCH_ACK_STORAGE_KEY,
  LINKEDIN_WORKBENCH_ACK_VERSION,
  LINKEDIN_WORKBENCH_PRIVACY_REMINDER_MINUTES,
  parseUserProvidedLinkedInText,
  sanitizeLinkedInWorkbenchTextForStorage,
  sanitizeLinkedInWorkbenchUrl,
  shouldShowLinkedInWorkbenchPrivacyReminder,
  type LinkedInWorkbenchEventType,
  type LinkedInWorkbenchPrefill,
} from "../shared/linkedinWorkbench";
import { logError } from "../utils/errorUtils";

const LINKEDIN_JOBS_URL = "https://www.linkedin.com/jobs/";
const LINKEDIN_TRACKER_URL = "https://www.linkedin.com/jobs-tracker/?stage=applied";

interface StoredAcknowledgement {
  version: string;
  acceptedAt: string;
}

export function LinkedInWorkbench() {
  const toast = useToast();
  const [acknowledged, setAcknowledged] = useState(readStoredAcknowledgement);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [draft, setDraft] = useState<LinkedInWorkbenchPrefill>(
    defaultLinkedInWorkbenchPrefill,
  );
  const [pastedText, setPastedText] = useState("");
  const [busyAction, setBusyAction] = useState<LinkedInWorkbenchEventType | "open" | null>(
    null,
  );

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const showPrivacyReminder =
    now !== null && shouldShowLinkedInWorkbenchPrivacyReminder(sessionStartedAt, now);

  const updateAcknowledgement = (accepted: boolean) => {
    setAcknowledged(accepted);
    if (accepted) {
      writeStoredAcknowledgement();
    } else {
      window.localStorage.removeItem(LINKEDIN_WORKBENCH_ACK_STORAGE_KEY);
    }
  };

  const handleOpen = async (url: string) => {
    if (!acknowledged) {
      toast.warning("Review LinkedIn workbench first", "Check the box before opening LinkedIn.");
      return;
    }

    setBusyAction("open");
    try {
      await openDeepLink(url);
      setSessionStartedAt(Date.now());
      toast.success("LinkedIn opened", "Use the local buttons here to record what you choose.");
    } catch (error) {
      logError("Failed to open LinkedIn workbench URL:", error);
      toast.error("LinkedIn could not open", "Try opening LinkedIn in your browser.");
    } finally {
      setBusyAction(null);
    }
  };

  const applyPastedText = () => {
    const parsed = parseUserProvidedLinkedInText(pastedText);
    setDraft((current) => ({
      title: parsed.title || current.title,
      company: parsed.company || current.company,
      url: parsed.url || current.url,
      notes: parsed.notes || current.notes,
    }));
  };

  const recordAction = async (eventType: LinkedInWorkbenchEventType) => {
    if (!acknowledged) {
      toast.warning("Review LinkedIn workbench first", "Check the box before recording work.");
      return;
    }

    setBusyAction(eventType);
    try {
      const result = await recordLinkedInWorkbenchEvent({
        eventType,
        title: cleanOptional(draft.title),
        company: cleanOptional(draft.company),
        url: cleanOptional(sanitizeLinkedInWorkbenchUrl(draft.url)),
        notes: cleanOptional(sanitizeLinkedInWorkbenchTextForStorage(draft.notes)),
      });
      toast.success(successTitle(eventType), successMessage(eventType, result.needsDetails));
    } catch (error) {
      logError("Failed to record LinkedIn workbench event:", error);
      toast.error("LinkedIn work was not saved", "Try again or add the job manually.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sentinel-200 bg-sentinel-50 p-4 dark:border-sentinel-800 dark:bg-sentinel-900/20">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-sentinel-900 dark:text-sentinel-100">
            LinkedIn Workbench
          </p>
          <p className="text-sm leading-6 text-sentinel-800 dark:text-sentinel-200">
            Use LinkedIn yourself. JobSentinel keeps a private local record of
            jobs you save, apply to, track, or review.
          </p>
          <p className="text-sm leading-6 text-sentinel-800 dark:text-sentinel-200">
            JobSentinel learns from the buttons you click here, not from hidden
            LinkedIn page watching.
          </p>
          <label className="flex items-start gap-3 text-sm font-medium text-sentinel-900 dark:text-sentinel-100">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 rounded border-sentinel-300 text-sentinel-700 focus:ring-sentinel-500"
              checked={acknowledged}
              onChange={(event) => updateAcknowledgement(event.target.checked)}
            />
            <span>
              I understand. Remember this on this computer unless JobSentinel
              changes how this works.
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="primary"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "open"}
          loadingText="Opening..."
          onClick={() => void handleOpen(LINKEDIN_JOBS_URL)}
        >
          Open LinkedIn Jobs
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "open"}
          loadingText="Opening..."
          onClick={() => void handleOpen(LINKEDIN_TRACKER_URL)}
        >
          Open applied jobs
        </Button>
      </div>

      {sessionStartedAt !== null && (
        <p
          className={`rounded-lg border p-3 text-sm ${
            showPrivacyReminder
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
              : "border-surface-200 bg-surface-50 text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
          }`}
          aria-live="polite"
        >
          {showPrivacyReminder
            ? "Privacy reminder: close LinkedIn when you are done, or keep going if you are still working."
            : `Privacy reminder appears after ${LINKEDIN_WORKBENCH_PRIVACY_REMINDER_MINUTES} minutes. JobSentinel will not force this session closed.`}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          variant="success"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "applied"}
          loadingText="Saving..."
          onClick={() => void recordAction("applied")}
        >
          Log applied
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "saved"}
          loadingText="Saving..."
          onClick={() => void recordAction("saved")}
        >
          Save job
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "tracking"}
          loadingText="Saving..."
          onClick={() => void recordAction("tracking")}
        >
          Track job
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "note"}
          loadingText="Saving..."
          onClick={() => void recordAction("note")}
        >
          Add note
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!acknowledged}
          loading={busyAction === "not_interested"}
          loadingText="Saving..."
          onClick={() => void recordAction("not_interested")}
        >
          Not interested
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-surface-700 dark:text-surface-200">
            Job title
          </span>
          <input
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-sentinel-500 focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Optional"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-surface-700 dark:text-surface-200">
            Company
          </span>
          <input
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-sentinel-500 focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
            value={draft.company}
            onChange={(event) => setDraft({ ...draft, company: event.target.value })}
            placeholder="Optional"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-surface-700 dark:text-surface-200">
          Job link
        </span>
        <input
          className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-sentinel-500 focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
          value={draft.url}
          onChange={(event) => setDraft({ ...draft, url: event.target.value })}
          placeholder="Optional"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-surface-700 dark:text-surface-200">
          Paste selected job text
        </span>
        <textarea
          className="min-h-24 w-full resize-y rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-sentinel-500 focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          variant="secondary"
          size="sm"
          disabled={!pastedText.trim()}
          onClick={applyPastedText}
        >
          Use pasted details
        </Button>
        <p className="text-xs leading-5 text-surface-500 dark:text-surface-400">
          Pasted details become suggestions. Review before saving.
        </p>
      </div>
    </div>
  );
}

function readStoredAcknowledgement(): boolean {
  try {
    const value = window.localStorage.getItem(LINKEDIN_WORKBENCH_ACK_STORAGE_KEY);
    if (!value) {
      return false;
    }

    const parsed = JSON.parse(value) as Partial<StoredAcknowledgement>;
    return parsed.version === LINKEDIN_WORKBENCH_ACK_VERSION;
  } catch {
    return false;
  }
}

function writeStoredAcknowledgement() {
  const acknowledgement: StoredAcknowledgement = {
    version: LINKEDIN_WORKBENCH_ACK_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    LINKEDIN_WORKBENCH_ACK_STORAGE_KEY,
    JSON.stringify(acknowledgement),
  );
}

function cleanOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function successTitle(eventType: LinkedInWorkbenchEventType): string {
  switch (eventType) {
    case "applied":
      return "Application logged";
    case "saved":
      return "Job saved";
    case "tracking":
      return "Job tracked";
    case "note":
      return "Note saved";
    case "not_interested":
      return "Feedback saved";
  }
}

function successMessage(eventType: LinkedInWorkbenchEventType, needsDetails: boolean): string {
  if (eventType === "applied" && needsDetails) {
    return "Draft created. Add title, company, or link when you have a moment.";
  }

  if (needsDetails) {
    return "Saved as a draft. Add details later.";
  }

  return "Saved locally in JobSentinel.";
}
