/**
 * JobSentinel Browser Extension - Content Script
 * Scrapes job data from various job board pages
 */

function scrapeJobData() {
  const url = window.location.href;
  
  // LinkedIn
  if (url.includes('linkedin.com/jobs')) {
    return {
      source: 'linkedin',
      title: document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim(),
      company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim(),
      location: document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim(),
      description: document.querySelector('.jobs-description__content')?.innerText,
      url: url.split('?')[0]
    };
  }
  
  // Indeed
  if (url.includes('indeed.com/viewjob')) {
    return {
      source: 'indeed',
      title: document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim(),
      company: document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim(),
      location: document.querySelector('[data-testid="job-location"]')?.textContent?.trim(),
      description: document.querySelector('#jobDescriptionText')?.innerText,
      url: url
    };
  }
  
  // Glassdoor
  if (url.includes('glassdoor.com/job-listing')) {
    return {
      source: 'glassdoor',
      title: document.querySelector('[data-test="job-title"]')?.textContent?.trim(),
      company: document.querySelector('[data-test="employer-name"]')?.textContent?.trim(),
      location: document.querySelector('[data-test="location"]')?.textContent?.trim(),
      description: document.querySelector('.jobDescriptionContent')?.innerText,
      url: url
    };
  }
  
  // Greenhouse
  if (url.includes('greenhouse.io/jobs')) {
    return {
      source: 'greenhouse',
      title: document.querySelector('.app-title')?.textContent?.trim(),
      company: document.querySelector('.company-name')?.textContent?.trim(),
      location: document.querySelector('.location')?.textContent?.trim(),
      description: document.querySelector('#content')?.innerText,
      url: url
    };
  }
  
  // Lever
  if (url.includes('jobs.lever.co')) {
    return {
      source: 'lever',
      title: document.querySelector('.posting-headline h2')?.textContent?.trim(),
      company: document.querySelector('.main-header-text-company-name')?.textContent?.trim() ||
                document.querySelector('.posting-headline .company-name')?.textContent?.trim(),
      location: document.querySelector('.posting-categories .location')?.textContent?.trim(),
      description: document.querySelector('.posting-description')?.innerText,
      url: url
    };
  }
  
  return null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    const jobData = scrapeJobData();
    sendResponse({success: !!jobData, data: jobData});
  }
  return true; // Keeps the message channel open for async response
});
