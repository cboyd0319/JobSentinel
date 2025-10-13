import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { TrackedJob, JobStatus } from '../types'

const statusColumns: { status: JobStatus; label: string; color: string }[] = [
  { status: JobStatus.BOOKMARKED, label: '📑 Bookmarked', color: 'bg-gray-100 dark:bg-gray-800' },
  { status: JobStatus.APPLIED, label: '📤 Applied', color: 'bg-blue-100 dark:bg-blue-900/20' },
  { status: JobStatus.INTERVIEWING, label: '💬 Interviewing', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  { status: JobStatus.OFFER, label: '🎉 Offer', color: 'bg-green-100 dark:bg-green-900/20' },
  { status: JobStatus.REJECTED, label: '❌ Rejected', color: 'bg-red-100 dark:bg-red-900/20' },
]

export function Tracker() {
  const { data: trackedJobs, isLoading } = useQuery<TrackedJob[]>({
    queryKey: ['tracked-jobs'],
    queryFn: () => api.get('/tracker/jobs'),
  })

  const getJobsByStatus = (status: JobStatus) => {
    return trackedJobs?.filter(job => job.status === status) || []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">📋 Application Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your job applications with a Kanban board
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Applications: <span className="font-bold text-primary-600">{trackedJobs?.length || 0}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusColumns.map((column) => {
            const jobs = getJobsByStatus(column.status)
            return (
              <div key={column.status} className="flex flex-col">
                <div className={`${column.color} rounded-t-lg px-4 py-3 border-b-2 border-gray-300 dark:border-gray-600`}>
                  <h3 className="font-semibold text-sm">
                    {column.label}
                    <span className="ml-2 text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                      {jobs.length}
                    </span>
                  </h3>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-b-lg p-2 min-h-[400px] space-y-2 flex-1">
                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No applications
                    </div>
                  ) : (
                    jobs.map((job) => (
                      <TrackedJobCard key={job.id} job={job} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statusColumns.map((column) => {
            const count = getJobsByStatus(column.status).length
            return (
              <div key={column.status} className="text-center">
                <p className="text-3xl font-bold text-primary-600">{count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{column.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TrackedJobCard({ job }: { job: TrackedJob }) {
  const priorityColors = {
    1: 'border-red-500',
    2: 'border-orange-500',
    3: 'border-yellow-500',
    4: 'border-green-500',
    5: 'border-gray-500',
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 ${priorityColors[job.priority as keyof typeof priorityColors] || 'border-gray-300'} hover:shadow-md transition-shadow cursor-pointer`}>
      <h4 className="font-semibold text-sm mb-1 line-clamp-2">
        Job #{job.job_id}
      </h4>
      {job.notes && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          {job.notes}
        </p>
      )}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Priority: {job.priority}</span>
        {job.applied_at && (
          <span>{new Date(job.applied_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  )
}
