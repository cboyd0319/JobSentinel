import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { HealthResponse, MLStatus, LLMStatus } from '../types'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { InlineSpinner } from '../components/Spinner'

export function Dashboard() {
  const { data: health, isLoading: healthLoading, error: healthError } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: mlStatus, isLoading: mlLoading } = useQuery<MLStatus>({
    queryKey: ['ml-status'],
    queryFn: () => api.get('/ml/status'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const { data: llmStatus, isLoading: llmLoading } = useQuery<LLMStatus>({
    queryKey: ['llm-status'],
    queryFn: () => api.get('/llm/status'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Show loading skeleton on initial load
  if (healthLoading && !health) {
    return <DashboardSkeleton />
  }

  // Show error state
  if (healthError) {
    return (
      <div className="card bg-red-50 border-red-200">
        <div className="flex items-center gap-3 text-red-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold">Failed to load dashboard</h3>
            <p className="text-sm">Make sure the JobSentinel API is running on http://localhost:5000</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="card text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to JobSentinel</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Your AI-Powered Job Search Assistant
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Automate your job search with intelligent matching and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Total Jobs</h3>
          <p className="text-4xl font-bold text-primary-600">{health?.total_jobs || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">High Score Jobs</h3>
          <p className="text-4xl font-bold text-green-600">{health?.high_score_jobs || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">New in 24 Hours</h3>
          <p className="text-4xl font-bold text-blue-600">{health?.recent_jobs_24h || 0}</p>
        </div>
      </div>

      {/* Feature Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ML Features */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">🧠 ML Features</h2>
          {mlLoading ? (
            <InlineSpinner text="Checking ML features..." />
          ) : (
            <div className="space-y-2">
              <FeatureStatus
                name="Semantic Matching"
                available={mlStatus?.semantic_matching}
              />
              <FeatureStatus
                name="Sentiment Analysis"
                available={mlStatus?.sentiment_analysis}
              />
              <FeatureStatus
                name="Resume Analysis"
                available={mlStatus?.resume_analysis}
              />
              <FeatureStatus
                name="Skills Gap Analysis"
                available={mlStatus?.skills_gap_analysis}
              />
            </div>
          )}
        </div>

        {/* LLM Features */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">🤖 LLM Features</h2>
          {llmLoading ? (
            <InlineSpinner text="Checking LLM providers..." />
          ) : (
            <div className="space-y-3">
              <LLMProviderStatus name="Ollama (Local)" data={llmStatus?.ollama} />
              <LLMProviderStatus name="OpenAI" data={llmStatus?.openai} />
              <LLMProviderStatus name="Anthropic" data={llmStatus?.anthropic} />
            </div>
          )}
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            💡 Ollama is recommended for 100% privacy
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-primary">🔍 Search Jobs</button>
          <button className="btn btn-primary">📄 Analyze Resume</button>
          <button className="btn btn-primary">✍️ Generate Cover Letter</button>
        </div>
      </div>
    </div>
  )
}

function FeatureStatus({ name, available }: { name: string; available?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
      <span className="text-sm">{name}</span>
      <span className={`text-sm font-medium ${available ? 'text-green-600' : 'text-gray-400'}`}>
        {available ? '✅ Available' : '⚪ Not Available'}
      </span>
    </div>
  )
}

interface LLMProviderData {
  available: boolean
  cost: string
  privacy: string
  setup?: string
}

function LLMProviderStatus({ name, data }: { name: string; data?: LLMProviderData }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{name}</span>
        <span className={`text-sm ${data?.available ? 'text-green-600' : 'text-gray-400'}`}>
          {data?.available ? '✅' : '⚪'}
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{data?.cost}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">{data?.privacy}</p>
    </div>
  )
}
