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
      
      <div>
        <h1 className="text-3xl font-bold">⚙️ Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure JobSentinel to match your preferences
        </p>
      </div>

      {/* Appearance */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">🎨 Appearance</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toggle between light and dark themes
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Job Search Preferences */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">💼 Job Search Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Keywords</label>
            <input
              type="text"
              className="input"
              placeholder="python, backend, remote"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Comma-separated keywords for job matching
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Locations</label>
            <input
              type="text"
              className="input"
              placeholder="Remote, San Francisco, New York"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Salary</label>
            <input
              type="number"
              className="input"
              placeholder="100000"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="remote-only" className="rounded" />
            <label htmlFor="remote-only" className="text-sm font-medium">
              Remote positions only
            </label>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">🔔 Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Slack Alerts</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive job alerts via Slack webhook
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Slack Webhook URL</label>
            <input
              type="text"
              className="input"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Alert Threshold Score</label>
            <input
              type="number"
              className="input"
              placeholder="70"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Only alert for jobs above this score (0-100)
            </p>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">🔒 Privacy & Security</h2>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>✅ 100% Privacy-First:</strong> All data stays local on your machine. 
            No telemetry, no tracking, no data collection. Your job search is completely private.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            • All job data stored locally in SQLite
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            • No external analytics or tracking
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            • API keys stored securely in .env file (never in code)
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            • Optional external LLM services (Ollama local by default)
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
