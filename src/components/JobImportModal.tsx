/**
 * JobImportModal - Universal Job Importer
 *
 * Lets users save a job from one job-posting page and review details first.
 * User-initiated, single-page fetching for legal compliance.
 */

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { useToast } from "../contexts";
import { getUserFriendlyError } from "../utils/errorMessages";

interface JobImportPreview {
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  salary: string | null;
  date_posted: string | null;
  valid_through: string | null;
  employment_types: string[];
  remote: boolean;
  missing_fields: string[];
  already_exists: boolean;
}

interface JobImportResult {
  jobId: number;
}

interface JobImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

const missingDetailLabels = new Map<string, string>([
  ["title", "job title"],
  ["job_title", "job title"],
  ["company", "company name"],
  ["company_name", "company name"],
  ["salary", "pay range"],
  ["salary_min", "pay range"],
  ["salary_max", "pay range"],
  ["pay", "pay range"],
  ["pay_range", "pay range"],
  ["date_posted", "posting date"],
  ["posted_date", "posting date"],
  ["posting_date", "posting date"],
  ["valid_through", "closing date"],
  ["location", "location"],
  ["remote", "remote option"],
  ["employment_type", "work type"],
  ["employment_types", "work type"],
  ["description", "job description"],
  ["description_preview", "job description"],
  ["url", "job link"],
  ["job_url", "job link"],
  ["job_link", "job link"],
]);

function formatMissingDetail(field: string) {
  const normalized = field.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return missingDetailLabels.get(normalized) ?? normalized.replace(/_/g, " ");
}

function formatMissingDetails(fields: string[]) {
  const labels = fields.map(formatMissingDetail);
  return [...new Set(labels)].join(", ");
}

function formatImportDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Date not shown";
  }

  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

function extractImportErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

function getSafeImportSpecificMessage(error: unknown): string | null {
  const message = extractImportErrorMessage(error).trim();
  if (!message) return null;

  const safePatterns = [
    /^Paste the full job link from your browser address bar\.$/,
    /^Add a job link from your browser address bar\.$/,
    /^Could not read this page as a single job posting\. Open one job posting, copy its browser address, or save the job with the details JobSentinel can find\.$/,
    /^Could not read this as one job posting\. Open one job posting and copy its browser address\.$/,
    /^Found \d+ job postings on this page\. Please use a more specific URL that links to a single job\.$/,
    /^Missing required information: [A-Za-z ]+\. This job posting may be incomplete\.$/,
    /^This took too long\. Check your internet connection and try again\.$/,
    /^Could not connect to the website\. Please check your internet connection\.$/,
    /^Failed to fetch the page\. Please check the URL and try again\.$/,
    /^The website returned an error: [0-9]{3}(?: [A-Za-z ]+)?$/,
    /^The job page response is too large to import safely\. Maximum size is \d+ MiB\.$/,
    /^The job link redirects to another page\. Paste the final public job posting link from your browser address bar\.$/,
    /^This job is already in your saved jobs$/,
  ];

  return safePatterns.some((pattern) => pattern.test(message)) ? message : null;
}

function getSafeJobImportError(error: unknown) {
  const importMessage = getSafeImportSpecificMessage(error);
  if (importMessage) {
    return {
      message: importMessage,
      action: importMessage,
    };
  }

  const friendly = getUserFriendlyError(error);
  return {
    message: friendly.message,
    action: friendly.action ?? friendly.message,
  };
}

