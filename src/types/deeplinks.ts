/**
 * Deep Link Types
 *
 * TypeScript definitions for the Deep Link Generator feature.
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

/**
 * Category display metadata
 */
export interface CategoryMetadata {
  category: SiteCategory;
  label: string;
  description: string;
  icon: "globe" | "laptop" | "building" | "remote" | "rocket" | "lock" | "briefcase";
  selectedClassName: string;
}

/**
 * Metadata for each category
 */
export const CATEGORY_METADATA: Record<SiteCategory, CategoryMetadata> = {
  [SiteCategory.General]: {
    category: SiteCategory.General,
    label: "General",
    description: "Large job boards with millions of listings",
    icon: "globe",
    selectedClassName: "bg-blue-600 text-white",
  },
  [SiteCategory.Tech]: {
    category: SiteCategory.Tech,
    label: "Tech",
    description: "Technology and IT-focused job boards",
    icon: "laptop",
    selectedClassName: "bg-purple-600 text-white",
  },
  [SiteCategory.Government]: {
    category: SiteCategory.Government,
    label: "Government",
    description: "Federal, state, and local government positions",
    icon: "building",
    selectedClassName: "bg-indigo-600 text-white",
  },
  [SiteCategory.Remote]: {
    category: SiteCategory.Remote,
    label: "Remote",
    description: "Remote and flexible work opportunities",
    icon: "remote",
    selectedClassName: "bg-green-600 text-white",
  },
  [SiteCategory.Startups]: {
    category: SiteCategory.Startups,
    label: "Startups",
    description: "Early-stage companies and startup jobs",
    icon: "rocket",
    selectedClassName: "bg-orange-600 text-white",
  },
  [SiteCategory.Cleared]: {
    category: SiteCategory.Cleared,
    label: "Cleared",
    description: "Jobs requiring security clearances",
    icon: "lock",
    selectedClassName: "bg-red-600 text-white",
  },
  [SiteCategory.Professional]: {
    category: SiteCategory.Professional,
    label: "Professional",
    description: "Professional networking and career sites",
    icon: "briefcase",
    selectedClassName: "bg-sky-600 text-white",
  },
};
