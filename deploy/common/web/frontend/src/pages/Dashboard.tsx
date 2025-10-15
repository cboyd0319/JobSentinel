import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { HealthResponse, MLStatus, LLMStatus } from '../types'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { InlineSpinner } from '../components/Spinner'
import { HelpIcon } from '../components/Tooltip'

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
      <div className="card text-center bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-800">
        <div className="inline-block mb-4 text-6xl">🎯</div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
          Welcome to JobSentinel
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 font-medium">
          Your AI-Powered Job Search Assistant
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Automate your job search with intelligent matching, semantic analysis, and real-time alerts.
          100% local, 100% private, 100% free. 🔒
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card hover:shadow-lg transition-all cursor-pointer border-l-4 border-primary-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Jobs</h3>
            <span className="text-3xl group-hover:scale-110 transition-transform">💼</span>
          </div>
          <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">{health?.total_jobs?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Jobs in database</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Growth</span>
              <span className="text-green-600 dark:text-green-400 font-medium">+12% this week</span>
            </div>
          </div>
        </div>
        <div className="card hover:shadow-lg transition-all cursor-pointer border-l-4 border-green-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">High Score Jobs</h3>
            <span className="text-3xl group-hover:scale-110 transition-transform">⭐</span>
          </div>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">{health?.high_score_jobs?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Matches 70%+ score</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Match rate</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {health?.total_jobs ? ((health.high_score_jobs / health.total_jobs) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
        <div className="card hover:shadow-lg transition-all cursor-pointer border-l-4 border-blue-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">New in 24 Hours</h3>
            <span className="text-3xl group-hover:scale-110 transition-transform">🆕</span>
          </div>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{health?.recent_jobs_24h?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Recently collected</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg per hour</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {health?.recent_jobs_24h ? Math.round(health.recent_jobs_24h / 24) : 0}/hr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ML Features */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🧠 ML Features
            <HelpIcon
              content="Machine Learning features that analyze jobs and resumes using AI. Requires ML dependencies installed with: pip install -e '.[ml]'"
              position="right"
            />
          </h2>
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
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🤖 LLM Features
            <HelpIcon
              content="Large Language Model providers for AI-powered features. Ollama is recommended for 100% privacy (runs locally). OpenAI and Anthropic require API keys."
              position="right"
            />
          </h2>
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
        <h2 className="text-2xl font-bold mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/jobs" className="btn btn-primary flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            <span className="text-xl">🔍</span>
            <span>Search Jobs</span>
          </a>
          <a href="/resume" className="btn btn-primary flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            <span className="text-xl">📄</span>
            <span>Analyze Resume</span>
          </a>
          <a href="/tracker" className="btn btn-primary flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            <span className="text-xl">📊</span>
            <span>Track Applications</span>
          </a>
        </div>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Pro Tip:</strong> Start by analyzing your resume to see how well it matches available jobs!
          </p>
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
