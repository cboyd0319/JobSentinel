import { useCallback, type CSSProperties } from "react";
import { List, useListRef, type RowComponentProps } from "react-window";
import { JobCard } from "./JobCard";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  created_at: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
}

interface VirtualJobListProps {
  jobs: Job[];
  onHideJob: (id: number) => void;
  height?: number;
  itemHeight?: number;
}

// Row props type for react-window v2
interface JobRowProps {
  jobs: Job[];
  onHideJob: (id: number) => void;
}

// Row component for react-window v2
function JobRow({ index, style, ...props }: RowComponentProps<JobRowProps>) {
  const rowProps = props as unknown as JobRowProps;
  const job = rowProps.jobs[index];

  if (!job) return null;

  return (
    <div style={style as CSSProperties} className="pb-3 pr-2">
      <JobCard job={job} onHideJob={rowProps.onHideJob} />
    </div>
  );
}

/**
 * Virtualized job list for rendering large numbers of jobs efficiently.
 * Only renders visible items plus a small overscan buffer.
 */
export function VirtualJobList({
  jobs,
  onHideJob,
  height = 600,
  itemHeight = 140,
}: VirtualJobListProps) {
  const listRef = useListRef(null);

  // Calculate dynamic height based on viewport
  const calculateHeight = useCallback(() => {
    if (typeof window !== "undefined") {
      return Math.min(height, window.innerHeight - 400);
    }
    return height;
  }, [height]);

  // If we have few items, don't virtualize
  if (jobs.length <= 10) {
    return (
      <div className="space-y-3" role="list" aria-label="Job listings">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onHideJob={onHideJob} />
        ))}
      </div>
    );
  }

  return (
    <List
      listRef={listRef}
      rowCount={jobs.length}
      rowHeight={itemHeight}
      rowComponent={JobRow}
      rowProps={{ jobs, onHideJob }}
      overscanCount={3}
      className="scrollbar-thin scrollbar-thumb-surface-300 dark:scrollbar-thumb-surface-600"
      style={{ height: calculateHeight() }}
      role="list"
      aria-label={`${jobs.length} job listings`}
    />
  );
}

/**
 * Hook for auto-scrolling to a specific job
 */
export function useVirtualListScroll() {
  const listRef = useListRef(null);

  const scrollToJob = useCallback(
    (index: number, align: "start" | "center" | "end" | "auto" = "center") => {
      listRef.current?.scrollToRow({ index, align });
    },
    [listRef]
  );

  return { listRef, scrollToJob };
}
