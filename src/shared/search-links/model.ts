/**
 * Search link model shared by features that open job-site searches.
 *
 * Backend field names remain snake_case because this is an IPC contract.
 */

/**
 * Search criteria for generating deep links
 */
export interface SearchCriteria {
  /** Job title or keywords (e.g., "Marketing Manager") */
  query: string;
  /** Location (city, state, zip, or "remote") */
  location?: string;
  /** Experience level filter */
  experience_level?: ExperienceLevel;
  /** Job type filter */
  job_type?: JobType;
  /** Remote/hybrid/onsite preference */
  remote_type?: RemoteType;
}

/**
 * Experience level for job searches
 */
export enum ExperienceLevel {
  Internship = "internship",
  EntryLevel = "entrylevel",
  MidLevel = "midlevel",
  Senior = "senior",
  Lead = "lead",
  Manager = "manager",
  Director = "director",
  Executive = "executive",
}

/**
 * Job type filter
 */
export enum JobType {
  FullTime = "fulltime",
  PartTime = "parttime",
  Contract = "contract",
  Temporary = "temporary",
  Internship = "internship",
  Volunteer = "volunteer",
}

/**
 * Remote work type
 */
export enum RemoteType {
  Remote = "remote",
  Hybrid = "hybrid",
  Onsite = "onsite",
}

/**
 * A generated deep link to a job site
 */
export interface DeepLink {
  /** Site information */
  site: SiteInfo;
  /** Generated URL with search parameters */
  url: string;
}

/**
 * Job site information
 */
export interface SiteInfo {
  /** Site identifier (e.g., "linkedin", "indeed") */
  id: string;
  /** Display name (e.g., "LinkedIn") */
  name: string;
  /** Site category */
  category: SiteCategory;
  /** Whether the site requires login to view full results */
  requires_login: boolean;
  /** Whether JobSentinel should require a warning acknowledgement before opening */
  requires_user_acknowledgement?: boolean;
  /** URL to site logo (optional) */
  logo_url?: string;
  /** Additional notes about the site */
  notes?: string;
}

/**
 * Job site category
 */
export enum SiteCategory {
  General = "general",
  Tech = "tech",
  Government = "government",
  Remote = "remote",
  Startups = "startups",
  Cleared = "cleared",
  Professional = "professional",
}
