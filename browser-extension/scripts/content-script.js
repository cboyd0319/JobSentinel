/**
 * Content Script
 *
 * Main content script that runs on job posting pages.
 * Detects jobs, scores them, and shows the overlay.
 */

(async function() {
  'use strict';

  console.log('[JobSentinel] Content script loaded');

  // Check if current page is a job posting
  const platform = JobDetector.detectPlatform();

  if (!platform) {
    console.log('[JobSentinel] Not a job posting page');
    return;
  }

  console.log(`[JobSentinel] Detected ${platform} job page`);

  // Wait for page to fully load
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // Additional wait to ensure dynamic content is loaded
  await sleep(1000);

  // Extract job data
  const jobData = JobDetector.extractJobData(platform);

  if (!jobData || !jobData.title) {
    console.log('[JobSentinel] Could not extract job data');
    return;
  }

  console.log('[JobSentinel] Extracted job data:', jobData);

  // Generate job hash
  const jobHash = await JobDetector.generateJobHash(jobData);
  jobData.hash = jobHash;

  // Check if job is already saved and get score
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkJob',
      jobData: jobData
    });

    if (response.success) {
      const { isAlreadySaved, score } = response;

      console.log(`[JobSentinel] Job score: ${score}, Already saved: ${isAlreadySaved}`);

      // Show overlay with score
      ScoringOverlay.show(jobData, score, isAlreadySaved);
    } else {
      console.error('[JobSentinel] Error checking job:', response.error);
    }
  } catch (error) {
    console.error('[JobSentinel] Error communicating with background script:', error);

    // Show overlay with default score if communication fails
    ScoringOverlay.show(jobData, 0.5, false);
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Listen for URL changes (for single-page applications)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[JobSentinel] URL changed, reloading');
      location.reload(); // Reload to re-detect job
    }
  }).observe(document, { subtree: true, childList: true });

})();