export function JobImportModal({ isOpen, onClose, onImportSuccess }: JobImportModalProps) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<JobImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setPreview(null);
      setError(null);
      setLoading(false);
      setImporting(false);
    }
  }, [isOpen]);

  // Preview the job import
  const handlePreview = useCallback(async () => {
    if (!url.trim()) {
      setError("Add a job link from your browser address bar.");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Paste the full job link from your browser address bar.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const result = await invoke<JobImportPreview>("preview_job_import", { url: url.trim() });
      setPreview(result);

      if (result.already_exists) {
        toast.info("Job already saved", "This job is already in your saved jobs");
      }
    } catch (err) {
      const safeError = getSafeJobImportError(err);
      setError(safeError.message);
      toast.error("Could not check job link", safeError.action);
    } finally {
      setLoading(false);
    }
  }, [url, toast]);

  // Import the job
  const handleImport = useCallback(async () => {
    if (!preview || preview.already_exists) {
      return;
    }

    setImporting(true);
    setError(null);

    try {
      await invoke<JobImportResult>("import_job_from_url", { url: preview.url });

      toast.success("Job saved", `Saved "${preview.title}"`);

      // Call success callback
      onImportSuccess?.();

      // Close modal
      onClose();
    } catch (err) {
      const safeError = getSafeJobImportError(err);
      setError(safeError.message);
      toast.error("Could not save job", safeError.action);
    } finally {
      setImporting(false);
    }
  }, [preview, toast, onImportSuccess, onClose]);

  // Handle Enter key in URL input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !loading && !preview) {
        e.preventDefault();
        handlePreview();
      }
    },
    [loading, preview, handlePreview]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Job from Link"
      size="lg"
      aria-labelledby="import-job-title"
      aria-describedby="import-job-description"
    >
      <div className="space-y-4">
        {/* Description */}
        <p id="import-job-description" className="text-sm text-gray-600 dark:text-gray-400">
          Paste a link to an individual job page from a job board or company career site.
          JobSentinel will check for job details you can review before saving.
        </p>

        {/* URL Input */}
        <div>
          <label htmlFor="job-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job link
          </label>
          <input
            id="job-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/jobs/office-manager"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={loading || importing}
            autoFocus
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Preview Button */}
        {!preview && (
          <div className="flex justify-end">
            <Button
              onClick={handlePreview}
              disabled={loading || importing}
              loading={loading}
              variant="primary"
            >
              {loading ? "Checking job link..." : "Check Job Link"}
            </Button>
          </div>
        )}

        {/* Job Preview */}
        {preview && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Job Details
            </h3>

            <div className="space-y-3">
              {/* Title and Company */}
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {preview.title}
                </div>
                <div className="text-lg text-gray-700 dark:text-gray-300">
                  {preview.company}
                </div>
              </div>

              {/* Location & Remote */}
              {(preview.location || preview.remote) && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {preview.location && <span>{preview.location}</span>}
                  {preview.remote && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Remote
                    </span>
                  )}
                </div>
              )}

              {/* Employment Types */}
              {preview.employment_types.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {preview.employment_types.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}

              {/* Salary */}
              {preview.salary ? (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Listed pay:</span> {preview.salary}
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Listed pay not shown.</span> Verify pay before tailoring.
                </div>
              )}

              {/* Description Preview */}
              {preview.description_preview && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>{" "}
                  {preview.description_preview}
                </div>
              )}

              {/* Date Posted */}
              {preview.date_posted && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Posted: {formatImportDate(preview.date_posted)}
                </div>
              )}

              {/* Closing Date */}
              {preview.valid_through && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Closing date: {formatImportDate(preview.valid_through)}
                </div>
              )}

              {/* Missing details warning */}
              {preview.missing_fields.length > 0 && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="flex items-start gap-1.5 text-xs text-yellow-800 dark:text-yellow-200">
                    <WarningIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      Details to check: {formatMissingDetails(preview.missing_fields)}. You can still save this job
                      and verify the missing details before tailoring.
                    </span>
                  </p>
                </div>
              )}

              {/* Already Exists Warning */}
              {preview.already_exists && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
                    <InfoIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>This job is already in your saved jobs</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <ModalFooter>
        {preview && !preview.already_exists && (
          <Button onClick={() => setPreview(null)} variant="secondary" disabled={importing}>
            Change Link
          </Button>
        )}
        <Button onClick={onClose} variant="secondary" disabled={importing}>
          Cancel
        </Button>
        {preview && !preview.already_exists && (
          <Button
            onClick={handleImport}
            disabled={importing}
            loading={importing}
            variant="primary"
          >
            {importing ? "Saving..." : "Save Job"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.94 4h13.88c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.33 16c-.77 1.33.19 3 1.73 3z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
