import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { JobListResponse, Job } from '../types'

export function Jobs() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [remoteOnly, setRemoteOnly] = useState(false)

  const { data, isLoading, error } = useQuery<JobListResponse>({
    queryKey: ['jobs', page, search, minScore, remoteOnly],
    queryFn: () => api.get('/jobs', {
      params: { page, search, min_score: minScore, remote_only: remoteOnly }
    }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">💼 Job Search</h1>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" role="search" aria-label="Job filters">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="job-search" className="block text-sm font-medium mb-2">Search</label>
            <input
              id="job-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Job title, company..."
              aria-label="Search jobs by title or company"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="min-score" className="block text-sm font-medium mb-2">Min Score</label>
            <input
              id="min-score"
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              min="0"
              max="100"
              aria-label="Minimum job match score (0-100)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                id="remote-only"
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded"
                aria-label="Show only remote jobs"
              />
              <span>Remote Only</span>
            </label>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('')
                setMinScore(0)
                setRemoteOnly(false)
              }}
              className="btn btn-secondary w-full"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card" role="region" aria-label="Job search results">
        {isLoading && (
          <div className="text-center py-8" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" aria-hidden="true"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading jobs...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" role="alert" aria-live="assertive">
            <p className="text-red-800 dark:text-red-200">
              Failed to load jobs. Please try again.
            </p>
          </div>
        )}

        {data && data.jobs.length === 0 && (
          <div className="text-center py-8" role="status">
            <p className="text-gray-600 dark:text-gray-400">
              No jobs found. Try adjusting your filters.
            </p>
          </div>
        )}

        {data && data.jobs.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {data.jobs.length} of {data.total} jobs
              </p>
            </div>
            
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}

            {/* Pagination */}
            {data.pages > 1 && (
              <nav className="flex justify-center items-center gap-2 mt-6" aria-label="Job list pagination">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50"
                  aria-label="Go to previous page"
                  aria-disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm" aria-current="page" aria-label={`Page ${page} of ${data.pages}`}>
                  Page {page} of {data.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.pages}
                  className="btn btn-secondary disabled:opacity-50"
                  aria-label="Go to next page"
                  aria-disabled={page === data.pages}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const scoreColor = job.score >= 80 ? 'text-green-600' : job.score >= 60 ? 'text-yellow-600' : 'text-gray-600'
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {job.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {job.company} • {job.location}
            {job.remote && <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded text-xs">Remote</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-2xl font-bold ${scoreColor}`}>{job.score}%</span>
          {(job.salary_min || job.salary_max) && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {job.currency}{job.salary_min?.toLocaleString()} - {job.currency}{job.salary_max?.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
        {job.description}
      </p>
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-500">
          Source: {job.source}
        </span>
        <div className="flex gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            View Job →
          </a>
          <button className="btn btn-secondary btn-sm">
            💾 Save
          </button>
        </div>
      </div>
    </div>
  )
}
