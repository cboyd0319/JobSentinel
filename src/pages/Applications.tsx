import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cachedInvoke, invalidateCacheByCommand } from "../utils/api";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, Badge, AnalyticsPanel } from "../components";
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

type StatusKey = typeof STATUS_COLUMNS[number]["key"];

// Sortable application card component
function SortableApplicationCard({
  app,
  onClick,
  formatDate,
}: {
  app: Application;
  onClick: () => void;
  formatDate: (date: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 bg-white dark:bg-surface-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-sentinel-500" : ""
      }`}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
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
    </div>
  );
}

// Droppable column component
function DroppableColumn({
  column,
  apps,
  onCardClick,
  formatDate,
}: {
  column: typeof STATUS_COLUMNS[number];
  apps: Application[];
  onCardClick: (app: Application) => void;
  formatDate: (date: string) => string;
}) {
  return (
    <div className="w-72 flex-shrink-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${column.color}`} />
        <h3 className="font-medium text-surface-800 dark:text-surface-200">
          {column.label}
        </h3>
        <Badge variant="surface">{apps.length}</Badge>
      </div>

      <SortableContext
        items={apps.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[100px]">
          {apps.map((app) => (
            <SortableApplicationCard
              key={app.id}
              app={app}
              onClick={() => onCardClick(app)}
              formatDate={formatDate}
            />
          ))}

          {apps.length === 0 && (
            <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-4">
              Drop here
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Skeleton loader for initial load
function KanbanSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse" />
              <div>
                <div className="h-6 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-32 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>
      <main className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600 animate-pulse" />
                <div className="h-5 w-24 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="p-3 bg-white dark:bg-surface-700 rounded-lg">
                    <div className="h-4 w-full bg-surface-200 dark:bg-surface-600 rounded animate-pulse mb-2" />
                    <div className="h-3 w-2/3 bg-surface-200 dark:bg-surface-600 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function Applications({ onBack }: ApplicationsProps) {
  const [applications, setApplications] = useState<ApplicationsByStatus | null>(null);
  const [reminders, setReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Use cached invoke with short TTL (5s) - data changes frequently via drag/drop
      const [appsData, remindersData] = await Promise.all([
        cachedInvoke<ApplicationsByStatus>("get_applications_kanban", undefined, 5_000),
        cachedInvoke<PendingReminder[]>("get_pending_reminders", undefined, 10_000),
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

  const findColumnForApp = (appId: number): StatusKey | null => {
    if (!applications) return null;
    for (const column of STATUS_COLUMNS) {
      const apps = applications[column.key as keyof ApplicationsByStatus];
      if (apps.some((a) => a.id === appId)) {
        return column.key;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !applications) return;

    const activeId = active.id as number;
    const overId = over.id;

    const activeColumn = findColumnForApp(activeId);

    // Check if we're over a column (the column has the status key as id)
    const overColumn = STATUS_COLUMNS.find((c) => c.key === overId)?.key || findColumnForApp(overId as number);

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    // Move the item to the new column optimistically
    setApplications((prev) => {
      if (!prev) return prev;

      const activeApp = prev[activeColumn].find((a) => a.id === activeId);
      if (!activeApp) return prev;

      return {
        ...prev,
        [activeColumn]: prev[activeColumn].filter((a) => a.id !== activeId),
        [overColumn]: [...prev[overColumn], { ...activeApp, status: overColumn }],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !applications) return;

    const activeId = active.id as number;
    const newColumn = findColumnForApp(activeId);

    if (!newColumn) return;

    // Persist the change to backend
    try {
      await invoke("update_application_status", { applicationId: activeId, status: newColumn });
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_applications_kanban");
      toast.success("Status updated", `Application moved to ${STATUS_COLUMNS.find((c) => c.key === newColumn)?.label}`);
    } catch (err) {
      logError("Failed to update status:", err);
      toast.error("Failed to update status", getErrorMessage(err));
      // Revert by refetching
      invalidateCacheByCommand("get_applications_kanban");
      fetchData();
    }
  };

  const handleAddNotes = async () => {
    if (!selectedApp || !notes.trim()) return;
    try {
      await invoke("add_application_notes", { applicationId: selectedApp.id, notes });
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_applications_kanban");
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
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_pending_reminders");
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
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_applications_kanban");
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

  const getActiveApp = (): Application | null => {
    if (!activeId || !applications) return null;
    for (const column of STATUS_COLUMNS) {
      const app = applications[column.key as keyof ApplicationsByStatus].find(
        (a) => a.id === activeId
      );
      if (app) return app;
    }
    return null;
  };

  if (loading) {
    return <KanbanSkeleton />;
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
                  Drag cards between columns to update status
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowAnalytics(true)} variant="secondary">
                <AnalyticsIcon />
                Analytics
              </Button>
              <Button onClick={handleDetectGhosted} variant="secondary">
                Detect Ghosted
              </Button>
            </div>
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

        {/* Drag and Drop Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {STATUS_COLUMNS.map((column) => {
                const apps = applications?.[column.key as keyof ApplicationsByStatus] || [];
                return (
                  <DroppableColumn
                    key={column.key}
                    column={column}
                    apps={apps}
                    onCardClick={setSelectedApp}
                    formatDate={formatDate}
                  />
                );
              })}
            </div>
          </div>

          {/* Drag Overlay - shows the card being dragged */}
          <DragOverlay>
            {activeId ? (
              <div className="p-3 bg-white dark:bg-surface-700 rounded-lg shadow-xl ring-2 ring-sentinel-500 cursor-grabbing">
                <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-1">
                  {getActiveApp()?.job_title}
                </h4>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {getActiveApp()?.company}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedApp(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedApp(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <Card className="w-full max-w-lg dark:bg-surface-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 id="modal-title" className="font-display text-display-md text-surface-900 dark:text-white">
                  {selectedApp.job_title}
                </h2>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </button>
              </div>

              <p className="text-surface-600 dark:text-surface-400 mb-4">{selectedApp.company}</p>

              <div className="mb-4">
                <label htmlFor="app-status" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Status
                </label>
                <select
                  id="app-status"
                  value={selectedApp.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      await invoke("update_application_status", { applicationId: selectedApp.id, status: newStatus });
                      toast.success("Status updated", `Application moved to ${newStatus}`);
                      setSelectedApp({ ...selectedApp, status: newStatus });
                      fetchData();
                    } catch (err) {
                      logError("Failed to update status:", err);
                      toast.error("Failed to update status", getErrorMessage(err));
                    }
                  }}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-sentinel-500 focus:border-sentinel-500"
                >
                  {STATUS_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="app-notes" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Add Notes
                </label>
                <textarea
                  id="app-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none focus:ring-2 focus:ring-sentinel-500 focus:border-sentinel-500"
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

      {/* Analytics Panel */}
      {showAnalytics && (
        <AnalyticsPanel onClose={() => setShowAnalytics(false)} />
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

function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
