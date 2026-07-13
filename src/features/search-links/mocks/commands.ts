import {
  ExperienceLevel,
  JobType,
  RemoteType,
  SiteCategory,
} from "../../../shared/search-links";
import type { DeepLink, SearchCriteria, SiteInfo } from "../../../shared/search-links";
import {
  getArg,
  getStringArg,
} from "../../../mocks/handlers/commandHelpers";
import { isSafeExternalHttpsUrl } from "../../../mocks/externalUrlSafety";

export interface MockSearchLinksCommandResult {
  handled: boolean;
  value: unknown;
}

const MOCK_DEEP_LINK_SITES = [
  {
    id: "indeed",
    name: "Indeed",
    category: SiteCategory.General,
    requires_login: false,
    notes: "Largest job board with millions of listings",
  },
  {
    id: "monster",
    name: "Monster",
    category: SiteCategory.General,
    requires_login: false,
    notes: "Established job board with career resources",
  },
  {
    id: "careerbuilder",
    name: "CareerBuilder",
    category: SiteCategory.General,
    requires_login: false,
  },
  {
    id: "simplyhired",
    name: "SimplyHired",
    category: SiteCategory.General,
    requires_login: false,
    notes: "Job aggregator with salary estimates",
  },
  {
    id: "ziprecruiter",
    name: "ZipRecruiter",
    category: SiteCategory.General,
    requires_login: false,
    notes: "General job board with Application Assist support",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: SiteCategory.Professional,
    requires_login: true,
    notes: "Professional network with extensive job listings",
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    category: SiteCategory.Professional,
    requires_login: true,
    notes: "Job board with company reviews and salaries",
  },
  {
    id: "dice",
    name: "Dice",
    category: SiteCategory.Tech,
    requires_login: false,
    notes: "Technology and IT-focused job board",
  },
  {
    id: "usajobs",
    name: "USAJobs",
    category: SiteCategory.Government,
    requires_login: false,
    notes: "Official federal government job board",
  },
  {
    id: "governmentjobs",
    name: "GovernmentJobs",
    category: SiteCategory.Government,
    requires_login: false,
    notes: "State and local government positions",
  },
  {
    id: "cajobs",
    name: "CalCareers (California)",
    category: SiteCategory.Government,
    requires_login: false,
    notes: "California state government jobs",
  },
  {
    id: "texasjobs",
    name: "CAPPS (Texas)",
    category: SiteCategory.Government,
    requires_login: false,
    notes: "Texas state government jobs",
  },
  {
    id: "clearancejobs",
    name: "ClearanceJobs",
    category: SiteCategory.Cleared,
    requires_login: false,
    notes: "Jobs requiring security clearances",
  },
  {
    id: "flexjobs",
    name: "FlexJobs",
    category: SiteCategory.Remote,
    requires_login: true,
    notes: "Curated remote and flexible jobs (subscription)",
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    category: SiteCategory.Remote,
    requires_login: false,
    notes: "Popular remote job board",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    category: SiteCategory.Remote,
    requires_login: false,
    notes: "Remote jobs aggregator",
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList)",
    category: SiteCategory.Startups,
    requires_login: true,
    notes: "Startup jobs with equity information",
  },
  {
    id: "ycombinator",
    name: "Y Combinator Jobs",
    category: SiteCategory.Startups,
    requires_login: false,
    notes: "Jobs at Y Combinator companies",
  },
] as const satisfies readonly SiteInfo[];

const LINKEDIN_JOB_TYPE_PARAMS: Partial<Record<JobType, string>> = {
  [JobType.FullTime]: "F",
  [JobType.PartTime]: "P",
  [JobType.Contract]: "C",
  [JobType.Temporary]: "T",
  [JobType.Internship]: "I",
};

const LINKEDIN_REMOTE_TYPE_PARAMS: Record<RemoteType, string> = {
  [RemoteType.Remote]: "2",
  [RemoteType.Hybrid]: "3",
  [RemoteType.Onsite]: "1",
};

