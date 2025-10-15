import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function Onboarding() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      setShow(true)
    }
  }, [])

  const steps = [
    {
      title: '👋 Welcome to JobSentinel!',
      description: 'Your AI-powered, privacy-first job search assistant',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            JobSentinel helps you find the perfect job by:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>🔍 Scraping multiple job boards (500K+ jobs)</li>
            <li>🎯 Scoring matches against your preferences</li>
            <li>📧 Sending real-time alerts for top matches</li>
            <li>🔒 Keeping ALL your data 100% private and local</li>
          </ul>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✨ Zero Cost:</strong> Unlike competitors charging $30-100/month, JobSentinel is FREE forever!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '🔍 Search Jobs',
      description: 'Find jobs that match your skills and preferences',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Use the Jobs page to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>🔎 Search by keywords, company, or location</li>
            <li>⭐ Filter by match score (AI-powered scoring)</li>
            <li>🏠 Find remote opportunities</li>
            <li>📊 Sort by score, date, or salary</li>
          </ul>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Pro Tip:</strong> Use keyboard shortcut <kbd className="px-2 py-1 bg-blue-200 dark:bg-blue-700 rounded text-xs">Ctrl+J</kbd> to quickly navigate to Jobs!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '📋 Track Applications',
      description: 'Manage your job applications with Kanban board',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            The Tracker page features a drag-and-drop Kanban board:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>📑 Bookmark interesting jobs</li>
            <li>📤 Track applications</li>
            <li>💬 Manage interviews</li>
            <li>🎉 Celebrate offers!</li>
          </ul>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>✨ Drag & Drop:</strong> Just click and drag job cards between columns to update status!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '📄 Optimize Your Resume',
      description: 'Get AI-powered insights to improve your resume',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Upload your resume to get:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>🎯 ATS compatibility score</li>
            <li>📊 Skills gap analysis</li>
            <li>💪 Strengths and weaknesses</li>
            <li>✍️ Actionable improvement suggestions</li>
          </ul>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>🤖 ML-Powered:</strong> Uses BERT and sentiment analysis for semantic matching!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '⌨️ Keyboard Shortcuts',
      description: 'Work faster with keyboard shortcuts',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Power user? We've got you covered:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-700 dark:text-gray-300">Dashboard</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+H</kbd>
            </div>
            <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-700 dark:text-gray-300">Jobs</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+J</kbd>
            </div>
            <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-700 dark:text-gray-300">Tracker</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+T</kbd>
            </div>
            <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-700 dark:text-gray-300">Resume</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+R</kbd>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Quick Tip:</strong> Press <kbd className="px-2 py-1 bg-blue-200 dark:bg-blue-700 rounded text-xs">?</kbd> anytime to see all shortcuts!
            </p>
          </div>
        </div>
      ),
    },
  ]

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setShow(false)
  }

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setShow(false)
  }

  if (!show) return null

  const currentStep = steps[step]
  const isLastStep = step === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {step + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip Tour
            </button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {currentStep.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {currentStep.description}
          </p>
          {currentStep.content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          {isLastStep ? (
            <button onClick={handleComplete} className="btn btn-primary">
              Get Started! 🚀
            </button>
          ) : (
            <button onClick={() => setStep(step + 1)} className="btn btn-primary">
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
