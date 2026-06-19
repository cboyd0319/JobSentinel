export type JobSourceAccessModel =
  | "native-public"
  | "native-public-with-local-credential"
  | "native-public-feed"
  | "public-community"
  | "employer-career-system"
  | "restricted-user-gated"
  | "review-required";

export type JobSourceImplementationStatus =
  | "supported"
  | "candidate"
  | "restricted"
  | "manual-only"
  | "research";

export type JobSourceDiscoveryCategory =
  | "ats-platform"
  | "broad-job-board"
  | "employer-careers"
  | "freelance-contract"
  | "government-public"
  | "healthcare"
  | "higher-education"
  | "international"
  | "nonprofit"
  | "public-community"
  | "public-sector"
  | "regional-local"
  | "remote-job-board"
  | "search-engine"
  | "sector-specific"
  | "startup-job-board";

export type JobSourceCoverage = "all" | readonly string[];

export interface JobSourceDiscoveryEntry {
  readonly id: string;
  readonly label: string;
  readonly category: JobSourceDiscoveryCategory;
  readonly accessModel: JobSourceAccessModel;
  readonly status: JobSourceImplementationStatus;
  readonly regions: readonly string[];
  readonly careerProfileIds: JobSourceCoverage;
  readonly hostPatterns: readonly string[];
  readonly locationSearchPatterns?: readonly string[];
  readonly searchParameterPatterns?: readonly string[];
  readonly navigationSurfacePatterns?: readonly string[];
  readonly examples: readonly string[];
  readonly implementationPath: string;
  readonly notes: string;
  readonly requiresUserAgreement?: boolean;
}

const TECH_PROFILE_IDS = [
  "software-engineering",
  "cybersecurity",
  "data-science",
] as const;

const BUSINESS_PROFILE_IDS = [
  "office-administration",
  "product-management",
  "seo-digital-marketing",
  "sales-business-dev",
  "hr-recruiting",
  "finance-accounting",
  "project-operations",
  "customer-success",
] as const;

const CREATIVE_PROFILE_IDS = [
  "content-copywriting",
  "creative-media",
] as const;

const EDUCATION_PROFILE_IDS = ["education"] as const;
const HEALTHCARE_PROFILE_IDS = ["healthcare"] as const;
const LEGAL_PROFILE_IDS = ["legal"] as const;
const TRADES_PROFILE_IDS = ["trades-field-service"] as const;
const GOVERNMENT_FRIENDLY_PROFILE_IDS = [
  "office-administration",
  "trades-field-service",
  "software-engineering",
  "cybersecurity",
  "data-science",
  "product-management",
  "finance-accounting",
  "project-operations",
  "healthcare",
  "legal",
  "education",
  "customer-success",
] as const;

const EMPLOYER_CAREER_SYSTEM_NOTES =
  "Use platform-specific public endpoints when documented. Otherwise keep this to user-opened discovery, Browser Import, pasted job links, or manual entry until terms and stability are reviewed.";

const RESTRICTED_BOARD_NOTES =
  "Do not run silent scheduled discovery. Require explicit user agreement before automated access and prefer user-opened import paths.";