const INDEED_JOB_TYPE_PARAMS: Partial<Record<JobType, string>> = {
  [JobType.FullTime]: "fulltime",
  [JobType.PartTime]: "parttime",
  [JobType.Contract]: "contract",
  [JobType.Temporary]: "temporary",
  [JobType.Internship]: "internship",
};

export function handleMockSearchLinksCommand(
  command: string,
  args: Record<string, unknown> | undefined,
): MockSearchLinksCommandResult {
  switch (command) {
    case "get_supported_sites":
      return handled(getMockSupportedSites());
    case "get_sites_by_category_cmd":
      return handled(getMockSitesByCategory(args));
    case "generate_deep_links":
      return handled(generateMockDeepLinks(args));
    case "generate_deep_link":
      return handled(generateMockDeepLink(args));
    case "open_deep_link":
      assertMockDeepLinkUrl(getStringArg(args, "url"));
      return handled(undefined);
    default:
      return { handled: false, value: undefined };
  }
}

export function getMockSupportedSites(): SiteInfo[] {
  return MOCK_DEEP_LINK_SITES.map((site) => ({ ...site }));
}

export function getMockSitesByCategory(args?: Record<string, unknown>): SiteInfo[] {
  const category = getArg(args, "category");
  if (!isSiteCategory(category)) {
    return [];
  }

  return getMockSupportedSites().filter((site) => site.category === category);
}

export function generateMockDeepLinks(args?: Record<string, unknown>): DeepLink[] {
  const criteria = getSearchCriteriaArg(args);
  return getMockSupportedSites().map((site) => ({
    site,
    url: generateMockDeepLinkUrl(site.id, criteria),
  }));
}

export function generateMockDeepLink(args?: Record<string, unknown>): DeepLink {
  const siteId = getStringArg(args, "siteId") ?? getStringArg(args, "site_id");
  const site = getMockSupportedSites().find((candidate) => candidate.id === siteId);
  if (!site) {
    throw new Error(`Unknown site ID: ${siteId ?? ""}`);
  }

  return {
    site,
    url: generateMockDeepLinkUrl(site.id, getSearchCriteriaArg(args)),
  };
}

export function assertMockDeepLinkUrl(url: string | undefined): void {
  if (!url || !isSafeExternalHttpsUrl(url)) {
    throw new Error("This job-site link is not safe to open");
  }
}

function getSearchCriteriaArg(args?: Record<string, unknown>): SearchCriteria {
  const source = getArg(args, "criteria");
  if (!isRecord(source)) {
    return { query: "" };
  }

  return {
    query: typeof source.query === "string" ? source.query : "",
    location: typeof source.location === "string" ? source.location : undefined,
    experience_level: isExperienceLevel(source.experience_level)
      ? source.experience_level
      : undefined,
    job_type: isJobType(source.job_type) ? source.job_type : undefined,
    remote_type: isRemoteType(source.remote_type) ? source.remote_type : undefined,
  };
}

