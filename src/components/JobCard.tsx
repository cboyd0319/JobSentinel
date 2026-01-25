import { useState, memo, lazy, Suspense } from "react";
import { ScoreDisplay } from "./ScoreDisplay";
import { GhostIndicatorCompact } from "./GhostIndicator";
import { ModalSkeleton } from "./LoadingFallbacks";
import { open } from "@tauri-apps/plugin-shell";
import { logError } from "../utils/errorUtils";
import { formatRelativeDate, formatSalaryRange, truncateText } from "../utils/formatUtils";
import { SCORE_THRESHOLD_HIGH, SCORE_THRESHOLD_GOOD } from "../utils/constants";
import { useToast } from "../hooks/useToast";

// Lazy load modal to reduce initial bundle size
const ScoreBreakdownModal = lazy(() => import("./ScoreBreakdownModal").then(m => ({ default: m.ScoreBreakdownModal })));

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  score_reasons?: string | null; // JSON array of scoring reasons
  created_at: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
  bookmarked?: boolean;
  notes?: string | null;
  // Ghost detection fields (v1.4)
  ghost_score?: number | null;
  ghost_reasons?: string | null;
  // Deduplication field (v1.4)
  times_seen?: number;
}

interface JobCardProps {
  job: Job;
  onViewJob?: (url: string) => void;
  onHideJob?: (id: number) => void;
  onToggleBookmark?: (id: number) => void;
  onEditNotes?: (id: number, currentNotes?: string | null) => void;
  onResearchCompany?: (company: string) => void;
  isSelected?: boolean;
}