export const JOB_SOURCE_DISCOVERY_TAXONOMY: readonly JobSourceDiscoveryEntry[] =
  [
  {
    id: "greenhouse",
    label: "Greenhouse",
    category: "ats-platform",
    accessModel: "native-public",
    status: "supported",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: [
      "boards-api.greenhouse.io",
      "job-boards.greenhouse.io",
      "boards.greenhouse.io",
    ],
    examples: ["Fivetran", "Primer", "SpaceX"],
    implementationPath:
      "Native Greenhouse adapter. Prefer the public job board API and normalize hosted board URLs to the current host.",
    notes:
      "Many employer careers pages embed Greenhouse even when the visible page is custom.",
  },
  {
    id: "lever",
    label: "Lever",
    category: "ats-platform",
    accessModel: "native-public",
    status: "supported",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["jobs.lever.co", "api.lever.co"],
    examples: ["Company hosted Lever boards", "Embedded Lever job lists"],
    implementationPath:
      "Native Lever adapter using documented postings API and hosted board URLs.",
    notes:
      "Good candidate for direct employer discovery when host or API signals are present.",
  },
  {
    id: "ashby",
    label: "Ashby",
    category: "ats-platform",
    accessModel: "native-public",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["jobs.ashbyhq.com", "api.ashbyhq.com"],
    examples: ["Modern startup and software-company career pages"],
    implementationPath:
      "Candidate native adapter using Ashby public job posting API and embedded board signals.",
    notes:
      "Strong next source because public posting endpoints are documented and common in startups.",
  },
  {
    id: "smartrecruiters",
    label: "SmartRecruiters",
    category: "ats-platform",
    accessModel: "native-public",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["jobs.smartrecruiters.com", "api.smartrecruiters.com"],
    examples: ["Enterprise and mid-market career pages"],
    implementationPath:
      "Candidate native adapter using public posting endpoints where available.",
    notes:
      "Review customer endpoint shape per employer before adding scheduled discovery.",
  },
  {
    id: "workable",
    label: "Workable",
    category: "ats-platform",
    accessModel: "native-public",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["apply.workable.com", "workable.com"],
    examples: ["Small and mid-market employer boards"],
    implementationPath:
      "Candidate native adapter using Workable careers page API patterns.",
    notes:
      "Often exposes company-scoped jobs through embeddable careers pages.",
  },
  {
    id: "workday",
    label: "Workday",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: [
      "myworkdayjobs.com",
      "wd1.myworkdayjobs.com",
      "wd3.myworkdayjobs.com",
      "workdayjobs.com",
    ],
    examples: ["Large enterprise career portals"],
    implementationPath:
      "Detect employer Workday tenant URLs and use reviewed employer-scoped endpoints only.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "icims",
    label: "iCIMS",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["icims.com", "careers.icims.com", "jobs.icims.com"],
    examples: ["Enterprise career portals"],
    implementationPath:
      "Detect iCIMS-hosted pages and add native support only after endpoint review.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "jobvite",
    label: "Jobvite",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["jobs.jobvite.com", "jobvite.com"],
    examples: ["Employer Jobvite boards"],
    implementationPath:
      "Detect Jobvite pages and prefer user-opened import until source-specific behavior is reviewed.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "teamtailor",
    label: "Teamtailor",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["teamtailor.com", "careers.teamtailor.com"],
    examples: ["European and global employer boards"],
    implementationPath:
      "Detect Teamtailor career pages and review public access patterns before automation.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "recruitee",
    label: "Recruitee",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["recruitee.com", "jobs.recruitee.com"],
    examples: ["Employer Recruitee boards"],
    implementationPath:
      "Detect Recruitee boards and add native support after endpoint and terms review.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "breezy",
    label: "Breezy HR",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["breezy.hr"],
    examples: ["Small business and startup hiring pages"],
    implementationPath:
      "Detect Breezy-hosted pages and prefer user-opened import until reviewed.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "jazzhr",
    label: "JazzHR",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["applytojob.com", "jazz.co", "jazzhr.com"],
    examples: ["Small business hiring pages"],
    implementationPath:
      "Detect JazzHR ApplyToJob pages and add native support only after fixture coverage.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "bullhorn",
    label: "Bullhorn",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["bullhorn.com", "bullhornstaffing.com"],
    examples: ["Recruiting agency job boards"],
    implementationPath:
      "Detect Bullhorn-backed listings and keep automation review-gated.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "eightfold",
    label: "Eightfold",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["eightfold.ai", "careers.microsoft.com"],
    examples: ["Microsoft careers", "Large enterprise talent portals"],
    implementationPath:
      "Detect Eightfold-backed portals and review employer-specific endpoints before native automation.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "sap-successfactors",
    label: "SAP SuccessFactors",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["successfactors.com", "sapsf.com", "successfactors.eu"],
    examples: ["Enterprise career portals"],
    implementationPath:
      "Detect SuccessFactors portals and add native support after tenant-specific endpoint review.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "oracle-recruiting",
    label: "Oracle Recruiting",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["oraclecloud.com", "oracle.com"],
    examples: ["Oracle Cloud HCM career portals"],
    implementationPath:
      "Detect Oracle Recruiting portals and keep scheduled discovery disabled until reviewed per tenant.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "phenom",
    label: "Phenom",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["phenompeople.com", "phenom.com"],
    examples: ["Enterprise career portals"],
    implementationPath:
      "Detect Phenom pages and add source-specific support after endpoint and terms review.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "taleo",
    label: "Taleo",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["taleo.net"],
    examples: ["Enterprise and legacy career portals"],
    implementationPath:
      "Detect Taleo portals and prefer user-opened import until behavior is reviewed.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "bamboohr",
    label: "BambooHR",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["bamboohr.com"],
    examples: ["Small and mid-market employer job pages"],
    implementationPath:
      "Detect BambooHR hiring pages and use manual or Browser Import until native behavior is reviewed.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "adp-recruiting",
    label: "ADP Recruiting",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["adp.com", "workforcenow.adp.com"],
    examples: ["ADP Workforce Now career portals"],
    implementationPath:
      "Research employer-scoped discovery behavior before any automation.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "ukg",
    label: "UKG",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["ukg.com", "ultipro.com"],
    examples: ["UKG and legacy UltiPro recruiting portals"],
    implementationPath:
      "Research tenant-specific behavior before adding a native adapter.",
    notes: EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "employer-careers-pages",
    label: "Employer Careers Pages",
    category: "employer-careers",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["careers.*", "*/careers", "*/jobs"],
    examples: ["Google Careers", "Yahoo Careers", "IBM Careers"],
    implementationPath:
      "Discover ATS/API signals first, then fall back to user-opened import, pasted job links, or manual entry.",
    notes:
      "This is the broad discovery layer for companies that do not appear on stock job boards.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["linkedin.com/jobs", "linkedin.com/company/*/jobs"],
    searchParameterPatterns: [
      "keywords=<role-or-skill>",
      "geoId=<linkedin-location-id>",
      "f_TPR=<posted-within-seconds>",
      "f_AL=true",
      "currentJobId=<selected-job-id>",
      "showHowYouFit=HOW_YOU_FIT",
      "origin=<linkedin-surface>",
      "originToLandingJobPostings=<job-id-list>",
      "referralSearchId=<session-search-id>",
    ],
    navigationSurfacePatterns: [
      "jobs home",
      "preferences",
      "job tracker",
      "my career insights",
    ],
    examples: ["LinkedIn Jobs", "LinkedIn company job tabs"],
    implementationPath:
      "User-gated restricted discovery only. Prefer user-opened import and never run silent scheduled discovery. Persist user-entered query intent and selected filters only; do not persist referral, origin, or session-like identifiers as source configuration.",
    notes:
      "Observed search-results URLs can include role keywords, LinkedIn geo IDs, posted-within filters, Easy Apply filters, selected job IDs, how-you-fit surfaces, origin surfaces, referral search IDs, landing job lists, and jobs-hub text-fragment anchors. Treat LinkedIn-specific IDs and navigation context as volatile user/session context. " +
      RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "linkedin-jobs-tracker",
    label: "LinkedIn Jobs Tracker",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["linkedin.com/jobs-tracker"],
    searchParameterPatterns: [
      "stage=applied",
      "stage=saved",
      "stage=interviewing",
      "stage=archived",
    ],
    examples: ["LinkedIn applied jobs", "LinkedIn saved jobs"],
    implementationPath:
      "User-gated restricted tracking only. If supported later, limit this to user-reviewed jobs already saved or applied on LinkedIn, never broad background discovery.",
    notes:
      "This is an application-tracking path, not a search source. Require prominent user agreement, do not capture cookies, do not bypass login or human checks, and do not persist session identifiers. " +
      RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "indeed",
    label: "Indeed",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["indeed.com"],
    examples: ["Indeed job search results"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "monster",
    label: "Monster",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US", "global"],
    careerProfileIds: "all",
    hostPatterns: ["monster.com"],
    examples: ["Monster job search"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "ziprecruiter",
    label: "ZipRecruiter",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US"],
    careerProfileIds: "all",
    hostPatterns: ["ziprecruiter.com"],
    examples: ["ZipRecruiter search results"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "careerbuilder",
    label: "CareerBuilder",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US"],
    careerProfileIds: "all",
    hostPatterns: ["careerbuilder.com"],
    examples: ["CareerBuilder search results"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "glassdoor",
    label: "Glassdoor",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["glassdoor.com"],
    examples: ["Glassdoor job search"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "simplyhired",
    label: "SimplyHired",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US"],
    careerProfileIds: "all",
    hostPatterns: ["simplyhired.com"],
    examples: ["SimplyHired search results"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "builtin",
    label: "Built In",
    category: "regional-local",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
    ],
    hostPatterns: ["builtin.com", "builtincolorado.com"],
    locationSearchPatterns: [
      "/jobs",
      "/jobs?state=<state>&country=<country>&allLocations=true",
      "/jobs?city=<city>&state=<state>&country=<country>&allLocations=true",
      "regional city hosts such as builtincolorado.com/jobs",
    ],
    examples: [
      "Built In network jobs",
      "Built In California",
      "Built In San Francisco",
      "Built In Colorado",
      "Built In NYC",
      "Built In Chicago",
    ],
    implementationPath:
      "Use employer discovery from listings and explicit user-gated access only for board scraping.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "regional-industry-boards",
    label: "Regional Industry Boards",
    category: "regional-local",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["US", "global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
    ],
    hostPatterns: ["builtin*.com", "local industry council job boards"],
    examples: [
      "Built In Colorado",
      "local industry council job boards",
      "regional startup community job boards",
    ],
    implementationPath:
      "Treat regional boards as source-discovery candidates. Prefer employer-career follow-through and require explicit user agreement before board automation.",
    notes:
      "Regional sites are high-value for location-bound users, but access models vary by city and operator.",
    requiresUserAgreement: true,
  },
  {
    id: "state-workforce-boards",
    label: "State Workforce Boards",
    category: "regional-local",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: "all",
    hostPatterns: [
      "state workforce job banks",
      "state labor department job boards",
    ],
    examples: [
      "state workforce center jobs",
      "state department of labor job banks",
      "American Job Center-linked listings",
    ],
    implementationPath:
      "Research each jurisdiction. Prefer official feeds where available, otherwise offer user-opened search links and manual import.",
    notes:
      "Important for local, frontline, government-adjacent, and broad-market roles that may not appear on national boards.",
  },
  {
    id: "city-county-careers",
    label: "City and County Careers",
    category: "public-sector",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: GOVERNMENT_FRIENDLY_PROFILE_IDS,
    hostPatterns: [
      "city career pages",
      "county career pages",
      "municipal applicant portals",
    ],
    examples: [
      "city government careers",
      "county government jobs",
      "public utility career pages",
    ],
    implementationPath:
      "Detect ATS platform first. If no stable public endpoint exists, use user-opened search, pasted job links, or manual entry.",
    notes:
      "Many local public employers use vendor portals or custom pages; model them as employer-career discovery instead of broad scraping.",
  },
  {
    id: "local-chambers-economic-development",
    label: "Local Chambers and Economic Development Boards",
    category: "regional-local",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: [
      "chamber job boards",
      "economic development job boards",
      "regional business association job boards",
    ],
    examples: [
      "local chamber of commerce job boards",
      "regional economic development job boards",
      "industry association local listings",
    ],
    implementationPath:
      "Use as a discovery path for local employers. Add native source support only after source-specific terms and structure review.",
    notes:
      "Useful for retail, hospitality, operations, trades, office, and small-business roles.",
  },
  {
    id: "local-newspaper-jobs",
    label: "Local Newspaper Jobs",
    category: "regional-local",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["local newspaper job boards", "regional classifieds jobs"],
    examples: ["regional newspaper job boards", "local classified job pages"],
    implementationPath:
      "Use user-opened search and manual import until source-specific rights and structure are reviewed.",
    notes:
      "Can surface local roles missed by national boards, but source behavior varies widely.",
  },
  {
    id: "dice",
    label: "Dice",
    category: "broad-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US"],
    careerProfileIds: TECH_PROFILE_IDS,
    hostPatterns: ["dice.com"],
    examples: ["Technology job search"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "wellfound",
    label: "Wellfound",
    category: "startup-job-board",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
    ],
    hostPatterns: ["wellfound.com"],
    examples: ["Startup hiring"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "yc-work-at-a-startup",
    label: "Y Combinator Work at a Startup",
    category: "startup-job-board",
    accessModel: "native-public",
    status: "supported",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
    ],
    hostPatterns: ["ycombinator.com/companies/jobs"],
    examples: ["YC startup jobs"],
    implementationPath: "Native YC adapter.",
    notes:
      "Useful for startup discovery and direct company career-page expansion.",
  },
  {
    id: "hacker-news-who-is-hiring",
    label: "Hacker News Who Is Hiring",
    category: "public-community",
    accessModel: "public-community",
    status: "supported",
    regions: ["global"],
    careerProfileIds: TECH_PROFILE_IDS,
    hostPatterns: ["news.ycombinator.com/item"],
    examples: ["Monthly Who Is Hiring thread"],
    implementationPath: "Native Hacker News source.",
    notes:
      "Community postings need quality and risk scoring because detail levels vary.",
  },
  {
    id: "remoteok",
    label: "Remote OK",
    category: "remote-job-board",
    accessModel: "native-public-feed",
    status: "supported",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["remoteok.com"],
    examples: ["Remote job feed"],
    implementationPath: "Native Remote OK adapter.",
    notes:
      "Keep remote terms separated from role terms so broad-market roles can use this source.",
  },
  {
    id: "we-work-remotely",
    label: "We Work Remotely",
    category: "remote-job-board",
    accessModel: "native-public-feed",
    status: "supported",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["weworkremotely.com"],
    examples: ["Remote job categories"],
    implementationPath: "Native We Work Remotely adapter.",
    notes:
      "Strong fit for software, customer success, marketing, sales, and writing roles.",
  },
  {
    id: "remotive",
    label: "Remotive",
    category: "remote-job-board",
    accessModel: "native-public-feed",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["remotive.com"],
    examples: ["Remote jobs API"],
    implementationPath: "Candidate feed adapter after freshness and terms review.",
    notes:
      "Good candidate for non-browser feed discovery if current API behavior remains stable.",
  },
  {
    id: "remote-co",
    label: "Remote.co",
    category: "remote-job-board",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["remote.co"],
    examples: ["Remote job categories"],
    implementationPath:
      "Research access model. Prefer user-opened import until reviewed.",
    notes: "Good remote discovery candidate, but scheduled access needs review.",
  },
  {
    id: "himalayas",
    label: "Himalayas",
    category: "remote-job-board",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["himalayas.app"],
    examples: ["Remote jobs and companies"],
    implementationPath:
      "Research access model. Prefer user-opened import until reviewed.",
    notes: "Potential remote source and company discovery surface.",
  },
  {
    id: "jobspresso",
    label: "Jobspresso",
    category: "remote-job-board",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["jobspresso.co"],
    examples: ["Remote job listings"],
    implementationPath:
      "Research access model. Prefer user-opened import until reviewed.",
    notes: "Potential curated remote source.",
  },
  {
    id: "working-nomads",
    label: "Working Nomads",
    category: "remote-job-board",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["workingnomads.com"],
    examples: ["Remote job categories"],
    implementationPath:
      "Research access model. Prefer user-opened import until reviewed.",
    notes: "Potential remote source for several broad-market categories.",
  },
  {
    id: "flexjobs",
    label: "FlexJobs",
    category: "remote-job-board",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US", "global"],
    careerProfileIds: "all",
    hostPatterns: ["flexjobs.com"],
    examples: ["Flexible and remote job search"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "usajobs",
    label: "USAJOBS",
    category: "government-public",
    accessModel: "native-public-with-local-credential",
    status: "supported",
    regions: ["US"],
    careerProfileIds: GOVERNMENT_FRIENDLY_PROFILE_IDS,
    hostPatterns: ["usajobs.gov", "data.usajobs.gov"],
    examples: ["Federal government jobs"],
    implementationPath: "Native USAJOBS adapter with local API credential setup.",
    notes:
      "Official public source. Keep credential storage local and setup clear for every user.",
  },
  {
    id: "governmentjobs",
    label: "GovernmentJobs",
    category: "public-sector",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: GOVERNMENT_FRIENDLY_PROFILE_IDS,
    hostPatterns: ["governmentjobs.com"],
    examples: ["State, county, city, and public agency jobs"],
    implementationPath:
      "Research public access model and jurisdiction-specific pages before automation.",
    notes:
      "High-value public-sector source, especially for broad-market job seekers.",
  },
  {
    id: "clearancejobs",
    label: "ClearanceJobs",
    category: "sector-specific",
    accessModel: "restricted-user-gated",
    status: "restricted",
    regions: ["US"],
    careerProfileIds: [
      "cybersecurity",
      "software-engineering",
      "trades-field-service",
      "project-operations",
    ],
    hostPatterns: ["clearancejobs.com"],
    examples: ["Security clearance roles"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "snagajob",
    label: "Snagajob",
    category: "sector-specific",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["retail-hospitality"],
    hostPatterns: ["snagajob.com"],
    examples: ["Hourly retail, restaurant, and hospitality jobs"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "poached-jobs",
    label: "Poached Jobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["retail-hospitality"],
    hostPatterns: ["poachedjobs.com"],
    examples: ["Restaurant and hospitality jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Hospitality-specific source for local market coverage.",
  },
  {
    id: "culinary-agents",
    label: "Culinary Agents",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["retail-hospitality"],
    hostPatterns: ["culinaryagents.com"],
    examples: ["Restaurant, hotel, and culinary roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Hospitality-specific source for local market coverage.",
  },
  {
    id: "hospitality-online",
    label: "Hospitality Online",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["retail-hospitality"],
    hostPatterns: ["hospitalityonline.com"],
    examples: ["Hotel and hospitality jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Hospitality-specific source for hotel and service roles.",
  },
  {
    id: "coolworks",
    label: "CoolWorks",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["retail-hospitality", "trades-field-service"],
    hostPatterns: ["coolworks.com"],
    examples: ["Seasonal, outdoor, hospitality, and park jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes:
      "Useful for seasonal hospitality, field, parks, and entry-level local roles.",
  },
  {
    id: "eures",
    label: "EURES",
    category: "government-public",
    accessModel: "native-public",
    status: "research",
    regions: ["EU"],
    careerProfileIds: "all",
    hostPatterns: ["eures.europa.eu"],
    examples: ["European public employment services"],
    implementationPath:
      "Research official API and country coverage before adding native support.",
    notes: "Good official international source candidate.",
  },
  {
    id: "canada-job-bank",
    label: "Canada Job Bank",
    category: "government-public",
    accessModel: "native-public",
    status: "research",
    regions: ["Canada"],
    careerProfileIds: "all",
    hostPatterns: ["jobbank.gc.ca"],
    examples: ["Government of Canada Job Bank"],
    implementationPath:
      "Research official feeds or API terms before adding native support.",
    notes: "Good public-source candidate for Canadian job seekers.",
  },
  {
    id: "gov-uk-find-a-job",
    label: "GOV.UK Find a job",
    category: "government-public",
    accessModel: "native-public",
    status: "research",
    regions: ["UK"],
    careerProfileIds: "all",
    hostPatterns: ["findajob.dwp.gov.uk"],
    examples: ["UK public job search"],
    implementationPath:
      "Research official access patterns before adding native support.",
    notes: "Useful for broad UK-market coverage.",
  },
  {
    id: "uk-civil-service-jobs",
    label: "UK Civil Service Jobs",
    category: "government-public",
    accessModel: "review-required",
    status: "research",
    regions: ["UK"],
    careerProfileIds: GOVERNMENT_FRIENDLY_PROFILE_IDS,
    hostPatterns: ["civilservicejobs.service.gov.uk"],
    examples: ["UK Civil Service roles"],
    implementationPath:
      "Research official access patterns before adding native support.",
    notes: "Useful for public-sector UK users.",
  },
  {
    id: "adzuna",
    label: "Adzuna",
    category: "broad-job-board",
    accessModel: "native-public-with-local-credential",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["adzuna.com"],
    examples: ["Adzuna Jobs API"],
    implementationPath:
      "Research API terms, user credential setup, and pricing before native support.",
    notes: "Aggregator API candidate. Keep credentials local and optional.",
  },
  {
    id: "reed",
    label: "Reed",
    category: "broad-job-board",
    accessModel: "native-public-with-local-credential",
    status: "research",
    regions: ["UK"],
    careerProfileIds: "all",
    hostPatterns: ["reed.co.uk"],
    examples: ["Reed UK jobs"],
    implementationPath:
      "Research API terms and local credential flow before native support.",
    notes: "Good UK-market candidate.",
  },
  {
    id: "arbeitnow",
    label: "Arbeitnow",
    category: "international",
    accessModel: "native-public-feed",
    status: "research",
    regions: ["EU"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      "customer-success",
    ],
    hostPatterns: ["arbeitnow.com"],
    examples: ["European job feed"],
    implementationPath:
      "Research feed freshness, terms, and role coverage before native support.",
    notes: "Potential low-friction European source.",
  },
  {
    id: "jooble",
    label: "Jooble",
    category: "broad-job-board",
    accessModel: "native-public-with-local-credential",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["jooble.org"],
    examples: ["Jooble API"],
    implementationPath:
      "Research API terms, user credential setup, and rate limits before native support.",
    notes: "Aggregator API candidate. Keep credentials local and optional.",
  },
  {
    id: "naukri",
    label: "Naukri",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["India"],
    careerProfileIds: "all",
    hostPatterns: ["naukri.com"],
    examples: ["India job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "foundit",
    label: "Foundit",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["India", "APAC"],
    careerProfileIds: "all",
    hostPatterns: ["foundit.in", "foundit.sg"],
    examples: ["India and APAC job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "shine",
    label: "Shine",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["India"],
    careerProfileIds: "all",
    hostPatterns: ["shine.com"],
    examples: ["India job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "timesjobs",
    label: "TimesJobs",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["India"],
    careerProfileIds: "all",
    hostPatterns: ["timesjobs.com"],
    examples: ["India job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "seek",
    label: "SEEK",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["Australia", "New Zealand"],
    careerProfileIds: "all",
    hostPatterns: ["seek.com.au", "seek.co.nz"],
    examples: ["Australia and New Zealand job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "jora",
    label: "Jora",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["jora.com"],
    examples: ["International job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "jobstreet",
    label: "JobStreet",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["APAC"],
    careerProfileIds: "all",
    hostPatterns: ["jobstreet.com"],
    examples: ["Southeast Asia job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "bayt",
    label: "Bayt",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["Middle East", "North Africa"],
    careerProfileIds: "all",
    hostPatterns: ["bayt.com"],
    examples: ["MENA job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "gulftalent",
    label: "GulfTalent",
    category: "international",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["Middle East"],
    careerProfileIds: "all",
    hostPatterns: ["gulftalent.com"],
    examples: ["Gulf region job search"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "higheredjobs",
    label: "HigherEdJobs",
    category: "higher-education",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: [
      ...EDUCATION_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...TECH_PROFILE_IDS,
    ],
    hostPatterns: ["higheredjobs.com"],
    examples: ["Higher education staff, faculty, and administration roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Important education-sector source for campus, staff, faculty, and software roles.",
  },
  {
    id: "chronicle-jobs",
    label: "Chronicle Jobs",
    category: "higher-education",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: [
      ...EDUCATION_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...TECH_PROFILE_IDS,
    ],
    hostPatterns: ["jobs.chronicle.com"],
    examples: ["Higher education roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Useful companion source to HigherEdJobs.",
  },
  {
    id: "edjoin",
    label: "EdJoin",
    category: "higher-education",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: EDUCATION_PROFILE_IDS,
    hostPatterns: ["edjoin.org"],
    examples: ["K-12 education jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Useful for K-12 teaching, support, and administrative roles.",
  },
  {
    id: "nhs-jobs",
    label: "NHS Jobs",
    category: "healthcare",
    accessModel: "review-required",
    status: "research",
    regions: ["UK"],
    careerProfileIds: HEALTHCARE_PROFILE_IDS,
    hostPatterns: ["jobs.nhs.uk"],
    examples: ["UK healthcare jobs"],
    implementationPath:
      "Research official access patterns before adding native support.",
    notes: "High-value healthcare source for UK users.",
  },
  {
    id: "health-ecareers",
    label: "Health eCareers",
    category: "healthcare",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: HEALTHCARE_PROFILE_IDS,
    hostPatterns: ["healthecareers.com"],
    examples: ["Healthcare professional jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Potential healthcare-sector source.",
  },
  {
    id: "practice-match",
    label: "PracticeMatch",
    category: "healthcare",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: HEALTHCARE_PROFILE_IDS,
    hostPatterns: ["practicematch.com"],
    examples: ["Physician and clinician roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Specialized healthcare source.",
  },
  {
    id: "nurse-com",
    label: "Nurse.com",
    category: "healthcare",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: HEALTHCARE_PROFILE_IDS,
    hostPatterns: ["nurse.com"],
    examples: ["Nursing roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Specialized nursing source.",
  },
  {
    id: "vivian-health",
    label: "Vivian Health",
    category: "healthcare",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["US"],
    careerProfileIds: HEALTHCARE_PROFILE_IDS,
    hostPatterns: ["vivian.com"],
    examples: ["Healthcare and travel nursing jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: RESTRICTED_BOARD_NOTES,
    requiresUserAgreement: true,
  },
  {
    id: "lawjobs",
    label: "Lawjobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: LEGAL_PROFILE_IDS,
    hostPatterns: ["lawjobs.com"],
    examples: ["Legal jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Specialized legal-sector source.",
  },
  {
    id: "idealist",
    label: "Idealist",
    category: "nonprofit",
    accessModel: "review-required",
    status: "research",
    regions: ["US", "global"],
    careerProfileIds: [
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
      ...EDUCATION_PROFILE_IDS,
      ...HEALTHCARE_PROFILE_IDS,
      ...LEGAL_PROFILE_IDS,
    ],
    hostPatterns: ["idealist.org"],
    examples: ["Nonprofit jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Important source for nonprofit, education, legal, and operations roles.",
  },
  {
    id: "dribbble",
    label: "Dribbble Jobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: CREATIVE_PROFILE_IDS,
    hostPatterns: ["dribbble.com"],
    examples: ["Design jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Creative and design source.",
  },
  {
    id: "behance",
    label: "Behance Jobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: CREATIVE_PROFILE_IDS,
    hostPatterns: ["behance.net"],
    examples: ["Creative jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Creative and portfolio-adjacent source.",
  },
  {
    id: "aiga-design-jobs",
    label: "AIGA Design Jobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: CREATIVE_PROFILE_IDS,
    hostPatterns: ["designjobs.aiga.org"],
    examples: ["Design roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Specialized design source.",
  },
  {
    id: "problogger",
    label: "ProBlogger Jobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: ["content-copywriting", "seo-digital-marketing"],
    hostPatterns: ["problogger.com"],
    examples: ["Writing and content jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Writing and content-marketing source.",
  },
  {
    id: "efinancialcareers",
    label: "eFinancialCareers",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["global"],
    careerProfileIds: ["finance-accounting", "data-science"],
    hostPatterns: ["efinancialcareers.com"],
    examples: ["Finance and fintech jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Finance-sector source.",
  },
  {
    id: "accountingfly",
    label: "Accountingfly",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["finance-accounting"],
    hostPatterns: ["accountingfly.com"],
    examples: ["Accounting jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Accounting-sector source.",
  },
  {
    id: "shrm-hr-jobs",
    label: "SHRM HR Jobs",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: ["hr-recruiting"],
    hostPatterns: ["jobs.shrm.org"],
    examples: ["Human resources roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "HR-sector source.",
  },
  {
    id: "ihireconstruction",
    label: "iHireConstruction",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: TRADES_PROFILE_IDS,
    hostPatterns: ["ihireconstruction.com"],
    examples: ["Construction roles"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Trades and field-service source candidate.",
  },
  {
    id: "bluerecruit",
    label: "BlueRecruit",
    category: "sector-specific",
    accessModel: "review-required",
    status: "research",
    regions: ["US"],
    careerProfileIds: TRADES_PROFILE_IDS,
    hostPatterns: ["bluerecruit.us"],
    examples: ["Skilled trades and blue-collar jobs"],
    implementationPath:
      "Research current access model. Prefer user-opened import until reviewed.",
    notes: "Trades and field-service source candidate.",
  },
  {
    id: "upwork",
    label: "Upwork",
    category: "freelance-contract",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
    ],
    hostPatterns: ["upwork.com"],
    examples: ["Freelance marketplace jobs"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes:
      "Marketplace terms and account state matter. Do not run silent scheduled discovery.",
    requiresUserAgreement: true,
  },
  {
    id: "freelancer",
    label: "Freelancer",
    category: "freelance-contract",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      ...TECH_PROFILE_IDS,
      ...BUSINESS_PROFILE_IDS,
      ...CREATIVE_PROFILE_IDS,
    ],
    hostPatterns: ["freelancer.com"],
    examples: ["Freelance marketplace projects"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes:
      "Marketplace terms and account state matter. Do not run silent scheduled discovery.",
    requiresUserAgreement: true,
  },
  {
    id: "toptal",
    label: "Toptal",
    category: "freelance-contract",
    accessModel: "restricted-user-gated",
    status: "research",
    regions: ["global"],
    careerProfileIds: [
      "software-engineering",
      "data-science",
      "finance-accounting",
      "product-management",
      "creative-media",
    ],
    hostPatterns: ["toptal.com"],
    examples: ["Freelance talent marketplace"],
    implementationPath:
      "Use user-opened import or explicit user-gated access only.",
    notes:
      "Marketplace terms and account state matter. Do not run silent scheduled discovery.",
    requiresUserAgreement: true,
  },
  {
    id: "google-jobs-search",
    label: "Google Jobs Search",
    category: "search-engine",
    accessModel: "review-required",
    status: "manual-only",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["google.com/search"],
    examples: ["Google job rich results"],
    implementationPath:
      "Use as a manual discovery aid or user-opened import path, not scheduled scraping.",
    notes:
      "Useful for finding employer career pages, but direct automated search scraping should stay disabled.",
  },
  {
    id: "jobswithgpt",
    label: "JobsWithGPT",
    category: "remote-job-board",
    accessModel: "native-public-feed",
    status: "supported",
    regions: ["global"],
    careerProfileIds: TECH_PROFILE_IDS,
    hostPatterns: ["jobswithgpt.com"],
    examples: ["AI and GPT-related roles"],
    implementationPath: "Native JobsWithGPT source.",
    notes:
      "Niche source. Keep it profile-scoped so it does not dominate broader searches.",
  },
  ] as const;

export function sourceDiscoveryEntriesForCareerProfile(
  profileId: string,
): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter((entry) =>
    entry.careerProfileIds === "all"
      ? true
      : (entry.careerProfileIds as readonly string[]).includes(profileId),
  );
}

export function publicNativeJobSourceDiscoveryEntries(): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter((entry) =>
    [
      "native-public",
      "native-public-feed",
      "native-public-with-local-credential",
      "public-community",
    ].includes(entry.accessModel),
  );
}

export function restrictedJobSourceDiscoveryEntries(): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter(
    (entry) =>
      entry.accessModel === "restricted-user-gated" ||
      entry.requiresUserAgreement === true,
  );
}
