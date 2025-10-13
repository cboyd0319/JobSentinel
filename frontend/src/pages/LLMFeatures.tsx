import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { LLMResponse, LLMStatus, LLMProvider } from '../types'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

type FeatureMode = 'cover-letter' | 'interview-prep' | 'job-analysis' | 'skill-translation' | null

export function LLMFeatures() {
  const [activeMode, setActiveMode] = useState<FeatureMode>(null)
  const [provider, setProvider] = useState<LLMProvider>('ollama' as LLMProvider)
  const toast = useToast()

  const { data: llmStatus } = useQuery<LLMStatus>({
    queryKey: ['llm-status'],
    queryFn: () => api.get('/llm/status'),
  })

  const closeModal = () => setActiveMode(null)

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      
      <div className="card">
        <h1 className="text-3xl font-bold mb-4">🤖 LLM Features</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          AI-powered job search assistance (Privacy-first with local Ollama)
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm">
            <strong>Privacy Note:</strong> All LLM features default to local Ollama (FREE, 100% private).
            External APIs (OpenAI, Anthropic) are optional and require explicit configuration.
          </p>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">LLM Provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {llmStatus && Object.entries(llmStatus).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setProvider(key as LLMProvider)}
              className={`p-4 rounded-lg border-2 transition-all ${
                provider === key
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold capitalize">{key}</span>
                <span className={value.available ? 'text-green-600' : 'text-gray-400'}>
                  {value.available ? '✅' : '⚪'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{value.cost}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{value.privacy}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">✍️ Cover Letter Generator</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Generate personalized cover letters from job descriptions
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setActiveMode('cover-letter')}
          >
            Generate
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">🎯 Interview Prep</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Get likely interview questions for specific roles
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setActiveMode('interview-prep')}
          >
            Prepare
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">📊 Job Analysis</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Analyze job descriptions for insights and red flags
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setActiveMode('job-analysis')}
          >
            Analyze
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">🔄 Skills Translation</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Match your skills to job requirements
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setActiveMode('skill-translation')}
          >
            Translate
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeMode === 'cover-letter' && (
        <CoverLetterModal provider={provider} onClose={closeModal} toast={toast} />
      )}
      {activeMode === 'interview-prep' && (
        <InterviewPrepModal provider={provider} onClose={closeModal} toast={toast} />
      )}
      {activeMode === 'job-analysis' && (
        <JobAnalysisModal provider={provider} onClose={closeModal} toast={toast} />
      )}
      {activeMode === 'skill-translation' && (
        <SkillTranslationModal provider={provider} onClose={closeModal} toast={toast} />
      )}
    </div>
  )
}

// Modal Components
function CoverLetterModal({ provider, onClose, toast }: { provider: LLMProvider; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: '',
    job_description: '',
    resume_text: '',
    tone: 'professional',
  })

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/llm/cover-letter', {
        ...data,
        llm_config: { provider },
      })
      return response.data as LLMResponse
    },
    onSuccess: (_data: LLMResponse) => {
      toast.success('Cover letter generated successfully!')
    },
    onError: (_error) => {
      toast.error('Failed to generate cover letter')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Modal title="Generate Cover Letter" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Job Title</label>
          <input
            type="text"
            required
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            className="input w-full"
            placeholder="e.g., Senior Software Engineer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            required
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className="input w-full"
            placeholder="e.g., Google"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Job Description</label>
          <textarea
            required
            value={formData.job_description}
            onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
            className="input w-full"
            rows={4}
            placeholder="Paste the job description here..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Your Resume</label>
          <textarea
            required
            value={formData.resume_text}
            onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
            className="input w-full"
            rows={4}
            placeholder="Paste your resume here..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tone</label>
          <select
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
            className="input w-full"
          >
            <option value="professional">Professional</option>
            <option value="enthusiastic">Enthusiastic</option>
            <option value="formal">Formal</option>
          </select>
        </div>

        {mutation.isSuccess && mutation.data && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Generated Cover Letter:</h3>
            <pre className="text-sm whitespace-pre-wrap">{(mutation.data as LLMResponse).content}</pre>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Cost: ${(mutation.data as LLMResponse).cost_usd.toFixed(4)} | {(mutation.data as LLMResponse).privacy_note}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary flex-1"
          >
            {mutation.isPending ? 'Generating...' : 'Generate Cover Letter'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </form>
    </Modal>
  )
}

function InterviewPrepModal({ onClose }: { provider: LLMProvider; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  // Similar implementation
  return (
    <Modal title="Interview Prep" onClose={onClose}>
      <p className="text-gray-600 dark:text-gray-400">Interview prep feature coming soon...</p>
      <button onClick={onClose} className="btn btn-secondary mt-4">Close</button>
    </Modal>
  )
}

function JobAnalysisModal({ onClose }: { provider: LLMProvider; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  // Similar implementation
  return (
    <Modal title="Job Analysis" onClose={onClose}>
      <p className="text-gray-600 dark:text-gray-400">Job analysis feature coming soon...</p>
      <button onClick={onClose} className="btn btn-secondary mt-4">Close</button>
    </Modal>
  )
}

function SkillTranslationModal({ onClose }: { provider: LLMProvider; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  // Similar implementation
  return (
    <Modal title="Skills Translation" onClose={onClose}>
      <p className="text-gray-600 dark:text-gray-400">Skills translation feature coming soon...</p>
      <button onClick={onClose} className="btn btn-secondary mt-4">Close</button>
    </Modal>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
