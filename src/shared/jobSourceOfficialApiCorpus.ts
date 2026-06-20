export type OfficialJobSourceApiAccess =
  | "documented-public-api"
  | "documented-public-feed"
  | "employer-owned-web-api"
  | "public-career-html"
  | "partner-or-authenticated-api"
  | "restricted-authenticated-user-session";

export type OfficialJobSourceApiImplementation =
  | "supported-adapter"
  | "candidate-adapter"
  | "review-before-adapter"
  | "restricted-user-gated";

export interface OfficialJobSourceApiEntry {
  readonly id: string;
  readonly label: string;
  readonly sourceFamilyId: string;
  readonly access: OfficialJobSourceApiAccess;
  readonly implementation: OfficialJobSourceApiImplementation;
  readonly endpointPatterns: readonly string[];
  readonly representativeExamples: readonly string[];
  readonly notes: string;
}

export const OFFICIAL_JOB_SOURCE_API_CORPUS: readonly OfficialJobSourceApiEntry[] = [
  {
    id: "greenhouse-job-board-api",
    label: "Greenhouse Job Board API",
    sourceFamilyId: "greenhouse",
    access: "documented-public-api",
    implementation: "supported-adapter",
    endpointPatterns: [
      "https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true",
      "https://api.greenhouse.io/v1/boards/{board}/jobs?content=true",
      "https://job-boards.greenhouse.io/{board}/jobs/{job_id}",
    ],
    representativeExamples: [
      "Fivetran careers",
      "Anthropic careers",
      "Faire careers",
      "Klaviyo careers",
      "Mindgruve careers",
      "SpaceX careers",
      "Primer AI careers",
    ],
    notes:
      "Official public JSON for published jobs. Use the employer board token, keep the source apply URL, and do not assume salary is present.",
  },
  {
    id: "lever-postings-api",
    label: "Lever Postings API",
    sourceFamilyId: "lever",
    access: "documented-public-api",
    implementation: "supported-adapter",
    endpointPatterns: ["https://api.lever.co/v0/postings/{company}?mode=json"],
    representativeExamples: ["Employer-hosted Lever boards"],
    notes:
      "Official public JSON for published postings. Some employers include salary ranges, but JobSentinel must tolerate missing compensation.",
  },
  {
    id: "ashby-public-job-posting-api",
    label: "Ashby Public Job Posting API",
    sourceFamilyId: "ashby",
    access: "documented-public-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true",
      "https://jobs.ashbyhq.com/{board}/{job_id}",
    ],
    representativeExamples: ["OpenAI careers"],
    notes:
      "Official public JSON for published postings. Compensation can be requested when the employer publishes it.",
  },
  {
    id: "workday-cxs-web-api",
    label: "Workday Candidate Experience API",
    sourceFamilyId: "workday",
    access: "employer-owned-web-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://{tenant}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs",
    ],
    representativeExamples: ["Optiv Workday careers"],
    notes:
      "Employer-owned public CXS JSON can list published jobs. Local Fortune 100 research validated this lane across 19 public employer tenants with 57 canonical sample rows and no raw response-body persistence. Add tenant fixtures, robots checks, and rate limits before scheduled checks.",
  },
  {
    id: "phenom-widget-refine-search",
    label: "Phenom Widget Refine Search",
    sourceFamilyId: "phenom",
    access: "employer-owned-web-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "Phenom-hosted career pages with /widgets refineSearch JSON",
      "Phenom widget requests containing refNum and search parameters",
    ],
    representativeExamples: ["Fortune 100 Phenom widget career pages"],
    notes:
      "Local Fortune 100 research validated this lane across 13 public employer pages with 39 canonical sample rows and no raw response-body persistence. Keep tenant fixtures, robots checks, and endpoint stability checks before scheduling.",
  },
  {
    id: "radancy-talentbrew-html",
    label: "Radancy / TalentBrew HTML Fallback",
    sourceFamilyId: "radancy-talentbrew",
    access: "public-career-html",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "Radancy/TalentBrew public career search pages",
      "TalentBrew search pagination parameters such as k and p",
    ],
    representativeExamples: ["Sysco careers", "Chevron careers"],
    notes:
      "Local Fortune 100 research validated a Sysco public HTML fallback with 45 canonical sample rows and a Chevron Radancy/TalentBrew search page with 15 sampled rows. Keep it source-specific, robots-checked, and parser-fixture-backed.",
  },
  {
    id: "amazon-jobs-web-api",
    label: "Amazon Jobs API",
    sourceFamilyId: "amazon-jobs",
    access: "employer-owned-web-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://www.amazon.jobs/en/search.json?offset={offset}&result_limit={limit}",
      "https://www.amazon.jobs/api/v1/recommendations/homepage_jobs",
    ],
    representativeExamples: ["Amazon Jobs"],
    notes:
      "Employer-owned public JSON backs Amazon job search. Keep request volume low and normalize returned relative job paths.",
  },
  {
    id: "google-careers-web-api",
    label: "Google Careers Web API",
    sourceFamilyId: "google-careers",
    access: "employer-owned-web-api",
    implementation: "review-before-adapter",
    endpointPatterns: [
      "https://www.google.com/about/careers/applications/jobs/results",
      "https://www.gstatic.com/hiring/{career_app_asset}",
    ],
    representativeExamples: ["Google Careers"],
    notes:
      "Google Careers is public and employer-owned, but the job-search transport is an internal web app. Add a stable fixture before native scheduling.",
  },
  {
    id: "microsoft-eightfold-careers",
    label: "Microsoft Careers / Eightfold",
    sourceFamilyId: "eightfold",
    access: "employer-owned-web-api",
    implementation: "review-before-adapter",
    endpointPatterns: [
      "https://careers.microsoft.com/v2/global/en/home.html",
      "https://apply.careers.microsoft.com/careers",
    ],
    representativeExamples: ["Microsoft Careers"],
    notes:
      "Microsoft's public career web app is employer-owned and Eightfold-backed. Local static readiness found five Fortune 100 Eightfold candidates; Microsoft has a frontend JSON endpoint candidate, while Morgan Stanley, American Express, and HP still need payload-shape or parser fixtures. Chevron is currently better covered through Radancy/TalentBrew search.",
  },
  {
    id: "icims-jibe-careers",
    label: "iCIMS / Jibe Career Sites",
    sourceFamilyId: "icims",
    access: "employer-owned-web-api",
    implementation: "review-before-adapter",
    endpointPatterns: [
      "https://{employer}.icims.com/jobs",
      "https://www.{employer}.careers/jobs",
      "https://app.jibecdn.com/{career_site_assets}",
    ],
    representativeExamples: ["GitHub careers"],
    notes:
      "Many iCIMS/Jibe career sites render public jobs through employer-owned pages. Local static readiness found State Farm and Liberty Mutual as HTML parser-spike candidates. Detect the family first, then add fixtures per site shape.",
  },
  {
    id: "oracle-fusion-candidate-experience-api",
    label: "Oracle Fusion Recruiting Candidate Experience API",
    sourceFamilyId: "oracle-recruiting",
    access: "employer-owned-web-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://{tenant}.fa.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?finder=findReqs;...",
      "Oracle Candidate Experience findReqs with expand=requisitionList",
    ],
    representativeExamples: ["Dell Technologies careers", "Albertsons careers"],
    notes:
      "Local validation confirmed public JSON listings for Dell Technologies and Albertsons with 30 sampled jobs and no raw response-body persistence. JPMorgan Chase is excluded because the observed Oracle Fusion listing and REST paths are robots-blocked.",
  },
  {
    id: "oracle-taleo-public-html",
    label: "Oracle Taleo Public Career Sections",
    sourceFamilyId: "taleo",
    access: "public-career-html",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://{tenant}.taleo.net/careersection/{section}/jobsearch.ftl",
      "Static Taleo list state and direct public job-detail links",
    ],
    representativeExamples: [
      "Valero Energy careers",
      "Enterprise Products Partners careers",
    ],
    notes:
      "Local validation confirmed Valero Energy and Enterprise Products Partners public Taleo listings with 16 sampled jobs and no raw response-body persistence. UnitedHealth Group remains excluded until an allowed public Taleo listing source is confirmed.",
  },
  {
    id: "tesla-careers-web-api",
    label: "Tesla Careers",
    sourceFamilyId: "tesla-careers",
    access: "employer-owned-web-api",
    implementation: "review-before-adapter",
    endpointPatterns: [
      "https://www.tesla.com/careers/search",
      "https://www.tesla.com/careers/search/job/{slug_or_id}",
    ],
    representativeExamples: ["Tesla Careers"],
    notes:
      "Tesla publishes job pages under its own careers domain. Local direct fetches can be blocked by edge controls, so adapter work needs browser-safe fixtures without control bypass.",
  },
  {
    id: "workable-careers-api",
    label: "Workable Careers API",
    sourceFamilyId: "workable",
    access: "documented-public-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://apply.workable.com/api/v1/widget/accounts/{account}",
      "https://www.workable.com/api/accounts/{account}?details=true",
    ],
    representativeExamples: ["Workable employer boards"],
    notes:
      "Official careers-page data exists, but JobSentinel still needs adapter fixtures and attribution behavior before enabling scheduled checks.",
  },
  {
    id: "smartrecruiters-posting-api",
    label: "SmartRecruiters Posting API",
    sourceFamilyId: "smartrecruiters",
    access: "documented-public-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://api.smartrecruiters.com/v1/companies/{company}/postings",
    ],
    representativeExamples: ["SmartRecruiters employer boards"],
    notes:
      "Official posting APIs expose public postings where allowed. Local validation found the generic endpoint policy-blocked by robots, so enable only employer-specific fixtures that pass robots, rate-limit, and endpoint review.",
  },
  {
    id: "recruitee-careers-site-api",
    label: "Recruitee Careers Site API",
    sourceFamilyId: "recruitee",
    access: "documented-public-api",
    implementation: "candidate-adapter",
    endpointPatterns: ["https://{company}.recruitee.com/api/offers/"],
    representativeExamples: ["Recruitee employer boards"],
    notes:
      "Official candidate-side careers API can view published jobs without authorization.",
  },
  {
    id: "personio-xml-feed",
    label: "Personio XML Job Feed",
    sourceFamilyId: "personio",
    access: "documented-public-feed",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://{company}.jobs.personio.de/xml?language={locale}",
      "https://{company}.jobs.personio.com/xml?language={locale}",
    ],
    representativeExamples: ["Personio employer career sites"],
    notes:
      "Official XML feed for published jobs. Use structured XML parsing and tenant-specific language support.",
  },
  {
    id: "teamtailor-job-board-api",
    label: "Teamtailor Job Board API",
    sourceFamilyId: "teamtailor",
    access: "documented-public-feed",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://{company}.teamtailor.com/jobs",
      "https://api.teamtailor.com/v1/jobs",
      "Teamtailor XML feed URL provided by employer",
    ],
    representativeExamples: ["Teamtailor employer boards"],
    notes:
      "Official job-board and feed options exist, but some paths require employer setup or API keys.",
  },
  {
    id: "bamboohr-job-summaries-api",
    label: "BambooHR Job Summaries API",
    sourceFamilyId: "bamboohr",
    access: "partner-or-authenticated-api",
    implementation: "review-before-adapter",
    endpointPatterns: [
      "https://{company}.bamboohr.com/api/v1/applicant_tracking/jobs",
    ],
    representativeExamples: ["BambooHR employer boards"],
    notes:
      "Official API requires an API key with ATS access. Treat as user-configured credential work, not unauthenticated scraping.",
  },
  {
    id: "jobscore-feed-api",
    label: "JobScore Job Feed API",
    sourceFamilyId: "jobscore",
    access: "documented-public-feed",
    implementation: "candidate-adapter",
    endpointPatterns: ["JobScore employer Job Feed API URL"],
    representativeExamples: ["JobScore employer feeds"],
    notes:
      "Official feed support is designed for company career pages; verify each feed URL before scheduling.",
  },
  {
    id: "remoteok-api",
    label: "RemoteOK API",
    sourceFamilyId: "remoteok",
    access: "documented-public-api",
    implementation: "supported-adapter",
    endpointPatterns: ["https://remoteok.com/api"],
    representativeExamples: ["RemoteOK"],
    notes: "Public JSON source for remote jobs with conservative rate limits.",
  },
  {
    id: "remote-first-jobs-api",
    label: "Remote First Jobs API",
    sourceFamilyId: "remote-first-jobs",
    access: "documented-public-api",
    implementation: "candidate-adapter",
    endpointPatterns: [
      "https://remotefirstjobs.com/api/search-jobs",
      "https://jobscollider.com/api/search-jobs",
    ],
    representativeExamples: [
      "Remote First Jobs",
      "JobsCollider",
      "remote cybersecurity jobs",
    ],
    notes:
      "Public remote-jobs source with delayed results, frequent updates, and explicit source attribution and backlink requirements. Legacy JobsCollider API paths redirect here.",
  },
  {
    id: "hacker-news-algolia-api",
    label: "Hacker News Algolia API",
    sourceFamilyId: "hacker-news-who-is-hiring",
    access: "documented-public-api",
    implementation: "supported-adapter",
    endpointPatterns: ["https://hn.algolia.com/api/v1/search"],
    representativeExamples: ["Hacker News Who is Hiring"],
    notes: "Public API over HN posts; parser must keep Who is Hiring filtering explicit.",
  },
  {
    id: "adzuna-api",
    label: "Adzuna Jobs API",
    sourceFamilyId: "adzuna",
    access: "partner-or-authenticated-api",
    implementation: "review-before-adapter",
    endpointPatterns: [
      "https://api.adzuna.com/v1/api/jobs/{country}/search/{page}",
    ],
    representativeExamples: ["Adzuna"],
    notes:
      "Official aggregator API that requires user-owned app credentials. Keep credentials local and review terms, quotas, and attribution before native scheduling.",
  },
  {
    id: "the-muse-api",
    label: "The Muse Jobs API",
    sourceFamilyId: "the-muse",
    access: "partner-or-authenticated-api",
    implementation: "review-before-adapter",
    endpointPatterns: ["https://www.themuse.com/api/public/jobs"],
    representativeExamples: ["The Muse"],
    notes:
      "Official jobs API with quota and attribution requirements. Treat credential setup as optional and local.",
  },
  {
    id: "indeed-api-guides",
    label: "Indeed APIs",
    sourceFamilyId: "indeed",
    access: "partner-or-authenticated-api",
    implementation: "review-before-adapter",
    endpointPatterns: ["Indeed API guides and approved integration APIs"],
    representativeExamples: ["Indeed"],
    notes:
      "Official API documentation exists, but direct public scraping remains restricted-user-gated unless the user configures an approved API path.",
  },
  {
    id: "linkedin-user-session",
    label: "LinkedIn Jobs User Session",
    sourceFamilyId: "linkedin",
    access: "restricted-authenticated-user-session",
    implementation: "restricted-user-gated",
    endpointPatterns: [
      "https://www.linkedin.com/jobs/search-results/",
      "https://www.linkedin.com/company/{company}/jobs/",
      "https://www.linkedin.com/jobs-tracker/",
    ],
    representativeExamples: ["LinkedIn Jobs", "LinkedIn Jobs Tracker"],
    notes:
      "User-gated interactive only. Do not store auth tokens, session cookies, browser storage, authorization headers, or hidden session identifiers.",
  },
] as const;

export function officialApiEntriesForSourceFamily(
  sourceFamilyId: string,
): readonly OfficialJobSourceApiEntry[] {
  return OFFICIAL_JOB_SOURCE_API_CORPUS.filter(
    (entry) => entry.sourceFamilyId === sourceFamilyId,
  );
}

export function officialApiEntriesForExample(
  example: string,
): readonly OfficialJobSourceApiEntry[] {
  const normalizedExample = example.trim().toLowerCase();
  return OFFICIAL_JOB_SOURCE_API_CORPUS.filter((entry) =>
    entry.representativeExamples.some((candidate) =>
      candidate.toLowerCase().includes(normalizedExample),
    ),
  );
}
