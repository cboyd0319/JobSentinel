import {
  ExperienceLevel,
  JobType,
  RemoteType,
  SiteCategory,
} from "../../types/deeplinks";
import type { DeepLink, SearchCriteria, SiteInfo } from "../../types/deeplinks";

export interface MockJobImportPreview {
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  salary: string | null;
  date_posted: string | null;
  valid_through: string | null;
  employment_types: string[];
  remote: boolean;
  missing_fields: string[];
  already_exists: boolean;
}

export interface MockJobImportResult {
  jobId: number;
}

export interface ImportedMockJob {
  id: number;
  hash: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  salary_min: number;
  salary_max: number;
  remote: boolean;
  score: number;
  hidden: boolean;
  bookmarked: boolean;
  notes: string | null;
  created_at: string;
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

const STRIPPED_JOB_IMPORT_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "referrer",
  "source",
]);

const STRIPPED_JOB_IMPORT_QUERY_MARKERS = [
  "token",
  "session",
  "auth",
  "credential",
  "password",
  "email",
  "candidate",
];

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
  if (!url || !isExternalHttpsUrl(url)) {
    throw new Error("This job-site link is not safe to open");
  }
}

export function previewMockJobImport(
  args?: Record<string, unknown>,
  existingJobUrls: readonly string[] = [],
): MockJobImportPreview {
  const url = getJobImportUrl(args);
  const title = getMockImportTitle(url);
  const company = getMockImportCompany(url);

  return {
    title,
    company,
    url,
    location: "Remote",
    description_preview: `${title} role imported from ${company}. Review details before saving.`,
    salary: "$55k-$72k",
    date_posted: new Date().toISOString(),
    valid_through: null,
    employment_types: ["FULL_TIME"],
    remote: true,
    missing_fields: [],
    already_exists: existingJobUrls.includes(url),
  };
}

export function buildMockImportedJob(
  preview: MockJobImportPreview,
  id: number,
  createdAt: string,
): ImportedMockJob {
  return {
    id,
    hash: `mock-import-${hashString(preview.url)}`,
    title: preview.title,
    company: preview.company,
    location: preview.location ?? "Remote",
    description: preview.description_preview ?? "",
    url: preview.url,
    source: "import",
    salary_min: 55000,
    salary_max: 72000,
    remote: preview.remote,
    score: 1,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: createdAt,
  };
}

export function isExternalHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return false;
    }

    return !isLocalOrPrivateHost(url.hostname);
  } catch {
    return false;
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

function getJobImportUrl(args?: Record<string, unknown>): string {
  const url = getStringArg(args, "url")?.trim();
  if (!url) {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  if (parsedUrl.protocol === "http:" && !isLocalOrPrivateHost(parsedUrl.hostname)) {
    throw new Error("Paste an https job posting link from your browser address bar.");
  }

  if (!isExternalHttpsUrl(url)) {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  return canonicalizeMockJobImportUrl(url);
}

function canonicalizeMockJobImportUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";

  const keptParams = new URLSearchParams();
  parsed.searchParams.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (isStrippedJobImportQueryParam(normalizedKey, value)) {
      return;
    }
    keptParams.append(key, value);
  });

  const query = keptParams.toString();
  parsed.search = query ? `?${query}` : "";
  return parsed.toString();
}

function isStrippedJobImportQueryParam(normalizedKey: string, value: string): boolean {
  return (
    normalizedKey.startsWith("utm_") ||
    STRIPPED_JOB_IMPORT_QUERY_KEYS.has(normalizedKey) ||
    STRIPPED_JOB_IMPORT_QUERY_MARKERS.some((marker) => normalizedKey.includes(marker)) ||
    isSensitiveJobImportQueryValue(value)
  );
}

function isSensitiveJobImportQueryValue(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    const normalizedValue = value.toLowerCase();
    return STRIPPED_JOB_IMPORT_QUERY_MARKERS.some(
      (marker) =>
        normalizedValue.includes(`${marker}=`) ||
        normalizedValue.includes(`${marker}%3d`),
    );
  }
}

function getMockImportTitle(url: string): string {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter((part) => part.length > 0);
  const slug = parts[parts.length - 1] ?? "imported-job";
  return (
    slug
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim() || "Imported Job"
  );
}

function getMockImportCompany(url: string): string {
  return new URL(url).hostname;
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function getStringArg(
  args: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = getArg(args, key);
  return typeof value === "string" ? value : undefined;
}

function getArg(
  args: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const nestedArgs = args?.payload as Record<string, unknown> | undefined;
  return args?.[key] ?? nestedArgs?.[key];
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

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host === "0.0.0.0" ||
    host.startsWith("127.")
  ) {
    return true;
  }

  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}