function generateMockDeepLinkUrl(siteId: string, criteria: SearchCriteria): string {
  switch (siteId) {
    case "indeed":
      return buildIndeedUrl(criteria);
    case "linkedin":
      return buildLinkedinUrl(criteria);
    case "glassdoor":
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeQuery(criteria.query)}`;
    case "monster":
      return (
        appendLocation(
          `https://www.monster.com/jobs/search?q=${encodeQuery(criteria.query)}`,
          "where",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&jobtype=WORK_FROM_HOME" : "")
      );
    case "careerbuilder":
      return (
        appendLocation(
          `https://www.careerbuilder.com/jobs?keywords=${encodeQuery(criteria.query)}`,
          "location",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&emp=JTFT,JTFR" : "")
      );
    case "simplyhired":
      return (
        appendLocation(
          `https://www.simplyhired.com/search?q=${encodeQuery(criteria.query)}`,
          "l",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&job=z-remote" : "")
      );
    case "ziprecruiter":
      return (
        appendLocation(
          `https://www.ziprecruiter.com/jobs-search?search=${encodeQuery(criteria.query)}`,
          "location",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&refine_by_location_type=only_remote" : "")
      );
    case "dice":
      return (
        appendLocation(
          `https://www.dice.com/jobs?q=${encodeQuery(criteria.query)}`,
          "location",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&filters.isRemote=true" : "")
      );
    case "usajobs":
      return (
        appendLocation(
          `https://www.usajobs.gov/Search/Results?k=${encodeQuery(criteria.query)}`,
          "l",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&p=1" : "")
      );
    case "governmentjobs":
      return appendLocation(
        `https://www.governmentjobs.com/jobs?keyword=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      );
    case "cajobs":
      return `https://www.calcareers.ca.gov/CalHrPublic/Jobs/JobPosting.aspx?searchStr=${encodeQuery(criteria.query)}`;
    case "texasjobs":
      return `https://capps.taleo.net/careersection/ex/jobsearch.ftl?lang=en&keyword=${encodeQuery(criteria.query)}`;
    case "clearancejobs":
      return appendLocation(
        `https://www.clearancejobs.com/jobs?keywords=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      );
    case "flexjobs":
      return appendLocation(
        `https://www.flexjobs.com/search?search=${encodeQuery(criteria.query)}`,
        "location",
        criteria,
      );
    case "weworkremotely":
      return `https://weworkremotely.com/remote-jobs/search?term=${encodeQuery(criteria.query)}`;
    case "remoteok":
      return `https://remoteok.com/remote-jobs?search=${encodeQuery(criteria.query)}`;
    case "wellfound":
      return (
        appendLocation(
          `https://wellfound.com/jobs?keywords=${encodeQuery(criteria.query)}`,
          "location",
          criteria,
        ) + (criteria.remote_type === RemoteType.Remote ? "&remote=true" : "")
      );
    case "ycombinator":
      return `https://www.ycombinator.com/jobs?q=${encodeQuery(criteria.query)}`;
    default:
      throw new Error(`Unsupported site: ${siteId}`);
  }
}

function buildIndeedUrl(criteria: SearchCriteria): string {
  let url = appendLocation(
    `https://www.indeed.com/jobs?q=${encodeQuery(criteria.query)}`,
    "l",
    criteria,
  );
  const jobType = criteria.job_type ? INDEED_JOB_TYPE_PARAMS[criteria.job_type] : undefined;
  if (jobType) {
    url += `&jt=${jobType}`;
  }
  if (criteria.remote_type === RemoteType.Remote) {
    url += "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11";
  }
  return url;
}

function buildLinkedinUrl(criteria: SearchCriteria): string {
  let url = appendLocation(
    `https://www.linkedin.com/jobs/search/?keywords=${encodeQuery(criteria.query)}`,
    "location",
    criteria,
  );
  const jobType = criteria.job_type ? LINKEDIN_JOB_TYPE_PARAMS[criteria.job_type] : undefined;
  if (jobType) {
    url += `&f_JT=${jobType}`;
  }
  if (criteria.remote_type) {
    url += `&f_WT=${LINKEDIN_REMOTE_TYPE_PARAMS[criteria.remote_type]}`;
  }
  return url;
}

function appendLocation(url: string, key: string, criteria: SearchCriteria): string {
  return criteria.location ? `${url}&${key}=${encodeQuery(criteria.location)}` : url;
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value);
}

function handled(value: unknown): MockSearchLinksCommandResult {
  return { handled: true, value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return Object.values(ExperienceLevel).includes(value as ExperienceLevel);
}

function isJobType(value: unknown): value is JobType {
  return Object.values(JobType).includes(value as JobType);
}

function isRemoteType(value: unknown): value is RemoteType {
  return Object.values(RemoteType).includes(value as RemoteType);
}

function isSiteCategory(value: unknown): value is SiteCategory {
  return Object.values(SiteCategory).includes(value as SiteCategory);
}
