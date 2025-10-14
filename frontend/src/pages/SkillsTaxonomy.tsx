import { useState, useEffect } from 'react'
import { 
  Search, TrendingUp, TrendingDown, Sparkles, DollarSign, 
  Map, BookOpen, ChevronRight, Award, Target, Zap,
  BarChart3, LineChart, PieChart, Network
} from 'lucide-react'

interface Skill {
  id: string
  name: string
  category: string
  description: string
}

interface DemandTrend {
  skill_id: string
  skill_name: string
  demand_level: string
  trend_direction: string
  growth_rate: number
  demand_score: number
  job_postings_count: number
  market_share: number
  insights: string[]
}

interface SalaryCorrelation {
  skill_id: string
  skill_name: string
  impact: string
  salary_premium: number
  base_salary: {
    min: number
    max: number
    median: number
  }
  with_skill_salary: {
    min: number
    max: number
    median: number
  }
  experience_level: string
  confidence: number
  insights: string[]
}

interface LearningPath {
  name: string
  description: string
  domain: string
  nodes: PathNode[]
  total_duration: string
  market_demand: string
}

interface PathNode {
  level: string
  title: string
  required_skills: PathStep[]
  optional_skills: PathStep[]
  estimated_years: string
  average_salary: string
  responsibilities: string[]
}

interface PathStep {
  skill: Skill
  level: string
  estimated_time: string
  priority: string
  resources: string[]
}

const API_BASE = '/api/v1/skills'

