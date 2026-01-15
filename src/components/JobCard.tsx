import { ScoreDisplay } from "./ScoreDisplay";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  discovered_at: string;
}

interface JobCardProps {
  job: Job;
  onViewJob?: (url: string) => void;
  onHideJob?: (id: number) => void;
}

export function JobCard({ job, onViewJob, onHideJob }: JobCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isHighMatch = job.score >= 0.9;
  const isGoodMatch = job.score >= 0.7;

  return (
    <div
      className={`
        group relative bg-white dark:bg-surface-800 rounded-card border transition-all duration-200 ease-out
        hover:shadow-card-hover hover:-translate-y-0.5
        ${isHighMatch 
          ? "border-alert-200 dark:border-alert-700 shadow-soft hover:border-alert-300 dark:hover:border-alert-600" 
          : "border-surface-100 dark:border-surface-700 shadow-soft dark:shadow-none hover:border-surface-200 dark:hover:border-surface-600"
        }
      `}
    >
      {/* High match indicator */}
      {isHighMatch && (
        <div className="absolute -top-px -left-px -right-px h-1 bg-gradient-to-r from-alert-400 via-alert-500 to-alert-400 rounded-t-card" />
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Score */}
          <div className="flex-shrink-0">
            <ScoreDisplay score={job.score} size="md" showLabel={false} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and company */}
            <h3 className="font-display text-display-md text-surface-900 dark:text-white mb-1 truncate group-hover:text-sentinel-600 dark:group-hover:text-sentinel-400 transition-colors">
              {job.title}
            </h3>
            <p className="text-surface-600 dark:text-surface-400 font-medium mb-3">{job.company}</p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
              {/* Location */}
              <span className="inline-flex items-center gap-1">
                <LocationIcon />
                {job.location || "Remote"}
              </span>

              {/* Source */}
              <span className="inline-flex items-center gap-1">
                <SourceIcon />
                {job.source}
              </span>

              {/* Time */}
              <span className="inline-flex items-center gap-1">
                <ClockIcon />
                {formatDate(job.discovered_at)}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="flex-shrink-0 self-center">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (onViewJob) {
                  e.preventDefault();
                  onViewJob(job.url);
                }
              }}
              className={`
                inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-150
                ${isGoodMatch
                  ? "bg-sentinel-50 dark:bg-sentinel-900/30 text-sentinel-600 dark:text-sentinel-400 hover:bg-sentinel-100 dark:hover:bg-sentinel-900/50"
                  : "bg-surface-50 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-600"
                }
              `}
            >
              View
              <ArrowIcon />
            </a>
            
            {/* Hide button */}
            {onHideJob && (
              <button
                onClick={() => onHideJob(job.id)}
                className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors opacity-0 group-hover:opacity-100"
                title="Not interested"
              >
                <HideIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function HideIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SourceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
