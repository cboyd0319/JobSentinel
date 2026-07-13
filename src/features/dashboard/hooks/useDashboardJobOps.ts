// Dashboard Job Operations Hook
// Manages hide, bookmark, notes, bulk operations, duplicates, and comparison

import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Job } from "../types";
import { useToast } from "../../../shared/toast/useToast";
import { useUndo } from "../../../hooks/useUndo";
import { logError } from "../../../utils/errorUtils";
import { exportJobsToCSV } from "../../../utils/export";
import { invalidateCacheByCommand, safeInvokeWithToast } from "../../../utils/api";
import { getSafeErrorToastCopy } from "../../../utils/safeErrorCopy";
import { recordJobLearningSignal } from "../dashboardJobLearning";
import { useDashboardNotes } from "./useDashboardNotes";
import { useDashboardDuplicates } from "./useDashboardDuplicates";

export function useDashboardJobOps(
  jobs: Job[],
  setJobs: (jobs: Job[] | ((prev: Job[]) => Job[])) => void,
) {
  const notes = useDashboardNotes(jobs, setJobs);

  // Bulk selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const duplicates = useDashboardDuplicates(jobs, setJobs);

  // Comparison state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparedJobs, setComparedJobs] = useState<Job[]>([]);

  const toast = useToast();
  const { pushAction } = useUndo();

  const handleHideJob = useCallback(
    async (id: number) => {
      // Find the job before hiding for undo
      const hiddenJob = jobs.find((job) => job.id === id);
      if (!hiddenJob) return;

      try {
        await safeInvokeWithToast("hide_job", { id }, toast, {
          logContext: "Hide job",
        });
        // Invalidate cache since job list changed
        invalidateCacheByCommand("get_recent_jobs");
        invalidateCacheByCommand("get_statistics");
        recordJobLearningSignal("dismissed", hiddenJob);
        setJobs(jobs.filter((job) => job.id !== id));

        // Push undoable action
        pushAction({
          type: "hide",
          description: `Hidden: ${hiddenJob.title}`,
          undo: async () => {
            try {
              await invoke("unhide_job", { id });
              invalidateCacheByCommand("get_recent_jobs");
              invalidateCacheByCommand("get_statistics");
              setJobs((prev) => [hiddenJob, ...prev]);
            } catch (err) {
              logError("Failed to undo hide:", err);
              toast.error(
                "Could not undo change",
                "Hidden job was not restored. Check the job list, then copy a safe support report if this keeps happening.",
              );
            }
          },
          redo: async () => {
            try {
              await invoke("hide_job", { id });
              invalidateCacheByCommand("get_recent_jobs");
              invalidateCacheByCommand("get_statistics");
              setJobs((prev) => prev.filter((job) => job.id !== id));
            } catch (err) {
              logError("Failed to redo hide:", err);
              toast.error(
                "Could not redo change",
                "Job was not hidden again. Check the job list, then copy a safe support report if this keeps happening.",
              );
            }
          },
        });
      } catch {
        // Error already logged and shown to user
      }
    },
    [jobs, setJobs, toast, pushAction],
  );

  const handleToggleBookmark = useCallback(
    async (id: number) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;

      const previousState = Boolean(job.bookmarked);
      const optimisticState = !previousState;
      let confirmedState = optimisticState;

      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, bookmarked: optimisticState } : j,
        ),
      );

      try {
        const newState = await invoke<boolean>("toggle_bookmark", { id });
        confirmedState =
          typeof newState === "boolean" ? newState : optimisticState;

        if (confirmedState !== optimisticState) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === id ? { ...j, bookmarked: confirmedState } : j,
            ),
          );
        }

        if (confirmedState) {
          recordJobLearningSignal("bookmarked", job);
        }

        // Push undoable action
        pushAction({
          type: "bookmark",
          description: confirmedState
            ? `Bookmarked: ${job.title}`
            : `Unbookmarked: ${job.title}`,
          undo: async () => {
            try {
              await invoke<boolean>("toggle_bookmark", { id });
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === id ? { ...j, bookmarked: previousState } : j,
                ),
              );
            } catch (err) {
              logError("Failed to undo bookmark:", err);
              toast.error(
                "Could not undo change",
                "Bookmark was not restored. Check the job list, then copy a safe support report if this keeps happening.",
              );
            }
          },
          redo: async () => {
            try {
              await invoke<boolean>("toggle_bookmark", { id });
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === id ? { ...j, bookmarked: confirmedState } : j,
                ),
              );
            } catch (err) {
              logError("Failed to redo bookmark:", err);
              toast.error(
                "Could not redo change",
                "Bookmark was not changed again. Check the job list, then copy a safe support report if this keeps happening.",
              );
            }
          },
        });
      } catch (err) {
        logError("Failed to toggle bookmark:", err);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, bookmarked: previousState } : j,
          ),
        );
        toast.error(
          "Could not update bookmark",
          "Bookmark was not changed. Try again, or copy a safe support report if this keeps happening.",
        );
      }
    },
    [jobs, setJobs, pushAction, toast],
  );

  // Bulk selection handlers
  const toggleBulkMode = useCallback(() => {
    setBulkMode(!bulkMode);
    if (bulkMode) {
      setSelectedJobIds(new Set());
    }
  }, [bulkMode]);

  const toggleJobSelection = useCallback((id: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllJobs = useCallback((filteredJobs: Job[]) => {
    setSelectedJobIds(new Set(filteredJobs.map((j) => j.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJobIds(new Set());
  }, []);

  const handleBulkHide = useCallback(async () => {
    if (selectedJobIds.size === 0) return;

    const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id));
    const idsToHide = Array.from(selectedJobIds);

    // Hide all selected jobs — use allSettled so partial failures don't lose successful hides
    const results = await Promise.allSettled(
      idsToHide.map((id) => invoke("hide_job", { id })),
    );

    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    const succeededIds = idsToHide.filter(
      (_, i) => results[i]?.status === "fulfilled",
    );

    if (succeededIds.length > 0) {
      // Invalidate cache and update state for successful hides
      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      const succeededSet = new Set(succeededIds);
      const succeededJobs = selectedJobs.filter((j) => succeededSet.has(j.id));
      for (const job of succeededJobs) {
        recordJobLearningSignal("dismissed", job);
      }
      setJobs(jobs.filter((job) => !succeededSet.has(job.id)));
      setSelectedJobIds(new Set());

      // Push undoable action for the jobs that actually got hidden
      pushAction({
        type: "hide",
        description: `Hidden ${succeededIds.length} jobs`,
        undo: async () => {
          try {
            await Promise.allSettled(
              succeededIds.map((id) => invoke("unhide_job", { id })),
            );
            invalidateCacheByCommand("get_recent_jobs");
            invalidateCacheByCommand("get_statistics");
            setJobs((prev) => [...succeededJobs, ...prev]);
          } catch (err) {
            logError("Failed to undo bulk hide:", err);
            toast.error(
              "Could not undo change",
              "Some hidden jobs were not restored. Check the job list, then copy a safe support report if this keeps happening.",
            );
          }
        },
        redo: async () => {
          try {
            await Promise.allSettled(
              succeededIds.map((id) => invoke("hide_job", { id })),
            );
            invalidateCacheByCommand("get_recent_jobs");
            invalidateCacheByCommand("get_statistics");
            setJobs((prev) =>
              prev.filter((job) => !succeededIds.includes(job.id)),
            );
          } catch (err) {
            logError("Failed to redo bulk hide:", err);
            toast.error(
              "Could not redo change",
              "Some jobs were not hidden again. Check the job list, then copy a safe support report if this keeps happening.",
            );
          }
        },
      });
    }

    if (failures.length > 0) {
      logError(
        "Partial bulk hide failures:",
        failures.map((f) => f.reason),
      );
      if (failures.length === idsToHide.length) {
        toast.error(
          "Could not hide selected jobs",
          "None of the jobs were hidden. Try hiding one job at a time, or copy a safe support report if this keeps happening.",
        );
      } else {
        toast.warning(
          "Partially hidden",
          `${succeededIds.length} jobs hidden. Try hiding the rest one at a time.`,
        );
      }
    }
  }, [selectedJobIds, jobs, setJobs, toast, pushAction]);

  const handleBulkBookmark = useCallback(
    async (bookmark: boolean) => {
      if (selectedJobIds.size === 0) return;

      const idsToUpdate = Array.from(selectedJobIds);
      const previousStates = new Map(
        jobs
          .filter((j) => selectedJobIds.has(j.id))
          .map((j) => [j.id, j.bookmarked]),
      );

      try {
        // Update all selected jobs - we need to toggle each one to match the desired state
        for (const id of idsToUpdate) {
          const job = jobs.find((j) => j.id === id);
          if (job && job.bookmarked !== bookmark) {
            await invoke<boolean>("toggle_bookmark", { id });
          }
        }

        // Update local state
        if (bookmark) {
          for (const job of jobs.filter((j) => idsToUpdate.includes(j.id))) {
            recordJobLearningSignal("bookmarked", job);
          }
        }
        setJobs(
          jobs.map((j) =>
            selectedJobIds.has(j.id) ? { ...j, bookmarked: bookmark } : j,
          ),
        );

        toast.success(
          bookmark
            ? `Bookmarked ${idsToUpdate.length} jobs`
            : `Removed ${idsToUpdate.length} bookmarks`,
          "",
        );

        // Push undoable action
        pushAction({
          type: "bookmark",
          description: bookmark
            ? `Bookmarked ${idsToUpdate.length} jobs`
            : `Unbookmarked ${idsToUpdate.length} jobs`,
          undo: async () => {
            for (const id of idsToUpdate) {
              const wasBookmarked = previousStates.get(id);
              const currentJob = jobs.find((j) => j.id === id);
              if (currentJob && currentJob.bookmarked !== wasBookmarked) {
                await invoke<boolean>("toggle_bookmark", { id });
              }
            }
            setJobs((prev) =>
              prev.map((j) =>
                idsToUpdate.includes(j.id)
                  ? { ...j, bookmarked: previousStates.get(j.id) }
                  : j,
              ),
            );
          },
          redo: async () => {
            for (const id of idsToUpdate) {
              const job = jobs.find((j) => j.id === id);
              if (job && job.bookmarked !== bookmark) {
                await invoke<boolean>("toggle_bookmark", { id });
              }
            }
            setJobs((prev) =>
              prev.map((j) =>
                idsToUpdate.includes(j.id) ? { ...j, bookmarked: bookmark } : j,
              ),
            );
          },
        });
      } catch (err: unknown) {
        logError("Failed to bulk bookmark jobs:", err);
        const safeError = getSafeErrorToastCopy(err, {
          fallbackTitle: "Could not update bookmarks",
          fallbackMessage:
            "Your bookmarks weren't changed. Try bookmarking jobs individually. If this continues, copy a safe support report before closing and reopening JobSentinel.",
        });
        toast.error(
          safeError.title,
          safeError.message,
        );
      }
    },
    [selectedJobIds, jobs, setJobs, toast, pushAction],
  );

  const handleExportJobs = useCallback(
    (jobsToExport: Job[]) => {
      if (jobsToExport.length === 0) {
        toast.info("No jobs to download", "Change filters or select jobs first.");
        return;
      }

      exportJobsToCSV(jobsToExport);
      toast.success(
        `Downloaded ${jobsToExport.length} jobs`,
        "Job list downloaded to your computer.",
      );
    },
    [toast],
  );

  const handleBulkExport = useCallback(
    (filteredJobs: Job[]) => {
      const selectedJobs = filteredJobs.filter((j) => selectedJobIds.has(j.id));
      handleExportJobs(selectedJobs);
    },
    [selectedJobIds, handleExportJobs],
  );

  // Comparison handlers
  const handleCompareJobs = useCallback(() => {
    if (selectedJobIds.size < 2) {
      toast.error("Select jobs", "Select 2-3 jobs to compare");
      return;
    }
    if (selectedJobIds.size > 3) {
      toast.error("Too many jobs", "Select only 2-3 jobs to compare");
      return;
    }

    const jobsToCompare = jobs.filter((j) => selectedJobIds.has(j.id));
    setComparedJobs(jobsToCompare);
    setCompareModalOpen(true);
  }, [selectedJobIds, jobs, toast]);

  return {
    ...notes,

    // Job operations
    handleHideJob,
    handleToggleBookmark,

    // Bulk selection state
    bulkMode,
    setBulkMode,
    selectedJobIds,
    setSelectedJobIds,
    toggleBulkMode,
    toggleJobSelection,
    selectAllJobs,
    clearSelection,

    // Bulk operations
    handleBulkHide,
    handleBulkBookmark,
    handleExportJobs,
    handleBulkExport,

    ...duplicates,

    // Comparison state
    compareModalOpen,
    setCompareModalOpen,
    comparedJobs,
    handleCompareJobs,
  };
}
