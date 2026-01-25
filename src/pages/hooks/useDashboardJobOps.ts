// Dashboard Job Operations Hook
// Manages hide, bookmark, notes, bulk operations, duplicates, and comparison

import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Job, DuplicateGroup } from "../DashboardTypes";
import { useToast } from "../../contexts";
import { useUndo } from "../../contexts/UndoContext";
import { logError } from "../../utils/errorUtils";
import { exportJobsToCSV } from "../../utils/export";
import { invalidateCacheByCommand, safeInvokeWithToast } from "../../utils/api";

export function useDashboardJobOps(jobs: Job[], setJobs: (jobs: Job[] | ((prev: Job[]) => Job[])) => void) {
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");

  // Bulk selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Deduplication state
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Comparison state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparedJobs, setComparedJobs] = useState<Job[]>([]);

  const toast = useToast();
  const { pushAction } = useUndo();

  const handleHideJob = useCallback(async (id: number) => {
    // Find the job before hiding for undo
    const hiddenJob = jobs.find((job) => job.id === id);
    if (!hiddenJob) return;

    try {
      await safeInvokeWithToast("hide_job", { id }, toast, { logContext: "Hide job" });
      // Invalidate cache since job list changed
      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      setJobs(jobs.filter((job) => job.id !== id));

      // Push undoable action
      pushAction({
        type: "hide",
        description: `Hidden: ${hiddenJob.title}`,
        undo: async () => {
          await invoke("unhide_job", { id });
          invalidateCacheByCommand("get_recent_jobs");
          invalidateCacheByCommand("get_statistics");
          // Re-add the job to the list
          setJobs((prev) => [hiddenJob, ...prev]);
        },
        redo: async () => {
          await invoke("hide_job", { id });
          invalidateCacheByCommand("get_recent_jobs");
          invalidateCacheByCommand("get_statistics");
          setJobs((prev) => prev.filter((job) => job.id !== id));
        },
      });
    } catch {
      // Error already logged and shown to user
    }
  }, [jobs, setJobs, toast, pushAction]);

  const handleToggleBookmark = useCallback(async (id: number) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;

    const previousState = job.bookmarked;

    try {
      const newState = await invoke<boolean>("toggle_bookmark", { id });
      // Update local state optimistically
      setJobs(jobs.map((j) =>
        j.id === id ? { ...j, bookmarked: newState } : j
      ));

      // Push undoable action
      pushAction({
        type: "bookmark",
        description: newState ? `Bookmarked: ${job.title}` : `Unbookmarked: ${job.title}`,
        undo: async () => {
          await invoke<boolean>("toggle_bookmark", { id });
          setJobs((prev) => prev.map((j) =>
            j.id === id ? { ...j, bookmarked: previousState } : j
          ));
        },
        redo: async () => {
          await invoke<boolean>("toggle_bookmark", { id });
          setJobs((prev) => prev.map((j) =>
            j.id === id ? { ...j, bookmarked: newState } : j
          ));
        },
      });
    } catch {
      // Error already logged and shown to user via safeInvokeWithToast (used in undo/redo actions)
    }
  }, [jobs, setJobs, pushAction]);

  const handleEditNotes = useCallback((id: number, currentNotes?: string | null) => {
    setEditingJobId(id);
    setNotesText(currentNotes || "");
    setNotesModalOpen(true);
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (editingJobId === null) return;

    const job = jobs.find((j) => j.id === editingJobId);
    if (!job) return;

    const previousNotes = job.notes;
    const jobId = editingJobId;

    try {
      const notesToSave = notesText.trim() || null;
      await safeInvokeWithToast("set_job_notes", { id: jobId, notes: notesToSave }, toast, {
        logContext: "Save job notes",
      });
      // Update local state
      setJobs(jobs.map((j) =>
        j.id === jobId ? { ...j, notes: notesToSave } : j
      ));

      // Push undoable action
      pushAction({
        type: "notes",
        description: notesToSave ? `Updated notes: ${job.title}` : `Removed notes: ${job.title}`,
        undo: async () => {
          await invoke("set_job_notes", { id: jobId, notes: previousNotes });
          setJobs((prev) => prev.map((j) =>
            j.id === jobId ? { ...j, notes: previousNotes } : j
          ));
        },
        redo: async () => {
          await invoke("set_job_notes", { id: jobId, notes: notesToSave });
          setJobs((prev) => prev.map((j) =>
            j.id === jobId ? { ...j, notes: notesToSave } : j
          ));
        },
      });

      setNotesModalOpen(false);
      setEditingJobId(null);
      setNotesText("");
    } catch {
      // Error already logged and shown to user
    }
  }, [editingJobId, notesText, jobs, setJobs, toast, pushAction]);

  const handleCloseNotesModal = useCallback(() => {
    setNotesModalOpen(false);
    setEditingJobId(null);
    setNotesText("");
  }, []);

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

    try {
      // Hide all selected jobs
      await Promise.all(idsToHide.map((id) => invoke("hide_job", { id })));

      // Invalidate cache and update state
      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      setJobs(jobs.filter((job) => !selectedJobIds.has(job.id)));
      setSelectedJobIds(new Set());

      // Push undoable action
      pushAction({
        type: "hide",
        description: `Hidden ${selectedJobs.length} jobs`,
        undo: async () => {
          await Promise.all(idsToHide.map((id) => invoke("unhide_job", { id })));
          invalidateCacheByCommand("get_recent_jobs");
          invalidateCacheByCommand("get_statistics");
          setJobs((prev) => [...selectedJobs, ...prev]);
        },
        redo: async () => {
          await Promise.all(idsToHide.map((id) => invoke("hide_job", { id })));
          invalidateCacheByCommand("get_recent_jobs");
          invalidateCacheByCommand("get_statistics");
          setJobs((prev) => prev.filter((job) => !idsToHide.includes(job.id)));
        },
      });
    } catch (err: unknown) {
      // Log and show user-friendly error
      logError("Failed to bulk hide jobs:", err);
      const enhancedError = err as Error & {
        userFriendly?: { title: string; message: string; action?: string };
      };
      toast.error(
        enhancedError.userFriendly?.title || "Bulk Hide Failed",
        enhancedError.userFriendly?.message ||
          "The jobs are still visible. Try hiding them one at a time, or refresh the page and try again."
      );
    }
  }, [selectedJobIds, jobs, setJobs, toast, pushAction]);

  const handleBulkBookmark = useCallback(async (bookmark: boolean) => {
    if (selectedJobIds.size === 0) return;

    const idsToUpdate = Array.from(selectedJobIds);
    const previousStates = new Map(
      jobs.filter((j) => selectedJobIds.has(j.id)).map((j) => [j.id, j.bookmarked])
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
      setJobs(jobs.map((j) =>
        selectedJobIds.has(j.id) ? { ...j, bookmarked: bookmark } : j
      ));

      toast.success(
        bookmark ? `Bookmarked ${idsToUpdate.length} jobs` : `Removed ${idsToUpdate.length} bookmarks`,
        ""
      );

      // Push undoable action
      pushAction({
        type: "bookmark",
        description: bookmark ? `Bookmarked ${idsToUpdate.length} jobs` : `Unbookmarked ${idsToUpdate.length} jobs`,
        undo: async () => {
          for (const id of idsToUpdate) {
            const wasBookmarked = previousStates.get(id);
            const currentJob = jobs.find((j) => j.id === id);
            if (currentJob && currentJob.bookmarked !== wasBookmarked) {
              await invoke<boolean>("toggle_bookmark", { id });
            }
          }
          setJobs((prev) => prev.map((j) =>
            idsToUpdate.includes(j.id) ? { ...j, bookmarked: previousStates.get(j.id) } : j
          ));
        },
        redo: async () => {
          for (const id of idsToUpdate) {
            const job = jobs.find((j) => j.id === id);
            if (job && job.bookmarked !== bookmark) {
              await invoke<boolean>("toggle_bookmark", { id });
            }
          }
          setJobs((prev) => prev.map((j) =>
            idsToUpdate.includes(j.id) ? { ...j, bookmarked: bookmark } : j
          ));
        },
      });
    } catch (err: unknown) {
      logError("Failed to bulk bookmark jobs:", err);
      const enhancedError = err as Error & {
        userFriendly?: { title: string; message: string; action?: string };
      };
      toast.error(
        enhancedError.userFriendly?.title || "Bulk Bookmark Failed",
        enhancedError.userFriendly?.message ||
          "Your bookmarks weren't changed. Try bookmarking jobs individually, or restart the app if this continues."
      );
    }
  }, [selectedJobIds, jobs, setJobs, toast, pushAction]);

  const handleBulkExport = useCallback((filteredJobs: Job[]) => {
    const selectedJobs = filteredJobs.filter((j) => selectedJobIds.has(j.id));
    if (selectedJobs.length === 0) return;
    exportJobsToCSV(selectedJobs);
    toast.success(`Exported ${selectedJobs.length} jobs`, "CSV file downloaded");
  }, [selectedJobIds, toast]);

  // Deduplication handlers
  const handleCheckDuplicates = useCallback(async () => {
    try {
      setCheckingDuplicates(true);
      const groups = await safeInvokeWithToast<DuplicateGroup[]>("find_duplicates", undefined, toast, {
        logContext: "Find duplicate jobs",
      });
      setDuplicateGroups(groups);
      setDuplicatesModalOpen(true);

      if (groups.length === 0) {
        toast.success("No duplicates", "All jobs are unique");
      } else {
        toast.info("Duplicates found", `${groups.length} duplicate groups detected`);
      }
    } catch {
      // Error already logged and shown to user
    } finally {
      setCheckingDuplicates(false);
    }
  }, [toast]);

  const handleMergeDuplicates = useCallback(async (primaryId: number, duplicateIds: number[]) => {
    try {
      await safeInvokeWithToast("merge_duplicates", { primaryId, duplicateIds }, toast, {
        logContext: "Merge duplicate jobs",
      });

      // Remove merged jobs from the list
      setJobs(jobs.filter((j) => j.id === primaryId || !duplicateIds.includes(j.id)));

      // Remove the group from duplicateGroups
      setDuplicateGroups((prev) => prev.filter((g) => g.primary_id !== primaryId));

      toast.success("Duplicates merged", "Keeping highest-scoring version");

      // Invalidate cache
      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
    } catch {
      // Error already logged and shown to user
    }
  }, [jobs, setJobs, toast]);

  const handleMergeAllDuplicates = useCallback(async (fetchData: () => Promise<void>) => {
    try {
      for (const group of duplicateGroups) {
        const duplicateIds = group.jobs.map((j) => j.id);
        await invoke("merge_duplicates", {
          primaryId: group.primary_id,
          duplicateIds,
        });
      }

      // Refresh job list
      await fetchData();
      setDuplicateGroups([]);
      setDuplicatesModalOpen(false);

      toast.success("All duplicates merged", `${duplicateGroups.length} groups cleaned up`);
    } catch (err: unknown) {
      logError("Failed to merge all duplicates:", err);
      const enhancedError = err as Error & {
        userFriendly?: { title: string; message: string; action?: string };
      };
      toast.error(
        enhancedError.userFriendly?.title || "Bulk Merge Failed",
        enhancedError.userFriendly?.message ||
          "Some duplicates might have been merged. Refresh the page to see what changed, then try merging the rest individually."
      );
    }
  }, [duplicateGroups, toast]);

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
    // Notes state
    notesModalOpen,
    editingJobId,
    notesText,
    setNotesText,
    handleEditNotes,
    handleSaveNotes,
    handleCloseNotesModal,

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
    handleBulkExport,

    // Deduplication state
    duplicatesModalOpen,
    setDuplicatesModalOpen,
    duplicateGroups,
    setDuplicateGroups,
    checkingDuplicates,
    handleCheckDuplicates,
    handleMergeDuplicates,
    handleMergeAllDuplicates,

    // Comparison state
    compareModalOpen,
    setCompareModalOpen,
    comparedJobs,
    handleCompareJobs,
  };
}
