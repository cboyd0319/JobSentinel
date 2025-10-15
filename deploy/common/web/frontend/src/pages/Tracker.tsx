import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { TrackedJob } from '../types'
import { JobStatus } from '../types'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const statusColumns: { status: JobStatus; label: string; color: string; description: string }[] = [
  { status: JobStatus.BOOKMARKED, label: '📑 Bookmarked', color: 'bg-gray-100 dark:bg-gray-800', description: 'Jobs saved for later review' },
  { status: JobStatus.APPLIED, label: '📤 Applied', color: 'bg-blue-100 dark:bg-blue-900/20', description: 'Applications submitted' },
  { status: JobStatus.INTERVIEWING, label: '💬 Interviewing', color: 'bg-yellow-100 dark:bg-yellow-900/20', description: 'Active interview process' },
  { status: JobStatus.OFFER, label: '🎉 Offer', color: 'bg-green-100 dark:bg-green-900/20', description: 'Offers received' },
  { status: JobStatus.REJECTED, label: '❌ Rejected', color: 'bg-red-100 dark:bg-red-900/20', description: 'Rejected or not moving forward' },
]

export function Tracker() {
  const [activeJob, setActiveJob] = useState<TrackedJob | null>(null)
  const queryClient = useQueryClient()

  const { data: trackedJobs, isLoading } = useQuery<TrackedJob[]>({
    queryKey: ['tracked-jobs'],
    queryFn: () => api.get('/tracker/jobs'),
  })

  const updateJobStatus = useMutation({
    mutationFn: ({ jobId, status }: { jobId: number; status: JobStatus }) =>
      api.put(`/tracker/jobs/${jobId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-jobs'] })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getJobsByStatus = (status: JobStatus) => {
    return trackedJobs?.filter(job => job.status === status) || []
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const job = trackedJobs?.find(j => j.id === active.id)
    if (job) {
      setActiveJob(job)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Add visual feedback during drag
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)

    if (!over || active.id === over.id) return

    // Find the job being dragged
    const job = trackedJobs?.find(j => j.id === active.id)
    if (!job) return

    // Check if dropped on a new status column
    const newStatus = over.id as JobStatus
    if (Object.values(JobStatus).includes(newStatus) && job.status !== newStatus) {
      // Update job status
      updateJobStatus.mutate({ jobId: job.id, status: newStatus })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">📋 Application Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Drag and drop to update application status
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Applications: <span className="font-bold text-primary-600">{trackedJobs?.length || 0}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            💡 Drag cards between columns to update status
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading applications...</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusColumns.map((column) => {
              const jobs = getJobsByStatus(column.status)
              return (
                <KanbanColumn
                  key={column.status}
                  column={column}
                  jobs={jobs}
                />
              )
            })}
          </div>
          <DragOverlay>
            {activeJob ? <TrackedJobCard job={activeJob} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Quick Stats */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">📊 Application Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statusColumns.map((column) => {
            const count = getJobsByStatus(column.status).length
            const percentage = trackedJobs?.length ? ((count / trackedJobs.length) * 100).toFixed(0) : 0
            return (
              <div key={column.status} className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{column.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{percentage}%</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 How to Use</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>Click and drag</strong> job cards between columns to update status</li>
          <li>• <strong>Priority colors:</strong> Red (urgent), Orange (high), Yellow (medium), Green (low)</li>
          <li>• <strong>Keyboard navigation:</strong> Use Tab and Arrow keys, then press Space to pick up/drop</li>
        </ul>
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: { status: JobStatus; label: string; color: string; description: string }
  jobs: TrackedJob[]
}

function KanbanColumn({ column, jobs }: KanbanColumnProps) {
  return (
    <SortableContext items={[column.status]} strategy={verticalListSortingStrategy}>
      <div
        id={column.status}
        className="flex flex-col"
        role="region"
        aria-label={`${column.label} column`}
      >
        <div className={`${column.color} rounded-t-lg px-4 py-3 border-b-2 border-gray-300 dark:border-gray-600`}>
          <h3 className="font-semibold text-sm">
            {column.label}
            <span className="ml-2 text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
              {jobs.length}
            </span>
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{column.description}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-b-lg p-2 min-h-[400px] space-y-2 flex-1">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No applications
            </div>
          ) : (
            <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
              {jobs.map((job) => (
                <DraggableJobCard key={job.id} job={job} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </SortableContext>
  )
}

interface DraggableJobCardProps {
  job: TrackedJob
}

function DraggableJobCard({ job }: DraggableJobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TrackedJobCard job={job} isDragging={isDragging} />
    </div>
  )
}

interface TrackedJobCardProps {
  job: TrackedJob
  isDragging?: boolean
}

function TrackedJobCard({ job, isDragging = false }: TrackedJobCardProps) {
  const priorityColors = {
    1: 'border-red-500 bg-red-50 dark:bg-red-900/10',
    2: 'border-orange-500 bg-orange-50 dark:bg-orange-900/10',
    3: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
    4: 'border-green-500 bg-green-50 dark:bg-green-900/10',
    5: 'border-gray-500 bg-gray-50 dark:bg-gray-700',
  }

  const priorityLabels = {
    1: 'Urgent 🔥',
    2: 'High ⚡',
    3: 'Medium 📌',
    4: 'Low 📋',
    5: 'Backlog 📦',
  }

  const daysSinceApplied = job.applied_at
    ? Math.floor((Date.now() - new Date(job.applied_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div
      className={`
        ${priorityColors[job.priority as keyof typeof priorityColors] || 'border-gray-300 bg-white dark:bg-gray-800'}
        rounded-lg p-3 shadow-sm border-l-4
        hover:shadow-md transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? 'rotate-2 scale-105 shadow-lg' : ''}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Job ${job.job_id} - Priority ${job.priority}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm line-clamp-2 flex-1">
          Job #{job.job_id}
        </h4>
        <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 whitespace-nowrap ml-2">
          {priorityLabels[job.priority as keyof typeof priorityLabels] || 'N/A'}
        </span>
      </div>

      {job.notes && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 italic">
          "{job.notes}"
        </p>
      )}

      <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        {job.applied_at && (
          <div className="flex justify-between items-center">
            <span>📅 Applied</span>
            <span className="font-medium">
              {daysSinceApplied !== null && daysSinceApplied === 0
                ? 'Today'
                : daysSinceApplied === 1
                ? 'Yesterday'
                : `${daysSinceApplied}d ago`}
            </span>
          </div>
        )}
        {job.interview_at && (
          <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
            <span>💬 Interview</span>
            <span className="font-medium">
              {new Date(job.interview_at).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200 dark:border-gray-600 mt-1">
          <span>Updated</span>
          <span>{new Date(job.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
