import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../../../shared/toast/useToast";
import { useUndo } from "../../../shared/undo/useUndo";
import { invalidateCacheByCommand, safeInvokeWithToast } from "../../../utils/api";
import { logError } from "../../../utils/errorUtils";
import { recordJobLearningSignal } from "../dashboardJobLearning";
import type { Job } from "../types";

export function useDashboardNotes(
  jobs: Job[],
  setJobs: Dispatch<SetStateAction<Job[]>>,
) {
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");
  const toast = useToast();
  const { pushAction } = useUndo();

  const handleEditNotes = useCallback(
    (id: number, currentNotes?: string | null) => {
      setEditingJobId(id);
      setNotesText(currentNotes || "");
      setNotesModalOpen(true);
    },
    [],
  );

  const handleSaveNotes = useCallback(async () => {
    if (editingJobId === null) return;

    const job = jobs.find((item) => item.id === editingJobId);
    if (!job) return;

    const previousNotes = job.notes;
    const jobId = editingJobId;

    try {
      const notesToSave = notesText.trim() || null;
      await safeInvokeWithToast(
        "set_job_notes",
        { id: jobId, notes: notesToSave },
        toast,
        { logContext: "Save job notes" },
      );
      invalidateCacheByCommand("get_recent_jobs");
      if (notesToSave) recordJobLearningSignal("note", job);
      setJobs((previous) =>
        previous.map((item) =>
          item.id === jobId ? { ...item, notes: notesToSave } : item,
        ),
      );

      pushAction({
        type: "notes",
        description: notesToSave
          ? `Updated notes: ${job.title}`
          : `Removed notes: ${job.title}`,
        undo: async () => {
          try {
            await invoke("set_job_notes", { id: jobId, notes: previousNotes });
            invalidateCacheByCommand("get_recent_jobs");
            setJobs((previous) =>
              previous.map((item) =>
                item.id === jobId ? { ...item, notes: previousNotes } : item,
              ),
            );
          } catch (error) {
            logError("Failed to undo notes:", error);
            toast.error(
              "Could not undo change",
              "Previous notes were not restored. Check the notes, then copy a safe support report if this keeps happening.",
            );
          }
        },
        redo: async () => {
          try {
            await invoke("set_job_notes", { id: jobId, notes: notesToSave });
            invalidateCacheByCommand("get_recent_jobs");
            setJobs((previous) =>
              previous.map((item) =>
                item.id === jobId ? { ...item, notes: notesToSave } : item,
              ),
            );
          } catch (error) {
            logError("Failed to redo notes:", error);
            toast.error(
              "Could not redo change",
              "Notes were not reapplied. Check the notes, then copy a safe support report if this keeps happening.",
            );
          }
        },
      });

      setNotesModalOpen(false);
      setEditingJobId(null);
      setNotesText("");
    } catch {
      // Error already logged and shown to user.
    }
  }, [editingJobId, jobs, notesText, pushAction, setJobs, toast]);

  const handleCloseNotesModal = useCallback(() => {
    setNotesModalOpen(false);
    setEditingJobId(null);
    setNotesText("");
  }, []);

  return {
    editingJobId,
    handleCloseNotesModal,
    handleEditNotes,
    handleSaveNotes,
    notesModalOpen,
    notesText,
    setNotesText,
  };
}
