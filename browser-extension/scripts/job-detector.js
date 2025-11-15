/**
 * Job Detector
 *
 * Detects job posting pages on supported ATS platforms and extracts job data.
 * Supports: Greenhouse, Lever, Workday, Indeed, LinkedIn, iCIMS, BambooHR, Ashby
 */

const JobDetector = {
  /**
   * Detect ATS platform from URL and page structure
   * @returns {string|null} ATS platform name or null if not a job page
   */
  detectPlatform() {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Greenhouse
    if (url.includes('boards.greenhouse.io')) {
      return 'greenhouse';
    }

    // Lever
    if (url.includes('lever.co') && url.includes('/jobs/')) {
      return 'lever';
    }

    // Workday
    if (hostname.includes('myworkdayjobs.com')) {
      return 'workday';
    }

    // Indeed
    if (hostname.includes('indeed.com') && url.includes('/viewjob')) {
      return 'indeed';
    }

    // LinkedIn
    if (hostname.includes('linkedin.com') && url.includes('/jobs/view/')) {
      return 'linkedin';
    }

    // iCIMS
    if (hostname.includes('icims.com') && url.includes('/jobs/')) {
      return 'icims';
    }

    // BambooHR
    if (hostname.includes('bamboohr.com') && url.includes('/jobs/')) {
      return 'bamboohr';
    }

    // Ashby
    if (url.includes('jobs.ashbyhq.com')) {
      return 'ashbyhq';
    }

    return null;
  },

  /**
   * Extract job data from the current page
   * @param {string} platform - ATS platform name
   * @returns {object|null} Job data object or null if extraction fails
   */
  extractJobData(platform) {
    try {
      switch (platform) {
        case 'greenhouse':
          return this.extractGreenhouse();
        case 'lever':
          return this.extractLever();
        case 'workday':
          return this.extractWorkday();
        case 'indeed':
          return this.extractIndeed();
        case 'linkedin':
          return this.extractLinkedIn();
        case 'icims':
          return this.extractIcims();
        case 'bamboohr':
          return this.extractBambooHR();
        case 'ashbyhq':
          return this.extractAshby();
        default:
          return null;
      }
    } catch (error) {
      console.error('[JobSentinel] Error extracting job data:', error);
      return null;
    }
  },

  /**
   * Extract job data from Greenhouse
   */
  extractGreenhouse() {
    const title = document.querySelector('.app-title')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();

    const company = document.querySelector('.company-name')?.textContent?.trim() ||
                    document.location.hostname.split('.')[0];

    const location = document.querySelector('.location')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('#content')?.textContent?.trim() ||
                        document.querySelector('.job-description')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'greenhouse'
    };
  },

  /**
   * Extract job data from Lever
   */
  extractLever() {
    const title = document.querySelector('.posting-headline h2')?.textContent?.trim() ||
                  document.querySelector('h2')?.textContent?.trim();

    const company = document.querySelector('.main-header-text a')?.textContent?.trim() ||
                    'Unknown Company';

    const location = document.querySelector('.posting-categories .location')?.textContent?.trim() ||
                     document.querySelector('.workplaceTypes')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('.section-wrapper')?.textContent?.trim() ||
                        document.querySelector('.content')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'lever'
    };
  },

  /**
   * Extract job data from Workday
   */
  extractWorkday() {
    const title = document.querySelector('[data-automation-id="jobPostingHeader"]')?.textContent?.trim() ||
                  document.querySelector('h2')?.textContent?.trim();

    const company = document.querySelector('[data-automation-id="company"]')?.textContent?.trim() ||
                    document.location.hostname.split('.')[0];

    const location = document.querySelector('[data-automation-id="locations"]')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('[data-automation-id="jobPostingDescription"]')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'workday'
    };
  },

  /**
   * Extract job data from Indeed
   */
  extractIndeed() {
    const title = document.querySelector('[class*="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();

    const company = document.querySelector('[data-company-name="true"]')?.textContent?.trim() ||
                    document.querySelector('[class*="InlineCompanyRating"]')?.textContent?.trim() ||
                    'Unknown Company';

    const location = document.querySelector('[class*="jobsearch-JobInfoHeader-subtitle"] > div')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('#jobDescriptionText')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'indeed'
    };
  },

  /**
   * Extract job data from LinkedIn
   */
  extractLinkedIn() {
    const title = document.querySelector('.top-card-layout__title')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();

    const company = document.querySelector('.topcard__org-name-link')?.textContent?.trim() ||
                    document.querySelector('.top-card-layout__card a')?.textContent?.trim() ||
                    'Unknown Company';

    const location = document.querySelector('.topcard__flavor--bullet')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('.show-more-less-html__markup')?.textContent?.trim() ||
                        document.querySelector('.description__text')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'linkedin'
    };
  },

  /**
   * Extract job data from iCIMS
   */
  extractIcims() {
    const title = document.querySelector('.iCIMS_Header h1')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();

    const company = document.querySelector('.iCIMS_Header .iCIMS_CompanyName')?.textContent?.trim() ||
                    document.location.hostname.split('.')[0];

    const location = document.querySelector('.iCIMS_Location')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('.iCIMS_JobContent')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'icims'
    };
  },

  /**
   * Extract job data from BambooHR
   */
  extractBambooHR() {
    const title = document.querySelector('.BambooHR-ATS-board__header h2')?.textContent?.trim() ||
                  document.querySelector('h2')?.textContent?.trim();

    const company = document.querySelector('.BambooHR-ATS-board__company')?.textContent?.trim() ||
                    document.location.hostname.split('.')[0];

    const location = document.querySelector('.BambooHR-ATS-board__location')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('.BambooHR-ATS-board__description')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'bamboohr'
    };
  },

  /**
   * Extract job data from Ashby
   */
  extractAshby() {
    const title = document.querySelector('[class*="JobTitle"]')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();

    const company = document.querySelector('[class*="CompanyName"]')?.textContent?.trim() ||
                    'Unknown Company';

    const location = document.querySelector('[class*="Location"]')?.textContent?.trim() ||
                     'Not specified';

    const description = document.querySelector('[class*="JobDescription"]')?.textContent?.trim() ||
                        document.querySelector('article')?.textContent?.trim() ||
                        '';

    return {
      title,
      company,
      location,
      description,
      url: window.location.href,
      source: 'ashbyhq'
    };
  },

  /**
   * Generate a unique hash for the job (for deduplication)
   * @param {object} jobData - Job data object
   * @returns {string} SHA-256 hash (first 16 chars)
   */
  async generateJobHash(jobData) {
    const str = `${jobData.company}|${jobData.title}|${jobData.location}|${jobData.url}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // First 16 characters
  },

  /**
   * Check if current page is a job posting
   * @returns {boolean}
   */
  isJobPage() {
    return this.detectPlatform() !== null;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JobDetector;
}
