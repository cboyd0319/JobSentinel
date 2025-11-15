/**
 * Background Service Worker
 *
 * Handles communication between content scripts and JobSentinel desktop app.
 * Uses WebSocket for real-time sync with desktop app.
 */

const WEBSOCKET_URL = 'ws://localhost:8765'; // Desktop app WebSocket server
const RECONNECT_INTERVAL = 5000; // 5 seconds

let ws = null;
let isConnected = false;
let reconnectTimer = null;

// Initialize WebSocket connection
function connectToDesktop() {
  console.log('[JobSentinel] Connecting to desktop app...');

  try {
    ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log('[JobSentinel] Connected to desktop app');
      isConnected = true;
      clearTimeout(reconnectTimer);

      // Send ping to verify connection
      sendToDesktop({ action: 'ping' });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[JobSentinel] Received from desktop:', message);
        handleDesktopMessage(message);
      } catch (error) {
        console.error('[JobSentinel] Error parsing message from desktop:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[JobSentinel] WebSocket error:', error);
      isConnected = false;
    };

    ws.onclose = () => {
      console.log('[JobSentinel] Disconnected from desktop app');
      isConnected = false;

      // Attempt to reconnect
      reconnectTimer = setTimeout(connectToDesktop, RECONNECT_INTERVAL);
    };
  } catch (error) {
    console.error('[JobSentinel] Error creating WebSocket:', error);
    isConnected = false;

    // Attempt to reconnect
    reconnectTimer = setTimeout(connectToDesktop, RECONNECT_INTERVAL);
  }
}

// Send message to desktop app
function sendToDesktop(message) {
  if (isConnected && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  } else {
    console.warn('[JobSentinel] Not connected to desktop app');
    return false;
  }
}

// Handle messages from desktop app
function handleDesktopMessage(message) {
  switch (message.action) {
    case 'pong':
      console.log('[JobSentinel] Desktop app is responsive');
      break;

    case 'jobSaved':
      console.log('[JobSentinel] Job saved confirmation:', message.jobHash);
      break;

    case 'scoreUpdated':
      console.log('[JobSentinel] Score updated:', message.jobHash, message.score);
      break;

    default:
      console.log('[JobSentinel] Unknown message from desktop:', message);
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[JobSentinel] Received message:', request.action);

  switch (request.action) {
    case 'checkJob':
      handleCheckJob(request.jobData).then(sendResponse);
      return true; // Async response

    case 'saveJob':
      handleSaveJob(request.jobData, request.score).then(sendResponse);
      return true; // Async response

    case 'getMatchFactors':
      handleGetMatchFactors(request.jobData).then(sendResponse);
      return true; // Async response

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Check if job exists and get score
async function handleCheckJob(jobData) {
  if (!isConnected) {
    // Fallback: calculate basic score without desktop app
    const score = calculateBasicScore(jobData);
    return {
      success: true,
      isAlreadySaved: false,
      score: score
    };
  }

  return new Promise((resolve) => {
    const requestId = generateRequestId();

    // Set up response listener
    const listener = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.requestId === requestId && message.action === 'checkJobResponse') {
          ws.removeEventListener('message', listener);
          resolve({
            success: true,
            isAlreadySaved: message.isAlreadySaved,
            score: message.score
          });
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', listener);

    // Send check request
    sendToDesktop({
      action: 'checkJob',
      requestId: requestId,
      jobHash: jobData.hash,
      jobData: jobData
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      ws.removeEventListener('message', listener);
      const score = calculateBasicScore(jobData);
      resolve({
        success: true,
        isAlreadySaved: false,
        score: score
      });
    }, 5000);
  });
}

// Save job to desktop app
async function handleSaveJob(jobData, score) {
  if (!isConnected) {
    return {
      success: false,
      error: 'Desktop app not connected'
    };
  }

  return new Promise((resolve) => {
    const requestId = generateRequestId();

    // Set up response listener
    const listener = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.requestId === requestId && message.action === 'saveJobResponse') {
          ws.removeEventListener('message', listener);
          resolve({
            success: message.success,
            error: message.error
          });
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', listener);

    // Send save request
    sendToDesktop({
      action: 'saveJob',
      requestId: requestId,
      jobData: jobData,
      score: score
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      ws.removeEventListener('message', listener);
      resolve({
        success: false,
        error: 'Timeout waiting for desktop app response'
      });
    }, 10000);
  });
}

// Get match factors for job
async function handleGetMatchFactors(jobData) {
  if (!isConnected) {
    // Return basic factors
    return {
      success: true,
      factors: calculateBasicFactors(jobData)
    };
  }

  return new Promise((resolve) => {
    const requestId = generateRequestId();

    // Set up response listener
    const listener = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.requestId === requestId && message.action === 'matchFactorsResponse') {
          ws.removeEventListener('message', listener);
          resolve({
            success: true,
            factors: message.factors
          });
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', listener);

    // Send match factors request
    sendToDesktop({
      action: 'getMatchFactors',
      requestId: requestId,
      jobData: jobData
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      ws.removeEventListener('message', listener);
      resolve({
        success: true,
        factors: calculateBasicFactors(jobData)
      });
    }, 5000);
  });
}

// Calculate basic score (fallback when desktop app is not connected)
function calculateBasicScore(jobData) {
  let score = 0.5; // Base score

  // Check for remote work
  if (jobData.location && jobData.location.toLowerCase().includes('remote')) {
    score += 0.2;
  }

  // Check for keywords in title
  const title = jobData.title.toLowerCase();
  const goodKeywords = ['senior', 'lead', 'principal', 'staff', 'engineer'];
  const badKeywords = ['junior', 'intern', 'entry'];

  for (const keyword of goodKeywords) {
    if (title.includes(keyword)) {
      score += 0.1;
      break;
    }
  }

  for (const keyword of badKeywords) {
    if (title.includes(keyword)) {
      score -= 0.1;
      break;
    }
  }

  // Clamp score between 0 and 1
  return Math.max(0, Math.min(1, score));
}

// Calculate basic match factors (fallback)
function calculateBasicFactors(jobData) {
  const title = jobData.title.toLowerCase();
  const description = jobData.description.toLowerCase();

  // Very basic keyword matching
  const skills = ['python', 'javascript', 'react', 'typescript', 'node', 'aws'];
  let skillsFound = 0;
  for (const skill of skills) {
    if (description.includes(skill)) {
      skillsFound++;
    }
  }

  return {
    skills: Math.min(1.0, skillsFound / 3), // Max out at 3 skills
    salary: 0.7, // Default
    location: jobData.location.toLowerCase().includes('remote') ? 1.0 : 0.5,
    seniority: title.includes('senior') ? 1.0 : 0.6
  };
}

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize connection on startup
connectToDesktop();

console.log('[JobSentinel] Service worker initialized');
