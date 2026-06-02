import { useEffect, useState, useCallback, lazy, Suspense, useId, useMemo, memo, useRef, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cachedInvoke, invalidateCacheByCommand, safeInvokeWithToast } from "../utils/api";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { AnalyticsSkeleton, ModalSkeleton } from "../components/LoadingFallbacks";
import { useToast } from "../contexts";
import { useUndo } from "../hooks/useUndo";
import { logError } from "../utils/errorUtils";
import { formatEventDate } from "../utils/formatUtils";

// Lazy load heavy components to reduce initial bundle size
const AnalyticsPanel = lazy(() => import("../components/AnalyticsPanel").then(m => ({ default: m.AnalyticsPanel })));
const InterviewScheduler = lazy(() => import("../components/InterviewScheduler").then(m => ({ default: m.InterviewScheduler })));
const CoverLetterTemplates = lazy(() => import("../components/CoverLetterTemplates").then(m => ({ default: m.CoverLetterTemplates })));

interface Application {
  id: number;
  job_hash: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string | null;
  notes: string | null;
  last_contact: string | null;
}

interface ApplicationsByStatus {
  to_apply: Application[];
  applied: Application[];
  screening_call: Application[];
  phone_interview: Application[];
  technical_interview: Application[];
  onsite_interview: Application[];
  offer_received: Application[];
  offer_accepted: Application[];
  offer_rejected: Application[];
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
  reminder_time: string;
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow up",
  interview_prep: "Interview prep",
  deadline: "Deadline",
  offer_review: "Offer review",
  custom: "Reminder",
};

function formatReminderType(type: string): string {
  return REMINDER_TYPE_LABELS[type] ?? "Reminder";
}

interface ApplicationsProps {
  onBack: () => void;
  onImportJob?: () => void;
}

const STATUS_COLUMNS = [
  { key: "to_apply", label: "To Apply", color: "bg-surface-500" },
  { key: "applied", label: "Applied", color: "bg-blue-500" },
  { key: "screening_call", label: "Screening Call", color: "bg-purple-500" },
  { key: "phone_interview", label: "Phone Interview", color: "bg-violet-500" },
  { key: "technical_interview", label: "Skills Interview", color: "bg-indigo-500" },
  { key: "onsite_interview", label: "Onsite Interview", color: "bg-cyan-500" },
  { key: "offer_received", label: "Offer Received", color: "bg-success" },
  { key: "offer_accepted", label: "Offer Accepted", color: "bg-emerald-500" },
  { key: "offer_rejected", label: "Offer Declined", color: "bg-orange-500" },
  { key: "rejected", label: "Not Selected", color: "bg-danger" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-amber-500" },
  { key: "ghosted", label: "No Response", color: "bg-surface-400" },
] as const;

type StatusKey = typeof STATUS_COLUMNS[number]["key"];

// Sortable application card component - memoized to prevent re-renders
const SortableApplicationCard = memo(function SortableApplicationCard({
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
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Find the column this app is in for ARIA announcement
  const columnLabel = STATUS_COLUMNS.find(c => c.key === app.status)?.label || app.status;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid="application-card"
      role="button"
      aria-label={`${app.job_title} at ${app.company}. Status: ${columnLabel}. Press space to start dragging.`}
      aria-pressed={isDragging}
      aria-describedby={isDragging ? "drag-instructions" : undefined}
      className={`p-3 bg-white dark:bg-surface-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 ${
        isDragging ? "shadow-lg ring-2 ring-sentinel-500" : ""
      }`}
      onPointerDownCapture={(e) => {
        pointerStartRef.current =
          e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
      }}
      onPointerUpCapture={(e) => {
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!start || isDragging) return;

        const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (distance < 8) {
          onClick();
        }
      }}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <span data-testid="application-status" className="sr-only">
        {columnLabel}
      </span>
      <h4
        className="font-medium text-surface-800 dark:text-surface-200 mb-1"
        data-testid="application-position"
      >
        {app.job_title}
      </h4>
      <p
        className="text-sm text-surface-500 dark:text-surface-400 mb-2"
        data-testid="application-company"
      >
        {app.company}
      </p>
      <p
        className="text-xs text-surface-400 dark:text-surface-500"
        data-testid="application-date"
      >
        {app.applied_at ? `Applied: ${formatDate(app.applied_at)}` : "Not applied yet"}
      </p>
      {app.notes && (
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 truncate">
          Note: {app.notes}
        </p>
      )}
    </div>
  );
});

