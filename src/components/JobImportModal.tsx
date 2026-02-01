/**
 * JobImportModal - Universal Job Importer
 *
 * Allows users to import jobs from any URL by parsing Schema.org/JobPosting data.
 * User-initiated, single-page fetching for legal compliance.
 */

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { useToast } from "../contexts";

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

interface JobImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
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
      setError("Please enter a job URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (must start with http:// or https://)");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const result = await invoke<JobImportPreview>("preview_job_import", { url: url.trim() });
      setPreview(result);

      if (result.already_exists) {
        toast.info("Job already exists", "This job already exists in your database");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error("Failed to preview import", errorMessage);
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
      await invoke("import_job_from_url", { url: url.trim() });

      toast.success("Job imported", `Successfully imported "${preview.title}"`);

      // Call success callback
      onImportSuccess?.();

      // Close modal
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error("Failed to import job", errorMessage);
    } finally {
      setImporting(false);
    }
  }, [preview, url, toast, onImportSuccess, onClose]);

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
      title="Import Job from URL"
      size="lg"
      aria-labelledby="import-job-title"
      aria-describedby="import-job-description"
    >
      <div className="space-y-4">
        {/* Description */}
        <p id="import-job-description" className="text-sm text-gray-600 dark:text-gray-400">
          Paste a job URL from any website (Indeed, LinkedIn, Glassdoor, company career pages, etc.).
          We'll automatically extract the job details.
        </p>

        {/* URL Input */}
        <div>
          <label htmlFor="job-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job URL
          </label>
          <input
            id="job-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/jobs/software-engineer"
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
              disabled={loading || !url.trim()}
              loading={loading}
              variant="primary"
            >
              {loading ? "Fetching job details..." : "Preview Import"}
            </Button>
          </div>
        )}

        {/* Job Preview */}
        {preview && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Job Preview
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
              {preview.salary && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Salary:</span> {preview.salary}
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
                  Posted: {new Date(preview.date_posted).toLocaleDateString()}
                </div>
              )}

              {/* Missing Fields Warning */}
              {preview.missing_fields.length > 0 && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠ Missing fields: {preview.missing_fields.join(", ")}
                  </p>
                </div>
              )}

              {/* Already Exists Warning */}
              {preview.already_exists && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    ℹ This job already exists in your database
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
            Change URL
          </Button>
        )}
        <Button onClick={onClose} variant="secondary" disabled={importing}>
          Cancel
        </Button>
        {preview && !preview.already_exists && (
          <Button
            onClick={handleImport}
            disabled={importing || preview.missing_fields.length > 0}
            loading={importing}
            variant="primary"
          >
            {importing ? "Importing..." : "Import Job"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
