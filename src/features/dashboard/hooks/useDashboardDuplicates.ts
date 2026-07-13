import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../../../contexts";
import { invalidateCacheByCommand, safeInvokeWithToast } from "../../../utils/api";
import { logError } from "../../../utils/errorUtils";
import type { DuplicateGroup, Job } from "../types";

export function useDashboardDuplicates(
  jobs: Job[],
  setJobs: Dispatch<SetStateAction<Job[]>>,
) {
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const toast = useToast();

  const handleCheckDuplicates = useCallback(async () => {
    try {
      setCheckingDuplicates(true);
      const groups = await safeInvokeWithToast<DuplicateGroup[]>(
        "find_duplicates",
        undefined,
        toast,
        { logContext: "Find duplicate jobs" },
      );
      setDuplicateGroups(groups);
      setDuplicatesModalOpen(true);

      if (groups.length === 0) {
        toast.success(
          "No repeated postings found",
          "No likely repeats found in the current job list.",
        );
      } else {
        toast.info(
          "Possible repeats found",
          groups.length === 1
            ? "1 group needs review"
            : `${groups.length} groups need review`,
        );
      }
    } catch {
      // Error already logged and shown to user.
    } finally {
      setCheckingDuplicates(false);
    }
  }, [toast]);

  const handleMergeDuplicates = useCallback(
    async (primaryId: number, duplicateIds: number[]) => {
      try {
        await safeInvokeWithToast(
          "merge_duplicates",
          { primaryId, duplicateIds },
          toast,
          { logContext: "Hide possible repeated jobs" },
        );
        setJobs(
          jobs.filter(
            (job) => job.id === primaryId || !duplicateIds.includes(job.id),
          ),
        );
        setDuplicateGroups((previous) =>
          previous.filter((group) => group.primary_id !== primaryId),
        );
        toast.success("Possible repeats hidden", "Keeping highest-scoring version");
        invalidateCacheByCommand("get_recent_jobs");
        invalidateCacheByCommand("get_statistics");
      } catch {
        // Error already logged and shown to user.
      }
    },
    [jobs, setJobs, toast],
  );

  const handleMergeAllDuplicates = useCallback(
    async (fetchData: () => Promise<void>) => {
      const results = await Promise.allSettled(
        duplicateGroups.map((group) =>
          invoke("merge_duplicates", {
            primaryId: group.primary_id,
            duplicateIds: group.jobs.map((job) => job.id),
          }),
        ),
      );
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      const successCount = results.length - failures.length;

      await fetchData();

      if (failures.length === 0) {
        setDuplicateGroups([]);
        setDuplicatesModalOpen(false);
        toast.success(
          "All possible repeats hidden",
          `${duplicateGroups.length} groups cleaned up`,
        );
      } else if (successCount > 0) {
        logError("Partial merge failures:", failures.map((failure) => failure.reason));
        toast.warning(
          "Partially hidden",
          `${successCount} groups hidden. Try hiding the rest one at a time.`,
        );
      } else {
        logError("All merges failed:", failures.map((failure) => failure.reason));
        toast.error(
          "Could not hide possible repeats",
          "None of the possible repeat groups were hidden. Try hiding one group at a time, or copy a safe support report if this keeps happening.",
        );
      }
    },
    [duplicateGroups, toast],
  );

  return {
    checkingDuplicates,
    duplicateGroups,
    duplicatesModalOpen,
    handleCheckDuplicates,
    handleMergeAllDuplicates,
    handleMergeDuplicates,
    setDuplicateGroups,
    setDuplicatesModalOpen,
  };
}
