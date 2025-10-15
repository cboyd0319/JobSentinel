/**
 * JobSentinel Browser Extension - Popup Script
 * Handles quick-add form for saving jobs to tracker
 */

let currentTab = null;
let scrapedData = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  currentTab = tab;
  
  // Try to scrape job data from page
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {action: 'scrapeJob'});
    
    if (response?.success && response.data) {
      scrapedData = response.data;
      // Pre-fill form
      document.getElementById('title').value = response.data.title || '';
      document.getElementById('company').value = response.data.company || '';
      document.getElementById('location').value = response.data.location || '';
    }
  } catch (error) {
    console.log('Could not scrape page (this is normal for non-job pages):', error);
  }
  
  // Form submission
  document.getElementById('quickAddForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveJob();
  });
  
  // Settings links
  document.getElementById('open-tracker').addEventListener('click', async (e) => {
    e.preventDefault();
    const apiUrl = await getApiUrl();
    chrome.tabs.create({url: `${apiUrl}/tracker/`});
  });
  
  document.getElementById('configure').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

async function saveJob() {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';
  
  // Collect form data
  const jobData = {
    title: document.getElementById('title').value,
    company: document.getElementById('company').value,
    location: document.getElementById('location').value,
    url: currentTab.url,
    description: scrapedData?.description || '',
    source: 'browser_extension',
  };
  
  const trackerData = {
    status: document.getElementById('status-select').value,
    priority: parseInt(document.getElementById('priority').value),
    notes: document.getElementById('notes').value,
  };
  
  try {
    const apiUrl = await getApiUrl();
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      showStatus('Please configure API key in extension settings', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Job';
      return;
    }
    
    // Step 1: Create job
    const jobResponse = await fetch(`${apiUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(jobData)
    });
    
    if (!jobResponse.ok) {
      const error = await jobResponse.json();
      throw new Error(error.error || 'Failed to create job');
    }
    
    const job = await jobResponse.json();
    
    // Step 2: Add to tracker
    const trackerResponse = await fetch(`${apiUrl}/api/v1/tracker/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        job_id: job.id,
        ...trackerData
      })
    });
    
    if (!trackerResponse.ok) {
      const error = await trackerResponse.json();
      throw new Error(error.error || 'Failed to add to tracker');
    }
    
    // Success!
    showStatus('✓ Job saved successfully!', 'success');
    
    // Close popup after 1 second
    setTimeout(() => {
      window.close();
    }, 1000);
    
  } catch (error) {
    console.error('Error saving job:', error);
    showStatus(`Failed to save: ${error.message}`, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Job';
  }
}

async function getApiUrl() {
  const storage = await chrome.storage.sync.get('apiUrl');
  return storage.apiUrl || 'http://localhost:5000';
}

async function getApiKey() {
  const storage = await chrome.storage.sync.get('apiKey');
  return storage.apiKey || '';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}