export const JobCard = memo(function JobCard({ job, onViewJob, onHideJob, onToggleBookmark, onEditNotes, onResearchCompany, isSelected = false }: JobCardProps) {
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const toast = useToast();

  // Security: Validate URL protocol before opening
  const isValidUrl = (url: string): boolean => {
    // Parse URL to validate scheme properly, not just string prefix
    // This prevents bypass attacks like "javascript:alert(1)//https://"
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  // Keyboard accessibility helper
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  const handleOpenUrl = async (url: string) => {
    // Security: Block dangerous URL protocols (javascript:, data:, file:, etc.)
    if (!isValidUrl(url)) {
      logError("Security: Blocked attempt to open URL with invalid protocol:", url.slice(0, 50));
      return;
    }

    try {
      await open(url);
    } catch (err: unknown) {
      // Log error and fallback to window.open
      logError("Failed to open URL via Tauri shell:", err);
      toast.error("Failed to open link", "Unable to open the job posting URL");
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };


  const isHighMatch = job.score >= SCORE_THRESHOLD_HIGH;
  const isGoodMatch = job.score >= SCORE_THRESHOLD_GOOD;
  const salaryText = formatSalaryRange(job.salary_min, job.salary_max);
  const descSnippet = truncateText(job.description);

  return (
    <>
      {isScoreModalOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <ScoreBreakdownModal
            isOpen={isScoreModalOpen}
            onClose={() => setIsScoreModalOpen(false)}
            score={job.score}
            scoreReasons={job.score_reasons}
            jobTitle={job.title}
          />
        </Suspense>
      )}

      <div
        className={`
          group relative bg-white dark:bg-surface-800 rounded-card border motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out
          motion-safe:hover:shadow-card-hover motion-safe:hover:-translate-y-0.5
          focus-within:ring-2 focus-within:ring-sentinel-500 dark:focus-within:ring-sentinel-400
          ${isSelected
            ? "ring-2 ring-sentinel-500 dark:ring-sentinel-400 border-sentinel-300 dark:border-sentinel-600"
            : isHighMatch
              ? "border-alert-200 dark:border-alert-700 shadow-soft hover:border-alert-300 dark:hover:border-alert-600"
              : "border-surface-100 dark:border-surface-700 shadow-soft dark:shadow-none hover:border-surface-200 dark:hover:border-surface-600"
          }
        `}
        data-testid="job-card"
        data-job-id={job.id}
        data-selected={isSelected || undefined}
        role="article"
        aria-label={`${job.title} at ${job.company}${job.score >= SCORE_THRESHOLD_HIGH ? ", high match" : job.score >= SCORE_THRESHOLD_GOOD ? ", good match" : ""}`}
      >
      {/* High match indicator */}
      {isHighMatch && (
        <div className="absolute -top-px -left-px -right-px h-1 bg-gradient-to-r from-alert-400 via-alert-500 to-alert-400 rounded-t-card" />
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Score */}
          <div className="flex-shrink-0">
            <ScoreDisplay
              score={job.score}
              size="md"
              showLabel={false}
              scoreReasons={job.score_reasons}
              onClick={() => setIsScoreModalOpen(true)}
              jobTitle={job.title}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and company */}
            <h3 data-testid="job-title" className="font-display text-display-md text-surface-900 dark:text-white mb-1 truncate group-hover:text-sentinel-600 dark:group-hover:text-sentinel-400 transition-colors">
              {job.title}
            </h3>
            <p data-testid="job-company" className="text-surface-600 dark:text-surface-400 font-medium mb-2">{job.company}</p>

            {/* Description snippet */}
            {descSnippet && (
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-2 line-clamp-2">
                {descSnippet}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
              {/* Ghost indicator */}
              {job.ghost_score !== undefined && job.ghost_score !== null && job.ghost_score >= 0.5 && (
                <GhostIndicatorCompact
                  ghostScore={job.ghost_score}
                  ghostReasons={job.ghost_reasons ?? null}
                  jobId={job.id}
                />
              )}

              {/* Location */}
              <span className="inline-flex items-center gap-1">
                <LocationIcon />
                {job.remote ? "Remote" : job.location || "Location TBD"}
              </span>

              {/* Salary */}
              {salaryText && (
                <span className="inline-flex items-center gap-1 text-success font-medium">
                  <SalaryIcon />
                  {salaryText}
                </span>
              )}

              {/* Source */}
              <span className="inline-flex items-center gap-1">
                <SourceIcon />
                {job.source}
              </span>

              {/* Times seen (if > 1) */}
              {job.times_seen && job.times_seen > 1 && (
                <span className="inline-flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500" title={`This job has been seen ${job.times_seen} times across different sources`}>
                  <DuplicateIcon />
                  {job.times_seen}x
                </span>
              )}

              {/* Time */}
              <span className="inline-flex items-center gap-1">
                <ClockIcon />
                {formatRelativeDate(job.created_at)}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="flex-shrink-0 self-center flex items-center gap-1">
            {/* Research company button */}
            {onResearchCompany && (
              <button
                onClick={() => onResearchCompany(job.company)}
                onKeyDown={(e) => handleKeyDown(e, () => onResearchCompany(job.company))}
                className="p-2 text-surface-400 hover:text-purple-500 dark:hover:text-purple-400 opacity-40 group-hover:opacity-100 focus-visible:opacity-100 transition-colors"
                aria-label="Research company"
                title="Research company"
                data-testid="btn-research"
              >
                <ResearchIcon />
              </button>
            )}

            {/* Notes button */}
            {onEditNotes && (
              <button
                onClick={() => onEditNotes(job.id, job.notes)}
                onKeyDown={(e) => handleKeyDown(e, () => onEditNotes(job.id, job.notes))}
                className={`p-2 transition-colors ${
                  job.notes
                    ? "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    : "text-surface-400 hover:text-blue-500 dark:hover:text-blue-400 opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
                }`}
                aria-label={job.notes ? "Edit notes" : "Add notes"}
                data-testid="btn-notes"
              >
                <NotesIcon filled={!!job.notes} />
              </button>
            )}

            {/* Bookmark button */}
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(job.id)}
                onKeyDown={(e) => handleKeyDown(e, () => onToggleBookmark(job.id))}
                className={`p-2 transition-colors ${
                  job.bookmarked
                    ? "text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300"
                    : "text-surface-400 hover:text-yellow-500 dark:hover:text-yellow-400 opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
                }`}
                aria-label={job.bookmarked ? "Remove bookmark" : "Bookmark this job"}
                data-testid="btn-bookmark"
                data-bookmarked={job.bookmarked || undefined}
              >
                <BookmarkIcon filled={job.bookmarked} />
              </button>
            )}

            <button
              onClick={() => {
                if (onViewJob) {
                  onViewJob(job.url);
                } else {
                  handleOpenUrl(job.url);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, () => {
                if (onViewJob) {
                  onViewJob(job.url);
                } else {
                  handleOpenUrl(job.url);
                }
              })}
              className={`
                inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-150 cursor-pointer
                ${isGoodMatch
                  ? "bg-sentinel-50 dark:bg-sentinel-900/30 text-sentinel-600 dark:text-sentinel-400 hover:bg-sentinel-100 dark:hover:bg-sentinel-900/50"
                  : "bg-surface-50 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-600"
                }
              `}
              aria-label={`View ${job.title} at ${job.company} job posting`}
              data-testid="btn-view"
            >
              View
              <ArrowIcon />
            </button>

            {/* Hide button */}
            {onHideJob && (
              <button
                onClick={() => onHideJob(job.id)}
                onKeyDown={(e) => handleKeyDown(e, () => onHideJob(job.id))}
                className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Not interested in this job"
                data-testid="btn-hide"
              >
                <HideIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

// Icons - memoized to prevent re-creation on every render
const HideIcon = memo(function HideIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
});

const LocationIcon = memo(function LocationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
});

const SalaryIcon = memo(function SalaryIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
});

const SourceIcon = memo(function SourceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
});

const ClockIcon = memo(function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
});

const ArrowIcon = memo(function ArrowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
});

const BookmarkIcon = memo(function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
});

const NotesIcon = memo(function NotesIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
});

const ResearchIcon = memo(function ResearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
});

const DuplicateIcon = memo(function DuplicateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
});
