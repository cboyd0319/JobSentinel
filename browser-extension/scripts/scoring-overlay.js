/**
 * Scoring Overlay
 *
 * Displays job score overlay on job posting pages with save functionality.
 */

const ScoringOverlay = {
  overlayElement: null,
  jobData: null,
  score: null,

  /**
   * Initialize and show the overlay
   * @param {object} jobData - Job data from detector
   * @param {number} score - Job score (0.0 to 1.0)
   * @param {boolean} isAlreadySaved - Whether job is already in JobSentinel
   */
  show(jobData, score, isAlreadySaved = false) {
    this.jobData = jobData;
    this.score = score;

    // Remove existing overlay if present
    this.remove();

    // Create overlay element
    this.overlayElement = this.createOverlay(score, isAlreadySaved);
    document.body.appendChild(this.overlayElement);

    // Add event listeners
    this.attachEventListeners();
  },

  /**
   * Create overlay HTML element
   * @param {number} score - Job score
   * @param {boolean} isAlreadySaved - Whether job is saved
   * @returns {HTMLElement}
   */
  createOverlay(score, isAlreadySaved) {
    const overlay = document.createElement('div');
    overlay.id = 'jobsentinel-overlay';
    overlay.className = 'jobsentinel-overlay';

    const scorePercentage = Math.round(score * 100);
    const scoreColor = this.getScoreColor(score);
    const scoreGrade = this.getScoreGrade(score);

    overlay.innerHTML = `
      <div class="jobsentinel-header">
        <div class="jobsentinel-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>JobSentinel</span>
        </div>
        <button class="jobsentinel-close" title="Close">&times;</button>
      </div>

      <div class="jobsentinel-score">
        <div class="score-circle" style="--score-color: ${scoreColor}">
          <svg width="100" height="100">
            <circle cx="50" cy="50" r="45" stroke="#e0e0e0" stroke-width="8" fill="none"/>
            <circle cx="50" cy="50" r="45" stroke="${scoreColor}" stroke-width="8" fill="none"
                    stroke-dasharray="${283 * score} 283" stroke-linecap="round"
                    transform="rotate(-90 50 50)"/>
          </svg>
          <div class="score-text">
            <span class="score-value">${scorePercentage}</span>
            <span class="score-label">Score</span>
          </div>
        </div>
        <div class="score-grade" style="color: ${scoreColor}">${scoreGrade}</div>
      </div>

      <div class="jobsentinel-actions">
        ${isAlreadySaved
          ? '<button class="jobsentinel-btn jobsentinel-btn-saved" disabled>✓ Already Saved</button>'
          : '<button class="jobsentinel-btn jobsentinel-btn-primary" id="jobsentinel-save-btn">Save to JobSentinel</button>'
        }
        <button class="jobsentinel-btn jobsentinel-btn-secondary" id="jobsentinel-details-btn">View Details</button>
      </div>

      <div class="jobsentinel-match-factors" id="jobsentinel-match-factors" style="display: none;">
        <h4>Match Factors</h4>
        <div class="factors-loading">Calculating...</div>
      </div>

      <div class="jobsentinel-footer">
        <a href="#" id="jobsentinel-open-app">Open Desktop App</a>
      </div>
    `;

    return overlay;
  },

  /**
   * Get color for score
   * @param {number} score - Score (0.0 to 1.0)
   * @returns {string} Color hex code
   */
  getScoreColor(score) {
    if (score >= 0.8) return '#10b981'; // Green (Excellent)
    if (score >= 0.6) return '#3b82f6'; // Blue (Good)
    if (score >= 0.4) return '#f59e0b'; // Orange (Fair)
    return '#ef4444'; // Red (Poor)
  },

  /**
   * Get letter grade for score
   * @param {number} score - Score (0.0 to 1.0)
   * @returns {string} Letter grade
   */
  getScoreGrade(score) {
    if (score >= 0.9) return 'A+';
    if (score >= 0.8) return 'A';
    if (score >= 0.7) return 'B+';
    if (score >= 0.6) return 'B';
    if (score >= 0.5) return 'C+';
    if (score >= 0.4) return 'C';
    return 'D';
  },

  /**
   * Attach event listeners to overlay buttons
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.overlayElement.querySelector('.jobsentinel-close');
    closeBtn?.addEventListener('click', () => this.remove());

    // Save button
    const saveBtn = this.overlayElement.querySelector('#jobsentinel-save-btn');
    saveBtn?.addEventListener('click', () => this.handleSave());

    // Details button
    const detailsBtn = this.overlayElement.querySelector('#jobsentinel-details-btn');
    detailsBtn?.addEventListener('click', () => this.toggleDetails());

    // Open app link
    const openAppLink = this.overlayElement.querySelector('#jobsentinel-open-app');
    openAppLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openDesktopApp();
    });

    // Make draggable
    this.makeDraggable();
  },

  /**
   * Handle save button click
   */
  async handleSave() {
    const saveBtn = this.overlayElement.querySelector('#jobsentinel-save-btn');
    if (!saveBtn) return;

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      // Send message to background script to save job
      const response = await chrome.runtime.sendMessage({
        action: 'saveJob',
        jobData: this.jobData,
        score: this.score
      });

      if (response.success) {
        saveBtn.textContent = '✓ Saved!';
        saveBtn.className = 'jobsentinel-btn jobsentinel-btn-saved';
        this.showNotification('Job saved to JobSentinel!', 'success');
      } else {
        throw new Error(response.error || 'Failed to save job');
      }
    } catch (error) {
      console.error('[JobSentinel] Error saving job:', error);
      saveBtn.textContent = 'Save Failed';
      saveBtn.disabled = false;
      this.showNotification('Failed to save job. Is desktop app running?', 'error');
    }
  },

  /**
   * Toggle match factors visibility
   */
  async toggleDetails() {
    const factorsDiv = this.overlayElement.querySelector('#jobsentinel-match-factors');
    const detailsBtn = this.overlayElement.querySelector('#jobsentinel-details-btn');

    if (factorsDiv.style.display === 'none') {
      factorsDiv.style.display = 'block';
      detailsBtn.textContent = 'Hide Details';

      // Load match factors if not already loaded
      if (factorsDiv.querySelector('.factors-loading')) {
        await this.loadMatchFactors();
      }
    } else {
      factorsDiv.style.display = 'none';
      detailsBtn.textContent = 'View Details';
    }
  },

  /**
   * Load and display match factors
   */
  async loadMatchFactors() {
    const factorsDiv = this.overlayElement.querySelector('#jobsentinel-match-factors');

    try {
      // Request match factors from background script
      const response = await chrome.runtime.sendMessage({
        action: 'getMatchFactors',
        jobData: this.jobData
      });

      if (response.success && response.factors) {
        this.displayMatchFactors(response.factors);
      } else {
        factorsDiv.innerHTML = '<p>Could not load match factors.</p>';
      }
    } catch (error) {
      console.error('[JobSentinel] Error loading match factors:', error);
      factorsDiv.innerHTML = '<p>Error loading match factors.</p>';
    }
  },

  /**
   * Display match factors in the overlay
   * @param {object} factors - Match factors data
   */
  displayMatchFactors(factors) {
    const factorsDiv = this.overlayElement.querySelector('#jobsentinel-match-factors');

    const html = `
      <h4>Match Factors</h4>
      <div class="factor-list">
        ${factors.skills ? `
          <div class="factor-item">
            <span class="factor-label">Skills Match:</span>
            <span class="factor-value">${Math.round(factors.skills * 100)}%</span>
          </div>
        ` : ''}
        ${factors.salary ? `
          <div class="factor-item">
            <span class="factor-label">Salary:</span>
            <span class="factor-value">${Math.round(factors.salary * 100)}%</span>
          </div>
        ` : ''}
        ${factors.location ? `
          <div class="factor-item">
            <span class="factor-label">Location:</span>
            <span class="factor-value">${Math.round(factors.location * 100)}%</span>
          </div>
        ` : ''}
        ${factors.seniority ? `
          <div class="factor-item">
            <span class="factor-label">Seniority:</span>
            <span class="factor-value">${Math.round(factors.seniority * 100)}%</span>
          </div>
        ` : ''}
      </div>
    `;

    factorsDiv.innerHTML = html;
  },

  /**
   * Open desktop app (via custom protocol)
   */
  openDesktopApp() {
    // Try to open via custom protocol (jobsentinel://)
    window.location.href = 'jobsentinel://open';

    this.showNotification('Opening JobSentinel desktop app...', 'info');
  },

  /**
   * Show notification toast
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `jobsentinel-notification jobsentinel-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  /**
   * Make overlay draggable
   */
  makeDraggable() {
    const header = this.overlayElement.querySelector('.jobsentinel-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('jobsentinel-close')) return;

      isDragging = true;
      initialX = e.clientX - this.overlayElement.offsetLeft;
      initialY = e.clientY - this.overlayElement.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        this.overlayElement.style.left = currentX + 'px';
        this.overlayElement.style.top = currentY + 'px';
        this.overlayElement.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  },

  /**
   * Remove overlay from page
   */
  remove() {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScoringOverlay;
}
