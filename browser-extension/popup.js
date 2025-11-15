/**
 * Popup Script
 *
 * Handles the extension popup functionality.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check connection status
  checkConnectionStatus();

  // Load session stats
  loadSessionStats();

  // Button event listeners
  document.getElementById('open-app-btn').addEventListener('click', openDesktopApp);
  document.getElementById('view-jobs-btn').addEventListener('click', viewSavedJobs);
  document.getElementById('settings-link').addEventListener('click', openSettings);
  document.getElementById('help-link').addEventListener('click', openHelp);
});

/**
 * Check connection status with desktop app
 */
async function checkConnectionStatus() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  try {
    // Send message to background script to check connection
    const response = await chrome.runtime.sendMessage({ action: 'checkConnection' });

    if (response && response.connected) {
      statusDot.classList.remove('disconnected');
      statusText.textContent = 'Connected';
    } else {
      statusDot.classList.add('disconnected');
      statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    statusDot.classList.add('disconnected');
    statusText.textContent = 'Disconnected';
  }
}

/**
 * Load session statistics
 */
async function loadSessionStats() {
  try {
    const stats = await chrome.storage.local.get(['jobsViewed', 'jobsSaved']);

    document.getElementById('jobs-viewed').textContent = stats.jobsViewed || 0;
    document.getElementById('jobs-saved').textContent = stats.jobsSaved || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Open desktop app
 */
function openDesktopApp() {
  // Try to open via custom protocol
  window.location.href = 'jobsentinel://open';

  // Close popup after short delay
  setTimeout(() => {
    window.close();
  }, 500);
}

/**
 * View saved jobs (open desktop app to jobs view)
 */
function viewSavedJobs() {
  window.location.href = 'jobsentinel://jobs';

  setTimeout(() => {
    window.close();
  }, 500);
}

/**
 * Open settings
 */
function openSettings(e) {
  e.preventDefault();

  // Open options page
  chrome.runtime.openOptionsPage();
}

/**
 * Open help page
 */
function openHelp(e) {
  e.preventDefault();

  // Open help documentation
  chrome.tabs.create({
    url: 'https://github.com/jobsentinel/docs/browser-extension'
  });
}
