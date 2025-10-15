import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault()
            navigate('/')
            break
          case 'j':
            e.preventDefault()
            navigate('/jobs')
            break
          case 't':
            e.preventDefault()
            navigate('/tracker')
            break
          case 'r':
            e.preventDefault()
            navigate('/resume')
            break
          case 'l':
            e.preventDefault()
            navigate('/llm')
            break
          case 's':
            e.preventDefault()
            navigate('/settings')
            break
          case '/':
            e.preventDefault()
            // Focus search input if exists
            const searchInput = document.querySelector<HTMLInputElement>('#job-search')
            searchInput?.focus()
            break
        }
      }

      // Handle single-key shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case '?':
            e.preventDefault()
            // Show keyboard shortcuts modal
            showKeyboardShortcutsHelp()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [navigate])
}

function showKeyboardShortcutsHelp() {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">⌨️ Keyboard Shortcuts</h2>
        <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl" onclick="this.closest('.fixed').remove()">×</button>
      </div>
      <div class="space-y-4">
        <div>
          <h3 class="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Navigation</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Dashboard</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+H</kbd>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Jobs</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+J</kbd>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Tracker</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+T</kbd>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Resume</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+R</kbd>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">LLM Features</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+L</kbd>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Settings</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+S</kbd>
            </div>
          </div>
        </div>
        <div>
          <h3 class="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Actions</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Focus Search</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+/</kbd>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span class="text-gray-700 dark:text-gray-300">Show Help</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">?</kbd>
            </div>
          </div>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Pro Tip:</strong> On Mac, use <kbd class="px-2 py-1 bg-blue-200 dark:bg-blue-700 rounded text-xs">Cmd</kbd> instead of <kbd class="px-2 py-1 bg-blue-200 dark:bg-blue-700 rounded text-xs">Ctrl</kbd>
          </p>
        </div>
      </div>
      <div class="mt-6 text-center">
        <button class="btn btn-primary" onclick="this.closest('.fixed').remove()">Close</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  // Close on clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)
}
