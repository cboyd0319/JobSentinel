export function LLMFeatures() {
  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">✍️ Cover Letter Generator</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Generate personalized cover letters from job descriptions
          </p>
          <button className="btn btn-primary">Generate</button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">🎯 Interview Prep</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Get likely interview questions for specific roles
          </p>
          <button className="btn btn-primary">Prepare</button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">📊 Job Analysis</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Analyze job descriptions for insights and red flags
          </p>
          <button className="btn btn-primary">Analyze</button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">🔄 Skills Translation</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Match your skills to job requirements
          </p>
          <button className="btn btn-primary">Translate</button>
        </div>
      </div>
    </div>
  )
}
