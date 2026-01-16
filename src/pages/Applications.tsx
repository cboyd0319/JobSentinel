import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Card, Badge, LoadingSpinner } from "../components";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";

interface Application {
  id: number;
  job_hash: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string;
  notes: string | null;
  last_contact: string | null;
}

interface ApplicationsByStatus {
  saved: Application[];
  applied: Application[];
  phone_screen: Application[];
  technical: Application[];
  onsite: Application[];
  offer: Application[];
  accepted: Application[];
  rejected: Application[];
  withdrawn: Application[];
  ghosted: Application[];
}

interface PendingReminder {
  id: number;
  application_id: number;
  job_title: string;
  company: string;
  reminder_type: string;
  due_date: string;
}

interface ApplicationsProps {
  onBack: () => void;
}

const STATUS_COLUMNS = [
  { key: "saved", label: "Saved", color: "bg-surface-500" },
  { key: "applied", label: "Applied", color: "bg-blue-500" },
  { key: "phone_screen", label: "Phone Screen", color: "bg-purple-500" },
  { key: "technical", label: "Technical", color: "bg-indigo-500" },
  { key: "onsite", label: "Onsite", color: "bg-cyan-500" },
  { key: "offer", label: "Offer", color: "bg-green-500" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-500" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-orange-500" },
  { key: "ghosted", label: "Ghosted", color: "bg-surface-400" },
] as const;

export default function Applications({ onBack }: ApplicationsProps) {
  const [applications, setApplications] = useState<ApplicationsByStatus | null>(null);
  const [reminders, setReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appsData, remindersData] = await Promise.all([
        invoke<ApplicationsByStatus>("get_applications_kanban"),
        invoke<PendingReminder[]>("get_pending_reminders"),
      ]);
      setApplications(appsData);
      setReminders(remindersData);
    } catch (err) {
      logError("Failed to fetch applications:", err);
      toast.error("Failed to load applications", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (appId: number, newStatus: string) => {
    try {
      await invoke("update_application_status", { applicationId: appId, status: newStatus });
      toast.success("Status updated", `Application moved to ${newStatus}`);
      fetchData();
    } catch (err) {
      logError("Failed to update status:", err);
      toast.error("Failed to update status", getErrorMessage(err));
    }
  };

  const handleAddNotes = async () => {
    if (!selectedApp || !notes.trim()) return;
    try {
      await invoke("add_application_notes", { applicationId: selectedApp.id, notes });
      toast.success("Notes added", "Your notes have been saved");
      setNotes("");
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      logError("Failed to add notes:", err);
      toast.error("Failed to add notes", getErrorMessage(err));
    }
  };

  const handleCompleteReminder = async (reminderId: number) => {
    try {
      await invoke("complete_reminder", { reminderId });
      toast.success("Reminder completed", "Marked as done");
      fetchData();
    } catch (err) {
      logError("Failed to complete reminder:", err);
      toast.error("Failed to complete reminder", getErrorMessage(err));
    }
  };

  const handleDetectGhosted = async () => {
    try {
      const count = await invoke<number>("detect_ghosted_applications");
      toast.info("Ghosted detection complete", `${count} application(s) marked as ghosted`);
      fetchData();
    } catch (err) {
      logError("Failed to detect ghosted:", err);
      toast.error("Detection failed", getErrorMessage(err));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading applications..." />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                aria-label="Go back"
              >
                <BackIcon />
              </button>
              <div>
                <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                  Application Tracker
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Track your job applications through the hiring pipeline
                </p>
              </div>
            </div>
            <Button onClick={handleDetectGhosted} variant="secondary">
              Detect Ghosted
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Reminders */}
        {reminders.length > 0 && (
          <Card className="mb-6 dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Pending Reminders ({reminders.length})
            </h2>
            <div className="space-y-2">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-3 bg-alert-50 dark:bg-alert-900/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      {reminder.job_title} at {reminder.company}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {reminder.reminder_type} - Due: {formatDate(reminder.due_date)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCompleteReminder(reminder.id)}
                  >
                    Done
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUS_COLUMNS.map((column) => {
              const apps = applications?.[column.key as keyof ApplicationsByStatus] || [];
              return (
                <div
                  key={column.key}
                  className="w-72 flex-shrink-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-medium text-surface-800 dark:text-surface-200">
                      {column.label}
                    </h3>
                    <Badge variant="surface">{apps.length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {apps.map((app) => (
                      <Card
                        key={app.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow dark:bg-surface-700"
                        onClick={() => setSelectedApp(app)}
                      >
                        <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-1">
                          {app.job_title}
                        </h4>
                        <p className="text-sm text-surface-500 dark:text-surface-400 mb-2">
                          {app.company}
                        </p>
                        <p className="text-xs text-surface-400 dark:text-surface-500">
                          Applied: {formatDate(app.applied_at)}
                        </p>
                        {app.notes && (
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 truncate">
                            Note: {app.notes}
                          </p>
                        )}
                      </Card>
                    ))}

                    {apps.length === 0 && (
                      <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-4">
                        No applications
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg dark:bg-surface-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-display-md text-surface-900 dark:text-white">
                  {selectedApp.job_title}
                </h2>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                >
                  <CloseIcon />
                </button>
              </div>

              <p className="text-surface-600 dark:text-surface-400 mb-4">{selectedApp.company}</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Status
                </label>
                <select
                  value={selectedApp.status}
                  onChange={(e) => handleStatusChange(selectedApp.id, e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                >
                  {STATUS_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Add Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none"
                />
              </div>

              {selectedApp.notes && (
                <div className="mb-4 p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    Previous notes: {selectedApp.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setSelectedApp(null)} className="flex-1">
                  Close
                </Button>
                <Button onClick={handleAddNotes} disabled={!notes.trim()} className="flex-1">
                  Save Notes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