// Droppable column component - memoized to prevent re-renders
const DroppableColumn = memo(function DroppableColumn({
  column,
  apps,
  onCardClick,
  formatDate,
  showDropHint,
}: {
  column: typeof STATUS_COLUMNS[number];
  apps: Application[];
  onCardClick: (app: Application) => void;
  formatDate: (date: string) => string;
  showDropHint: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4 transition-shadow ${
        isOver ? "ring-2 ring-sentinel-500" : ""
      }`}
      data-testid="kanban-column"
      data-status={column.key}
    >
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

          {apps.length === 0 && showDropHint && (
            <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-4">
              Drop here
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
});

// Skeleton loader for initial load
function KanbanSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-lg motion-safe:animate-pulse" />
              <div>
                <div className="h-6 w-48 bg-surface-200 dark:bg-surface-700 rounded motion-safe:animate-pulse mb-2" />
                <div className="h-4 w-64 bg-surface-200 dark:bg-surface-700 rounded motion-safe:animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-32 bg-surface-200 dark:bg-surface-700 rounded-lg motion-safe:animate-pulse" />
          </div>
        </div>
      </header>
      <main className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600 motion-safe:animate-pulse" />
                <div className="h-5 w-24 bg-surface-200 dark:bg-surface-700 rounded motion-safe:animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="p-3 bg-white dark:bg-surface-700 rounded-lg">
                    <div className="h-4 w-full bg-surface-200 dark:bg-surface-600 rounded motion-safe:animate-pulse mb-2" />
                    <div className="h-3 w-2/3 bg-surface-200 dark:bg-surface-600 rounded motion-safe:animate-pulse" />
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

export default function Applications({ onBack, onImportJob }: ApplicationsProps) {
  const [applications, setApplications] = useState<ApplicationsByStatus | null>(null);
  const [reminders, setReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showInterviews, setShowInterviews] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const dragStartColumnRef = useRef<StatusKey | null>(null);
  const toast = useToast();
  const { pushAction } = useUndo();

  // Accessibility IDs (SSR-safe)
  const appStatusId = useId();
  const appNotesId = useId();

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
    } catch (err: unknown) {
      logError("Failed to fetch applications:", err);
      toast.error(
        "Could not load saved applications",
        "Save a safe support report if this keeps happening, then close and reopen JobSentinel."
      );
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
    const appId = event.active.id as number;
    setActiveId(appId);
    dragStartColumnRef.current = findColumnForApp(appId);
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
    const oldColumn = dragStartColumnRef.current;
    dragStartColumnRef.current = null;

    if (!over || !applications) return;

    const activeId = active.id as number;
    const newColumn = findColumnForApp(activeId);

    if (!newColumn || !oldColumn) return;
    if (newColumn === oldColumn) return;

    const app = STATUS_COLUMNS
      .flatMap((column) => applications[column.key])
      .find((candidate) => candidate.id === activeId);
    if (!app) return;

    // Persist the change to backend
    try {
      await safeInvokeWithToast("update_application_status", { applicationId: activeId, status: newColumn }, toast, {
        logContext: "Update application status",
      });
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_applications_kanban");
      const newLabel = STATUS_COLUMNS.find((c) => c.key === newColumn)?.label;

      // Push undoable action
      pushAction({
        type: "status",
        description: `Moved ${app.job_title} to ${newLabel}`,
        undo: async () => {
          await invoke("update_application_status", { applicationId: activeId, status: oldColumn });
          invalidateCacheByCommand("get_applications_kanban");
          fetchData();
        },
        redo: async () => {
          await invoke("update_application_status", { applicationId: activeId, status: newColumn });
          invalidateCacheByCommand("get_applications_kanban");
          fetchData();
        },
      });
    } catch {
      // Error already logged and shown to user via safeInvokeWithToast
      // Revert by refetching
      invalidateCacheByCommand("get_applications_kanban");
      fetchData();
    }
  };

  const handleAddNotes = async () => {
    if (!selectedApp || !notes.trim()) return;
    const appId = selectedApp.id;
    const appTitle = selectedApp.job_title;
    const previousNotes = selectedApp.notes;
    const newNotes = notes;

    try {
      await safeInvokeWithToast("add_application_notes", { applicationId: appId, notes: newNotes }, toast, {
        logContext: "Add application notes",
      });
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_applications_kanban");
      setNotes("");
      setSelectedApp(null);
      fetchData();

      // Push undoable action
      pushAction({
        type: "notes",
        description: `Updated notes for ${appTitle}`,
        undo: async () => {
          await invoke("add_application_notes", { applicationId: appId, notes: previousNotes });
          invalidateCacheByCommand("get_applications_kanban");
          fetchData();
        },
        redo: async () => {
          await invoke("add_application_notes", { applicationId: appId, notes: newNotes });
          invalidateCacheByCommand("get_applications_kanban");
          fetchData();
        },
      });
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleCompleteReminder = async (reminderId: number) => {
    try {
      await safeInvokeWithToast("complete_reminder", { reminderId }, toast, {
        logContext: "Complete reminder",
      });
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_pending_reminders");
      toast.success("Reminder completed", "Marked as done");
      fetchData();
    } catch {
      // Error already logged and shown to user
    }
  };

  const handleReviewNoResponses = async () => {
    try {
      const count = await safeInvokeWithToast<number>("detect_ghosted_applications", undefined, toast, {
        logContext: "Review no-response applications",
      });
      // Invalidate cache after mutation
      invalidateCacheByCommand("get_applications_kanban");
      toast.info("No-response review complete", `${count} application(s) moved to No Response`);
      fetchData();
    } catch {
      // Error already logged and shown to user
    }
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

  // Memoized application stats to avoid recalculating on every render
  const stats = useMemo(() => {
    if (!applications) return null;

    const totalApplied =
      applications.applied.length +
      applications.screening_call.length +
      applications.phone_interview.length +
      applications.technical_interview.length +
      applications.onsite_interview.length +
      applications.offer_received.length +
      applications.offer_accepted.length +
      applications.offer_rejected.length +
      applications.rejected.length +
      applications.withdrawn.length +
      applications.ghosted.length;

    const interviews =
      applications.screening_call.length +
      applications.phone_interview.length +
      applications.technical_interview.length +
      applications.onsite_interview.length;

    const interviewsPlusOffers = interviews +
      applications.offer_received.length +
      applications.offer_accepted.length +
      applications.offer_rejected.length;

    const offers =
      applications.offer_received.length +
      applications.offer_accepted.length +
      applications.offer_rejected.length;

    const rejected =
      applications.rejected.length + applications.offer_rejected.length;

    const inProgress =
      applications.applied.length +
      interviews +
      applications.offer_received.length;

    const interviewRate = totalApplied > 0
      ? Math.round((interviewsPlusOffers / totalApplied) * 100)
      : 0;

    const offerRate = totalApplied > 0
      ? Math.round((offers / totalApplied) * 100)
      : 0;

    return {
      totalApplied,
      interviews,
      offers,
      rejected,
      inProgress,
      interviewRate,
      offerRate,
    };
  }, [applications]);

  const hasAnyApplications = useMemo(() => {
    if (!applications) return false;
    return STATUS_COLUMNS.some((column) => applications[column.key].length > 0);
  }, [applications]);

  if (loading) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Hidden instructions for screen readers during drag */}
      <div id="drag-instructions" className="sr-only" aria-live="polite">
        Use arrow keys to move between columns. Press space or enter to drop.
      </div>

      {/* Live region for drag announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {activeId && getActiveApp() && (
          `Moving ${getActiveApp()?.job_title} at ${getActiveApp()?.company}`
        )}
      </div>

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
                  Move cards between columns, or use Space and arrow keys to update status
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowTemplates(true)} variant="secondary">
                <TemplateIcon />
                Templates
              </Button>
              <Button onClick={() => setShowInterviews(true)} variant="secondary">
                <CalendarIcon />
                Interviews
              </Button>
              <Button onClick={() => setShowAnalytics(true)} variant="secondary">
                <AnalyticsIcon />
                Analytics
              </Button>
              <Button onClick={handleReviewNoResponses} variant="secondary">
                Review No Responses
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats Bar */}
      {stats && (
        <div className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 px-6 py-3">
          <div className="flex items-center gap-6 text-sm">
            <QuickStat
              label="Applied"
              value={stats.totalApplied}
              icon={<AppliedIcon />}
            />
            <QuickStat
              label="Interviews"
              value={stats.interviews}
              percent={stats.interviewRate}
              icon={<PhoneStatIcon />}
            />
            <QuickStat
              label="Offers"
              value={stats.offers}
              percent={stats.offerRate}
              icon={<OfferIcon />}
              highlight
            />
            <QuickStat
              label="In Progress"
              value={stats.inProgress}
              icon={<ProgressIcon />}
            />
          </div>
        </div>
      )}

      <main className="p-6">
        {/* Reminders */}
        {reminders.length > 0 && (
          <Card className="mb-6 dark:bg-surface-800" data-testid="pending-reminders">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Pending Reminders ({reminders.length})
            </h2>
            <div className="space-y-2">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  data-testid="pending-reminder"
                  className="flex items-center justify-between p-3 bg-alert-50 dark:bg-alert-900/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      {reminder.job_title} at {reminder.company}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {formatReminderType(reminder.reminder_type)} due: {formatEventDate(reminder.reminder_time)}
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
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4" data-testid="kanban-board">
            {!hasAnyApplications && (
              <Card
                className="mb-4 max-w-xl dark:bg-surface-800"
                role="status"
                aria-live="polite"
              >
                <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-2">
                  No applications tracked yet
                </h2>
                <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                  Save or import a job to start tracking it here.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={onBack}>Go to Jobs</Button>
                  {onImportJob && (
                    <Button onClick={onImportJob} variant="secondary">
                      Import Job
                    </Button>
                  )}
                </div>
              </Card>
            )}
            <div className="flex gap-4 min-w-max">
              {STATUS_COLUMNS.map((column) => {
                const apps = applications?.[column.key as keyof ApplicationsByStatus] || [];
                return (
                  <DroppableColumn
                    key={column.key}
                    column={column}
                    apps={apps}
                    onCardClick={setSelectedApp}
                    formatDate={formatEventDate}
                    showDropHint={hasAnyApplications}
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
          data-testid="application-detail-dialog"
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
                <label htmlFor={appStatusId} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Status
                </label>
                <select
                  id={appStatusId}
                  value={selectedApp.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      await invoke("update_application_status", { applicationId: selectedApp.id, status: newStatus });
                      invalidateCacheByCommand("get_applications_kanban");
                      const newLabel = STATUS_COLUMNS.find((col) => col.key === newStatus)?.label ?? newStatus;
                      toast.success("Status updated", `Application moved to ${newLabel}`);
                      setSelectedApp({ ...selectedApp, status: newStatus });
                      fetchData();
                    } catch (err: unknown) {
                      logError("Failed to update status:", err);
                      toast.error(
                        "Could not update status",
                        "The application status wasn't changed. Try again, or copy a safe support report before closing and reopening JobSentinel."
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus-visible:ring-2 focus-visible:ring-sentinel-500 focus:border-sentinel-500"
                >
                  {STATUS_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor={appNotesId} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Add Notes
                </label>
                <textarea
                  id={appNotesId}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus:border-sentinel-500"
                />
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 text-right">
                  {notes.length}/500 characters
                </p>
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
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsPanel onClose={() => setShowAnalytics(false)} />
        </Suspense>
      )}

      {/* Interview Scheduler */}
      {showInterviews && applications && (
        <Suspense fallback={<ModalSkeleton />}>
          <InterviewScheduler
            onClose={() => setShowInterviews(false)}
            applications={Object.values(applications)
              .flat()
              .map((app) => ({
                id: app.id,
                job_title: app.job_title,
                company: app.company,
              }))}
          />
        </Suspense>
      )}

      {/* Cover Letter Templates */}
      {showTemplates && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTemplates(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowTemplates(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="templates-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 id="templates-title" className="sr-only">Cover Letter Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="ml-auto p-2 text-white hover:text-surface-300 transition-colors"
                aria-label="Close templates"
              >
                <CloseIcon />
              </button>
            </div>
            <Suspense fallback={<ModalSkeleton />}>
              <CoverLetterTemplates />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick stats display component
function QuickStat({
  label,
  value,
  percent,
  icon,
  highlight = false,
}: {
  label: string;
  value: number;
  percent?: number;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${highlight && value > 0 ? "text-success" : "text-surface-600 dark:text-surface-300"}`}>
      <span className="text-base" aria-hidden="true">{icon}</span>
      <span className="font-medium">{label}:</span>
      <span className={`font-semibold ${highlight && value > 0 ? "text-success" : "text-surface-900 dark:text-white"}`}>
        {value}
      </span>
      {percent !== undefined && (
        <span className="text-surface-400 dark:text-surface-500">
          ({percent}%)
        </span>
      )}
    </div>
  );
}

function AppliedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2z" />
    </svg>
  );
}

function PhoneStatIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.3a1 1 0 01.95.68l1 3a1 1 0 01-.25 1.03l-1.4 1.4a12 12 0 005.3 5.3l1.4-1.4a1 1 0 011.03-.25l3 1a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C8.8 21 3 15.2 3 8V5z" />
    </svg>
  );
}

function OfferIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.05 3.55a1 1 0 011.9 0l1.62 4.98a1 1 0 00.95.69h5.24a1 1 0 01.59 1.81l-4.24 3.08a1 1 0 00-.36 1.12l1.62 4.98a1 1 0 01-1.54 1.12l-4.24-3.08a1 1 0 00-1.18 0l-4.24 3.08a1 1 0 01-1.54-1.12l1.62-4.98a1 1 0 00-.36-1.12l-4.24-3.08a1 1 0 01.59-1.81h5.24a1 1 0 00.95-.69l1.62-4.98z" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
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

function CalendarIcon() {
  return (
    <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
