export interface Job {
  id: number
  title: string
  company: string
  location: string
  url: string
  description: string
  source: string
  score: number
  remote: boolean
  salary_min?: number
  salary_max?: number
  currency: string
}

export interface JobListResponse {
  jobs: Job[]
  total: number
  page: number
  per_page: number
  pages: number
}

export enum JobStatus {
  BOOKMARKED = 'bookmarked',
  APPLIED = 'applied',
  INTERVIEWING = 'interviewing',
  OFFER = 'offer',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface TrackedJob {
  id: number
  job_id: number
  status: JobStatus
  notes: string
  priority: number
  applied_at?: string
  interview_at?: string
  added_at: string
  updated_at: string
}

export interface HealthResponse {
  status: string
  timestamp: string
  total_jobs: number
  high_score_jobs: number
  recent_jobs_24h: number
}

export interface ResumeAnalysis {
  overall_score: number
  content_depth_score: number
  quantification_score: number
  action_verbs_score: number
  keyword_density_score: number
  format_score: number
  length_score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  ats_compatibility: number
}

export interface JobMatch {
  match_percentage: number
  confidence: number
  key_alignments: string[]
  gaps: string[]
  semantic_similarity: number
}

export interface LLMResponse {
  content: string
  provider: string
  model: string
  tokens_used: number
  cost_usd: number
  privacy_note: string
}

export enum LLMProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export interface LLMConfig {
  provider: LLMProvider
  model?: string
  temperature?: number
  max_tokens?: number
}

export interface MLStatus {
  semantic_matching: boolean
  sentiment_analysis: boolean
  resume_analysis: boolean
  skills_gap_analysis: boolean
}

export interface LLMStatus {
  ollama: {
    available: boolean
    cost: string
    privacy: string
    setup: string
  }
  openai: {
    available: boolean
    cost: string
    privacy: string
    setup: string
  }
  anthropic: {
    available: boolean
    cost: string
    privacy: string
    setup: string
  }
}
