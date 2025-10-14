import { Outlet, Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function Layout() {
  const location = useLocation()
  const { isDark, toggleDark } = useDarkMode()
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">JobSentinel</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/')
                      ? 'border-primary-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/jobs"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/jobs')
                      ? 'border-primary-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Jobs
                </Link>
                <Link
                  to="/tracker"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/tracker')
                      ? 'border-primary-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Tracker
                </Link>
                <Link
                  to="/resume"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/resume')
                      ? 'border-primary-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Resume
                </Link>
                <Link
                  to="/llm"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/llm')
                      ? 'border-primary-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300'
                  }`}
                >
                  🤖 LLM
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
                title="Toggle dark mode"
              >
                {isDark ? (
                  <span className="text-xl">🌞</span>
                ) : (
                  <span className="text-xl">🌙</span>
                )}
              </button>
              {/* Keyboard Shortcuts Help */}
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: '?' })
                  window.dispatchEvent(event)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Show keyboard shortcuts"
                title="Keyboard shortcuts (Press ? for help)"
              >
                <span className="text-xl">⌨️</span>
              </button>
              {/* Settings Link */}
              <Link
                to="/settings"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Settings"
                title="Settings"
              >
                <span className="text-xl">⚙️</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            🔒 100% Privacy-First | All data stays local | No tracking
          </p>
        </div>
      </footer>
    </div>
  )
}
