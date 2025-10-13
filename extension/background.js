/**
 * JobSentinel Browser Extension - Background Service Worker
 * Handles extension lifecycle and background tasks
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('JobSentinel extension installed');
  
  // Set default API URL
  chrome.storage.sync.get(['apiUrl'], (result) => {
    if (!result.apiUrl) {
      chrome.storage.sync.set({
        apiUrl: 'http://localhost:5000'
      });
    }
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'testConnection') {
    testAPIConnection()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // Keeps the message channel open
  }
});

async function testAPIConnection() {
  const {apiUrl, apiKey} = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
  
  if (!apiKey) {
    return {success: false, error: 'No API key configured'};
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/v1/tracker/jobs`, {
      headers: {
        'X-API-Key': apiKey
      }
    });
    
    if (response.ok) {
      return {success: true};
    } else {
      return {success: false, error: `HTTP ${response.status}`};
    }
  } catch (error) {
    return {success: false, error: error.message};
  }
}
