import * as model from "./jobSourceDiscoveryModel";
import { JOB_SOURCE_NON_ATS_PLATFORM_ENTRIES } from "./jobSourceDiscoveryNonAtsPlatformEntries";

export const JOB_SOURCE_PLATFORM_DISCOVERY_ENTRIES: readonly model.JobSourceDiscoveryEntry[] = [
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
    examples: ["Fivetran", "Anthropic", "Klaviyo", "Primer", "SpaceX"],
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
    examples: ["OpenAI careers", "Modern startup and software-company career pages"],
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
      "Review customer endpoint shape per employer before adding scheduled discovery. Local API validation found the generic SmartRecruiters posting endpoint policy-blocked by robots, so only employer-specific fixtures that pass robots and rate-limit checks should be enabled.",
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
    technicalAccess: "public-unauthenticated",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: [
      "myworkdayjobs.com",
      "wd1.myworkdayjobs.com",
      "wd3.myworkdayjobs.com",
      "workdayjobs.com",
    ],
    examples: ["Optiv careers", "Large enterprise career portals"],
    implementationPath:
      "Detect employer Workday tenant URLs and use the public Candidate Experience API only after tenant fixtures and rate limits are reviewed.",
    notes:
      "Workday CXS pages can expose public job-search JSON for published jobs. Local Fortune 100 source research validated a Workday CXS listing lane across 19 public employer tenants with 57 canonical sample rows, but every new tenant still needs source-specific robots, fixture, and rate-limit review. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "icims",
    label: "iCIMS",
    category: "ats-platform",
    accessModel: "employer-career-system",
    technicalAccess: "public-unauthenticated",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["icims.com", "careers.icims.com", "jobs.icims.com"],
    examples: ["GitHub careers", "Enterprise career portals"],
    implementationPath:
      "Detect iCIMS and Jibe-hosted career pages and add native support only after endpoint review.",
    notes:
      "iCIMS/Jibe career sites can render public jobs through employer-owned web APIs or hosted pages. Local static readiness identified State Farm and Liberty Mutual as HTML parser-spike candidates, not scheduled adapters yet. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "recruitee",
    label: "Recruitee",
    category: "ats-platform",
    accessModel: "native-public",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["recruitee.com", "jobs.recruitee.com"],
    examples: ["Employer Recruitee boards"],
    implementationPath:
      "Candidate native adapter using Recruitee Careers Site API after fixture and terms review.",
    notes:
      "The Careers Site API exposes company jobs from the candidate perspective; verify tenant URL shape and rate limits before scheduling.",
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "eightfold",
    label: "Eightfold",
    category: "ats-platform",
    accessModel: "employer-career-system",
    technicalAccess: "public-unauthenticated",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["eightfold.ai", "careers.microsoft.com"],
    examples: ["Microsoft careers", "Large enterprise talent portals"],
    implementationPath:
      "Detect Eightfold-backed portals and review employer-specific web API endpoints before native automation.",
    notes:
      "Local static readiness found five Fortune 100 Eightfold candidates. Microsoft has a frontend JSON endpoint candidate; Morgan Stanley, American Express, and HP still need endpoint payload or parser fixtures; Chevron is currently validated through a Radancy/TalentBrew search path. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes:
      "Local static readiness found American Airlines as a SuccessFactors candidate that still needs a public payload-shape review before any native scheduling. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "oracle-recruiting",
    label: "Oracle Recruiting",
    category: "ats-platform",
    accessModel: "employer-career-system",
    technicalAccess: "public-unauthenticated",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["oraclecloud.com", "oracle.com"],
    examples: ["Oracle Cloud HCM career portals", "Dell Technologies careers", "Albertsons careers"],
    implementationPath:
      "Detect Oracle Fusion Recruiting Candidate Experience portals and keep scheduled discovery tenant-scoped until robots, endpoint, and fixture checks pass.",
    notes:
      "Local validation confirmed Dell Technologies and Albertsons public Candidate Experience JSON with 30 sampled jobs. JPMorgan Chase remains excluded because observed Oracle Fusion listing and REST paths are robots-blocked. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "phenom",
    label: "Phenom",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["phenompeople.com", "phenom.com", "*/widgets"],
    examples: ["Enterprise career portals", "Phenom widget career search pages"],
    implementationPath:
      "Detect Phenom pages and add source-specific widget support after endpoint and terms review.",
    notes:
      "Local Fortune 100 source research validated a Phenom widget refineSearch lane across 13 public employer pages with 39 canonical sample rows. Keep it fixture-backed, robots-checked, and tenant-scoped before scheduling. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "radancy-talentbrew",
    label: "Radancy / TalentBrew",
    category: "ats-platform",
    accessModel: "employer-career-system",
    technicalAccess: "public-unauthenticated",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: [
      "radancy.com",
      "talentbrew.com",
      "tbcdn.talentbrew.com",
      "careers.*",
    ],
    examples: ["Sysco careers", "Radancy/TalentBrew career search pages"],
    implementationPath:
      "Candidate HTML fallback adapter for validated source-specific public career pages; keep parsing fixture-backed and scoped to employer pages that pass policy and stability checks.",
    notes:
      "Local Fortune 100 source research validated a Sysco public HTML fallback lane with 45 canonical sample rows and a Chevron Radancy/TalentBrew search path with 15 sampled rows. Treat this as a narrow company-careers adapter family, not a broad crawling license. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "taleo",
    label: "Taleo",
    category: "ats-platform",
    accessModel: "employer-career-system",
    technicalAccess: "public-unauthenticated",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["taleo.net"],
    examples: ["Enterprise and legacy career portals", "Valero Energy careers", "Enterprise Products Partners careers"],
    implementationPath:
      "Detect Taleo career sections and keep scheduled discovery tenant-scoped until robots, endpoint, and parser fixtures pass.",
    notes:
      "Local validation confirmed Valero Energy and Enterprise Products Partners public Taleo listings with 16 sampled jobs. UnitedHealth Group remains excluded until an allowed public Taleo listing source is confirmed. " +
      model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
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
    notes: model.EMPLOYER_CAREER_SYSTEM_NOTES,
  },
  {
    id: "personio",
    label: "Personio",
    category: "ats-platform",
    accessModel: "native-public-feed",
    status: "candidate",
    regions: ["Europe", "global"],
    careerProfileIds: "all",
    hostPatterns: ["jobs.personio.de", "jobs.personio.com", "personio.de"],
    examples: ["Personio company career sites", "Personio XML position feeds"],
    implementationPath:
      "Candidate XML feed adapter for enabled company career sites after fixture, language, and rate-limit review.",
    notes:
      "Personio exposes public XML feeds for enabled career sites, but each employer tenant and language URL needs validation.",
  },
  {
    id: "comeet",
    label: "Comeet / Spark Hire Recruit",
    category: "ats-platform",
    accessModel: "native-public",
    status: "candidate",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["comeet.com", "api.comeet.co", "sparkhire.com"],
    examples: ["Comeet career widgets", "Spark Hire Recruit Careers API"],
    implementationPath:
      "Candidate Careers API adapter for published positions after public token and tenant-scope review.",
    notes:
      "Careers API is designed for company websites; never infer private recruiting data or application state.",
  },
  {
    id: "jobylon",
    label: "Jobylon",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "candidate",
    regions: ["Europe", "global"],
    careerProfileIds: "all",
    hostPatterns: ["jobylon.com", "developer.jobylon.com"],
    examples: ["Jobylon employer feeds", "Jobylon career widgets"],
    implementationPath:
      "Detect Jobylon-backed career pages and use feed API only after tenant/feed review.",
    notes:
      "Jobylon documents feed and partner APIs; source-specific credentials, feeds, and throttling must be reviewed before native support.",
  },
  {
    id: "rippling",
    label: "Rippling Recruiting",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["rippling.com", "hiring.rippling.com"],
    examples: ["Rippling Recruiting career pages"],
    implementationPath:
      "Detect Rippling recruiting surfaces and keep them user-opened until public job access is reviewed.",
    notes:
      "Rippling Recruiting is an ATS, but available developer material is partner/account-scoped; do not treat it as a public feed.",
  },
  {
    id: "zoho-recruit",
    label: "Zoho Recruit",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["zohorecruit.com", "zohorecruit.in", "zohorecruit.eu"],
    examples: ["Zoho Recruit career portals"],
    implementationPath:
      "Detect Zoho Recruit pages and keep native access disabled unless a user-owned credential flow is added.",
    notes:
      "Zoho Recruit APIs are integration APIs; job-seeker discovery should stay user-opened unless public posting access is reviewed.",
  },
  {
    id: "freshteam",
    label: "Freshteam",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns: ["freshteam.com", "freshteam.io"],
    examples: ["Freshteam career pages", "Freshworks Freshteam job postings"],
    implementationPath:
      "Detect Freshteam career pages and add native support only after API-key, rate-limit, and public-posting review.",
    notes:
      "Freshteam documents job posting APIs and SDKs, but access appears account-scoped.",
  },
  {
    id: "pinpoint",
    label: "Pinpoint",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["US", "UK", "global"],
    careerProfileIds: "all",
    hostPatterns: ["pinpointhq.com", "pinpoint.com"],
    examples: ["Pinpoint career pages"],
    implementationPath:
      "Detect Pinpoint-hosted pages and keep scheduled discovery disabled until public endpoint behavior is proven.",
    notes:
      "Pinpoint has a REST API, but public cross-customer job access needs source-specific proof before native support.",
  },
  {
    id: "jobscore",
    label: "JobScore",
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["US", "global"],
    careerProfileIds: "all",
    hostPatterns: ["jobscore.com", "developers.jobscore.com"],
    examples: ["JobScore career pages", "JobScore job feeds"],
    implementationPath:
      "Detect JobScore career pages and use job feed support only after tenant/feed review.",
    notes:
      "JobScore documents a Job Feed API separately from its Hire API; source-specific feed access must be verified.",
  },
  ...JOB_SOURCE_NON_ATS_PLATFORM_ENTRIES,
] as const;
