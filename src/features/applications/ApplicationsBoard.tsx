import { memo, useRef, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "../../ui/Badge";
import {
  STATUS_COLUMNS,
  type Application,
} from "./applicationsModel";

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
  const columnLabel = STATUS_COLUMNS.find((column) => column.key === app.status)?.label || app.status;

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
      onPointerDownCapture={(event) => {
        pointerStartRef.current =
          event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
      }}
      onPointerUpCapture={(event) => {
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!start || isDragging) return;

        const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (distance < 8) {
          onClick();
        }
      }}
      onClick={(event) => {
        if (!isDragging) {
          event.stopPropagation();
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
        <p className="mt-2 break-words text-xs text-surface-500 [overflow-wrap:anywhere] dark:text-surface-400">
          Note: {app.notes}
        </p>
      )}
    </div>
  );
});

export const DroppableColumn = memo(function DroppableColumn({
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
      className={`w-full min-w-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4 transition-shadow ${
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
        items={apps.map((application) => application.id)}
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

export function KanbanSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-900">
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
        <div className="grid gap-4 pb-4 md:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="w-full min-w-0 bg-surface-100 dark:bg-surface-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600 motion-safe:animate-pulse" />
                <div className="h-5 w-24 bg-surface-200 dark:bg-surface-700 rounded motion-safe:animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((itemIndex) => (
                  <div key={itemIndex} className="p-3 bg-white dark:bg-surface-700 rounded-lg">
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

export function QuickStat({
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
    <div className={`flex min-w-0 items-center gap-2 ${highlight && value > 0 ? "text-success" : "text-surface-600 dark:text-surface-300"}`}>
      <span className="shrink-0 text-base" aria-hidden="true">{icon}</span>
      <span className="min-w-0 break-words font-medium">{label}:</span>
      <span className={`font-semibold ${highlight && value > 0 ? "text-success" : "text-surface-900 dark:text-white"}`}>
        {value}
      </span>
      {percent !== undefined && (
        <span className="shrink-0 text-surface-400 dark:text-surface-500">
          ({percent}%)
        </span>
      )}
    </div>
  );
}
