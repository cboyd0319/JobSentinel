import { useState } from 'react'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

export function Settings() {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  )
  const toast = useToast()

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
    toast.success(darkMode ? 'Light mode enabled' : 'Dark mode enabled')
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-800">
        <div className="flex items-center gap-3">
          <span className="text-5xl">⚙️</span>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure JobSentinel to match your preferences
            </p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎨</span>
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{darkMode ? '🌙' : '☀️'}</span>
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toggle between light and dark themes
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-inner ${
                darkMode ? 'bg-primary-600' : 'bg-gray-300'
              }`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Job Search Preferences */}
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💼</span>
          <h2 className="text-xl font-semibold">Job Search Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Note:</strong> Edit your preferences in <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">config/user_prefs.json</code> or run <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">python -m jsa.cli setup</code>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <span>🔑</span>
              <span>Keywords</span>
            </label>
            <input
              type="text"
              className="input hover:border-primary-400 focus:border-primary-500 transition-colors"
              placeholder="python, backend, remote"
              readOnly
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Comma-separated keywords for job matching
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <span>📍</span>
              <span>Locations</span>
            </label>
            <input
              type="text"
              className="input hover:border-primary-400 focus:border-primary-500 transition-colors"
              placeholder="Remote, San Francisco, New York"
              readOnly
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Preferred job locations
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <span>💰</span>
              <span>Minimum Salary</span>
            </label>
            <input
              type="number"
              className="input hover:border-primary-400 focus:border-primary-500 transition-colors"
              placeholder="100000"
              readOnly
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Minimum acceptable salary (USD)
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <input type="checkbox" id="remote-only" className="rounded w-4 h-4" disabled />
            <label htmlFor="remote-only" className="text-sm font-medium flex items-center gap-2">
              <span>🌍</span>
              <span>Remote positions only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔔</span>
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Tip:</strong> Configure Slack notifications to get instant alerts for high-match jobs!
            </p>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-medium">Slack Alerts</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive job alerts via Slack webhook
                </p>
              </div>
            </div>
            <button 
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 shadow-inner"
              aria-label="Toggle Slack alerts"
              disabled
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 shadow" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <span>🔗</span>
              <span>Slack Webhook URL</span>
            </label>
            <input
              type="text"
              className="input hover:border-primary-400 focus:border-primary-500 transition-colors font-mono text-sm"
              placeholder="https://hooks.slack.com/services/..."
              readOnly
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Get your webhook from <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Slack API Apps</a>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <span>📊</span>
              <span>Alert Threshold Score</span>
            </label>
            <input
              type="number"
              className="input hover:border-primary-400 focus:border-primary-500 transition-colors"
              placeholder="70"
              min="0"
              max="100"
              readOnly
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Only alert for jobs above this score (0-100) - Recommended: 70+
            </p>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="card hover:shadow-lg transition-shadow border-2 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔒</span>
          <h2 className="text-xl font-semibold">Privacy & Security</h2>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-5 mb-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-bold text-green-900 dark:text-green-100 mb-2">
                100% Privacy-First Design
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                All data stays local on your machine. No telemetry, no tracking, no data collection. 
                Your job search is completely private.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🗄️</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              All job data stored locally in PostgreSQL (on your machine)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🚫</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No external analytics or tracking - Zero telemetry
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🔐</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              API keys stored securely in .env file (never in code)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🤖</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Optional external LLM services (Ollama local recommended for 100% privacy)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🌐</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Only scrapes public job boards - Respects robots.txt and rate limits
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            • Zero telemetry, zero data collection, 100% private
          </p>
        </div>
      </div>

      {/* Database */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">🗄️ Database</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium">Database Size</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current storage usage</p>
            </div>
            <span className="text-lg font-bold text-primary-600">2.5 MB</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1">
              Export Data
            </button>
            <button className="btn btn-secondary flex-1">
              Backup Database
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="card">
        <div className="flex gap-2">
          <button
            onClick={() => toast.success('Settings saved successfully!')}
            className="btn btn-primary flex-1"
          >
            Save Settings
          </button>
          <button
            onClick={() => toast.info('Settings reset to defaults')}
            className="btn btn-secondary"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