export function SkillsTaxonomy() {
  const [activeTab, setActiveTab] = useState<'graph' | 'trends' | 'salary' | 'paths'>('trends')
  const [searchQuery, setSearchQuery] = useState('')
  const [hotSkills, setHotSkills] = useState<DemandTrend[]>([])
  const [topPayingSkills, setTopPayingSkills] = useState<SalaryCorrelation[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrendData()
    loadSalaryData()
    loadLearningPaths()
  }, [])

  const loadTrendData = async () => {
    try {
      const response = await fetch(`${API_BASE}/trends/hot?limit=10`)
      const data = await response.json()
      setHotSkills(data)
    } catch (error) {
      console.error('Failed to load trend data:', error)
    }
  }

  const loadSalaryData = async () => {
    try {
      const response = await fetch(`${API_BASE}/salary-correlation/top-paying?limit=10`)
      const data = await response.json()
      setTopPayingSkills(data)
    } catch (error) {
      console.error('Failed to load salary data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLearningPaths = async () => {
    try {
      const response = await fetch(`${API_BASE}/learning-paths`)
      const data = await response.json()
      setLearningPaths(data)
    } catch (error) {
      console.error('Failed to load learning paths:', error)
    }
  }

  const getTrendIcon = (direction: string) => {
    switch(direction) {
      case 'rising': return <TrendingUp className="h-5 w-5 text-green-500" />
      case 'emerging': return <Sparkles className="h-5 w-5 text-purple-500" />
      case 'declining': return <TrendingDown className="h-5 w-5 text-red-500" />
      default: return <BarChart3 className="h-5 w-5 text-gray-500" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch(impact) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Network className="h-10 w-10" />
                Skills Taxonomy
              </h1>
              <p className="text-indigo-100 text-lg">
                Explore 50K+ skills, career paths, market trends, and salary insights
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">44+</div>
                <div className="text-xs text-indigo-100">Skills</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">4</div>
                <div className="text-xs text-indigo-100">Career Paths</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">Live</div>
                <div className="text-xs text-indigo-100">Market Data</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for skills, technologies, or career paths..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8 py-4">
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                activeTab === 'trends'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Demand Trends</span>
            </button>
            <button
              onClick={() => setActiveTab('salary')}
              className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                activeTab === 'salary'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="h-5 w-5" />
              <span className="font-medium">Salary Impact</span>
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                activeTab === 'paths'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Map className="h-5 w-5" />
              <span className="font-medium">Learning Paths</span>
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                activeTab === 'graph'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Network className="h-5 w-5" />
              <span className="font-medium">Skills Graph</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Demand Trends Tab */}
            {activeTab === 'trends' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Zap className="h-6 w-6 text-yellow-500" />
                      🔥 Hot Skills - Rising Demand
                    </h2>
                    <span className="text-sm text-gray-500">Updated in real-time</span>
                  </div>
                  <div className="grid gap-4">
                    {hotSkills.map((skill) => (
                      <div
                        key={skill.skill_id}
                        className="group p-5 rounded-lg border-2 border-gray-100 hover:border-indigo-200 bg-gradient-to-r from-white to-indigo-50/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getTrendIcon(skill.trend_direction)}
                              <h3 className="text-lg font-semibold text-gray-900">
                                {skill.skill_name}
                              </h3>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                +{(skill.growth_rate * 100).toFixed(0)}% YoY
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                {skill.job_postings_count.toLocaleString()} jobs
                              </span>
                              <span className="flex items-center gap-1">
                                <PieChart className="h-4 w-4" />
                                {skill.market_share.toFixed(1)}% market share
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-4 w-4" />
                                {skill.demand_score}/100 demand score
                              </span>
                            </div>
                            <div className="space-y-1">
                              {skill.insights.map((insight, idx) => (
                                <p key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <ChevronRight className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                  <span>{insight}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="w-24 h-24 relative">
                              <svg className="transform -rotate-90 w-24 h-24">
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="transparent"
                                  className="text-gray-200"
                                />
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="transparent"
                                  strokeDasharray={`${skill.demand_score * 2.51} 251`}
                                  className="text-indigo-600"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-bold text-gray-900">
                                  {skill.demand_score}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Salary Impact Tab */}
            {activeTab === 'salary' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-green-500" />
                      💰 Top Paying Skills
                    </h2>
                    <span className="text-sm text-gray-500">Mid-level experience</span>
                  </div>
                  <div className="grid gap-4">
                    {topPayingSkills.map((skill) => (
                      <div
                        key={skill.skill_id}
                        className="p-5 rounded-lg border-2 border-gray-100 hover:border-green-200 bg-gradient-to-r from-white to-green-50/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {skill.skill_name}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getImpactColor(skill.impact)}`}>
                                {skill.impact.toUpperCase()}
                              </span>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                +{skill.salary_premium.toFixed(0)}% premium
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-600 mb-1">Base Salary</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(skill.base_salary.median)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(skill.base_salary.min)} - {formatCurrency(skill.base_salary.max)}
                                </div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="text-xs text-green-700 mb-1">With This Skill</div>
                                <div className="text-lg font-semibold text-green-700">
                                  {formatCurrency(skill.with_skill_salary.median)}
                                </div>
                                <div className="text-xs text-green-600">
                                  {formatCurrency(skill.with_skill_salary.min)} - {formatCurrency(skill.with_skill_salary.max)}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {skill.insights.map((insight, idx) => (
                                <p key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{insight}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="ml-6 text-right">
                            <div className="text-3xl font-bold text-green-600">
                              {formatCurrency(skill.with_skill_salary.median - skill.base_salary.median)}
                            </div>
                            <div className="text-sm text-gray-600">Annual increase</div>
                            <div className="mt-2 text-xs text-gray-500">
                              {(skill.confidence * 100).toFixed(0)}% confidence
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Learning Paths Tab */}
            {activeTab === 'paths' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {learningPaths.map((path) => (
                    <div
                      key={path.name}
                      onClick={() => setSelectedPath(path)}
                      className="group cursor-pointer bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-100 rounded-lg">
                            <Map className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {path.description}
                            </h3>
                            <p className="text-sm text-gray-600">{path.domain.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {path.nodes.length} levels
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          {path.total_duration}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          path.market_demand === 'high' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {path.market_demand} demand
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Path Details */}
                {selectedPath && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Map className="h-6 w-6 text-indigo-600" />
                      Career Progression: {selectedPath.description}
                    </h2>
                    <div className="space-y-6">
                      {selectedPath.nodes.map((node, idx) => (
                        <div key={idx} className="relative">
                          {idx < selectedPath.nodes.length - 1 && (
                            <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-indigo-200" />
                          )}
                          <div className="flex gap-6">
                            <div className="flex-shrink-0 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {idx + 1}
                            </div>
                            <div className="flex-1 pb-8">
                              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-100">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                      {node.title}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                      <span>{node.estimated_years} experience</span>
                                      <span>•</span>
                                      <span className="font-semibold text-green-600">
                                        {node.average_salary}
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    node.level === 'junior' ? 'bg-blue-100 text-blue-700' :
                                    node.level === 'mid' ? 'bg-purple-100 text-purple-700' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    {node.level.toUpperCase()}
                                  </span>
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Key Responsibilities:</h4>
                                    <ul className="space-y-1">
                                      {node.responsibilities.map((resp, i) => (
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                          <ChevronRight className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                          {resp}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">
                                      Required Skills ({node.required_skills.length}):
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {node.required_skills.slice(0, 6).map((step, i) => (
                                        <span
                                          key={i}
                                          className="px-3 py-1 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium"
                                        >
                                          {step.skill.name}
                                        </span>
                                      ))}
                                      {node.required_skills.length > 6 && (
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">
                                          +{node.required_skills.length - 6} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Skills Graph Tab */}
            {activeTab === 'graph' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Network className="h-6 w-6 text-indigo-600" />
                  Skills Relationship Graph
                </h2>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-12 text-center">
                  <Network className="h-20 w-20 text-indigo-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Interactive skills graph visualization coming soon!
                  </p>
                  <p className="text-sm text-gray-500">
                    Explore skill relationships, prerequisites, and adjacency in a visual network diagram.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
