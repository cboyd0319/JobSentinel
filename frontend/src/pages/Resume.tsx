import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ResumeAnalysis } from '../types'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

export function Resume() {
  const [resumeText, setResumeText] = useState('')
  const toast = useToast()

  const analyzeMutation = useMutation({
    mutationFn: (text: string) => api.post('/resume/analyze', { resume_text: text }),
    onSuccess: (_data: ResumeAnalysis) => {
      toast.success('Resume analyzed successfully!')
    },
    onError: () => {
      toast.error('Failed to analyze resume')
    },
  })

  const handleAnalyze = () => {
    if (resumeText.trim().length < 100) {
      toast.warning('Resume text is too short. Please enter at least 100 characters.')
      return
    }
    analyzeMutation.mutate(resumeText)
  }

  const analysis = analyzeMutation.data as ResumeAnalysis | undefined

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">📄 Resume Analyzer</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Get ATS compatibility scores and improvement suggestions
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Resume</h2>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here (plain text or from PDF)..."
          className="input min-h-[300px] font-mono text-sm"
        />
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {resumeText.length} characters
          </span>
          <button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending || resumeText.length < 100}
            className="btn btn-primary"
          >
            {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {analysis && (
        <>
          {/* Scores */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">📊 Overall Score</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl font-bold text-primary-600">
                {Math.round(analysis.overall_score)}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-primary-600 h-4 rounded-full transition-all"
                    style={{ width: `${analysis.overall_score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {analysis.overall_score >= 80 ? 'Excellent! Your resume is well-optimized.' :
                   analysis.overall_score >= 60 ? 'Good! Some improvements recommended.' :
                   'Needs work. Follow the suggestions below.'}
                </p>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ScoreCard label="Content Depth" score={analysis.content_depth_score} />
              <ScoreCard label="Quantification" score={analysis.quantification_score} />
              <ScoreCard label="Action Verbs" score={analysis.action_verbs_score} />
              <ScoreCard label="Keyword Density" score={analysis.keyword_density_score} />
              <ScoreCard label="Format" score={analysis.format_score} />
              <ScoreCard label="Length" score={analysis.length_score} />
            </div>
          </div>

          {/* ATS Compatibility */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">🤖 ATS Compatibility</h2>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-green-600">
                {Math.round(analysis.ats_compatibility)}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Your resume is {analysis.ats_compatibility >= 80 ? 'highly' : analysis.ats_compatibility >= 60 ? 'moderately' : 'poorly'} compatible with Applicant Tracking Systems
              </p>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                ✅ Strengths
              </h2>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis.weaknesses.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                ⚠️ Areas for Improvement
              </h2>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                💡 Suggestions
              </h2>
              <ul className="space-y-3">
                {analysis.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-blue-600 mt-1">→</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{Math.round(score)}%</p>
    </div>
  )
}
