export type RestrictedJobSourceDomainCategory =
  | "authenticated-marketplace"
  | "local-credential-source"
  | "restricted-job-board"
  | "review-required-source";

export interface RestrictedJobSourceDomainRecord {
  readonly domain: string;
  readonly category: RestrictedJobSourceDomainCategory;
  readonly sourceRefs: readonly string[];
  readonly reason: string;
}

export const RESTRICTED_JOB_SOURCE_DOMAIN_RECORDS = [
  {
    domain: "bayt.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:bayt"],
    reason:
      "Bayt is a MENA job board marked restricted-user-gated in the source taxonomy; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "builtin.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:builtin"],
    reason:
      "Built In is a regional job-board network marked restricted-user-gated; direct board collection should require user agreement and prefer employer-career follow-through.",
  },
  {
    domain: "builtincolorado.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:builtin"],
    reason:
      "Built In Colorado is a regional Built In board covered by the restricted Built In source; warn before direct collection and prefer employer-career follow-through.",
  },
  {
    domain: "careerbuilder.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:careerbuilder"],
    reason:
      "CareerBuilder is a broad job board marked restricted-user-gated; direct collection needs explicit user agreement because account, terms, and platform controls may apply.",
  },
  {
    domain: "clearancejobs.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:clearancejobs"],
    reason:
      "ClearanceJobs covers clearance-sensitive roles and is marked restricted-user-gated; warn before direct collection because account state and sensitive job-search context may apply.",
  },
  {
    domain: "cv-library.co.uk",
    category: "review-required-source",
    sourceRefs: ["legacy-restricted-url-gate:cv-library"],
    reason:
      "CV-Library is a legacy UK broad-board warning gate without a reviewed native adapter; keep it restricted until source-specific terms, rate limits, and account behavior are reviewed.",
  },
  {
    domain: "dice.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:dice", "scheduled-source:dice"],
    reason:
      "Dice is a technology job board with restricted scheduled-source handling; direct or scheduled collection must require the saved local user acknowledgement.",
  },
  {
    domain: "flexjobs.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:flexjobs"],
    reason:
      "FlexJobs is marked restricted-user-gated and may involve member/account access; warn before direct collection and do not silently schedule it without agreement.",
  },
  {
    domain: "foundit.in",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:foundit"],
    reason:
      "Foundit India is marked restricted-user-gated for India/APAC job search; warn before direct collection until access model, terms, and account behavior are reviewed.",
  },
  {
    domain: "foundit.id",
    category: "restricted-job-board",
    sourceRefs: ["legacy-restricted-url-gate:foundit-indonesia"],
    reason:
      "Foundit Indonesia is part of the existing restricted Foundit regional gate; keep warning coverage until it receives source-specific taxonomy and access review.",
  },
  {
    domain: "foundit.sg",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:foundit"],
    reason:
      "Foundit Singapore is marked restricted-user-gated for APAC job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "founditgulf.com",
    category: "restricted-job-board",
    sourceRefs: ["legacy-restricted-url-gate:foundit-gulf"],
    reason:
      "Foundit Gulf is a legacy regional Foundit warning gate; keep it restricted until the Gulf site has source-specific terms, rate-limit, and account-behavior review.",
  },
  {
    domain: "freelancer.com",
    category: "authenticated-marketplace",
    sourceRefs: ["job-source-discovery:freelancer"],
    reason:
      "Freelancer is a marketplace marked restricted-user-gated; warn because account state, bidding workflows, marketplace terms, and user privacy are central to access.",
  },
  {
    domain: "glassdoor.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:glassdoor", "scheduled-source:glassdoor"],
    reason:
      "Glassdoor combines jobs with account-adjacent reviews and restricted scheduled-source handling; direct or scheduled collection needs explicit local user acknowledgement.",
  },
  {
    domain: "governmentjobs.com",
    category: "review-required-source",
    sourceRefs: ["job-source-discovery:governmentjobs"],
    reason:
      "GovernmentJobs is review-required in the source taxonomy and can include application/account surfaces; warn on direct collection until public access boundaries are reviewed.",
  },
  {
    domain: "gulftalent.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:gulftalent"],
    reason:
      "GulfTalent is marked restricted-user-gated for Gulf-region job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "indeed.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:indeed"],
    reason:
      "Indeed is a broad job board marked restricted-user-gated; direct collection requires explicit user agreement because terms, account, and anti-automation controls may apply.",
  },
  {
    domain: "jobstreet.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:jobstreet"],
    reason:
      "JobStreet is marked restricted-user-gated for APAC job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "jora.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:jora"],
    reason:
      "Jora is marked restricted-user-gated for international job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "linkedin.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:linkedin", "interactive-source:linkedin"],
    reason:
      "LinkedIn jobs and tracker surfaces are restricted and account-centric; use only explicit user-gated, fresh-login interactive flows with no auth or session persistence.",
  },
  {
    domain: "monster.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:monster"],
    reason:
      "Monster is a broad job board marked restricted-user-gated; direct collection needs explicit user agreement because account, terms, and platform controls may apply.",
  },
  {
    domain: "naukri.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:naukri"],
    reason:
      "Naukri is marked restricted-user-gated for India job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "reed.co.uk",
    category: "local-credential-source",
    sourceRefs: ["job-source-discovery:reed"],
    reason:
      "Reed is modeled as a local-credential/API candidate; warn for direct website collection so JobSentinel favors reviewed API or credentialed paths when available.",
  },
  {
    domain: "seek.co.nz",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:seek"],
    reason:
      "SEEK New Zealand is marked restricted-user-gated; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "seek.com.au",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:seek"],
    reason:
      "SEEK Australia is marked restricted-user-gated; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "shine.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:shine"],
    reason:
      "Shine is marked restricted-user-gated for India job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "simplyhired.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:simplyhired", "scheduled-source:simplyhired"],
    reason:
      "SimplyHired is a restricted scheduled-source candidate with anti-bot and access uncertainty; direct or scheduled collection needs explicit local user acknowledgement.",
  },
  {
    domain: "snagajob.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:snagajob"],
    reason:
      "Snagajob is marked restricted-user-gated for hourly retail and hospitality roles; warn before direct collection until access model and account behavior are reviewed.",
  },
  {
    domain: "timesjobs.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:timesjobs"],
    reason:
      "TimesJobs is marked restricted-user-gated for India job search; warn before direct collection until source-specific access terms and account behavior are reviewed.",
  },
  {
    domain: "totaljobs.com",
    category: "review-required-source",
    sourceRefs: ["legacy-restricted-url-gate:totaljobs"],
    reason:
      "Totaljobs is a legacy UK broad-board warning gate without a reviewed native adapter; keep it restricted until source-specific terms, rate limits, and account behavior are reviewed.",
  },
  {
    domain: "toptal.com",
    category: "authenticated-marketplace",
    sourceRefs: ["job-source-discovery:toptal"],
    reason:
      "Toptal is a talent marketplace marked restricted-user-gated; warn because account state, marketplace terms, screening context, and user privacy are central to access.",
  },
  {
    domain: "upwork.com",
    category: "authenticated-marketplace",
    sourceRefs: ["job-source-discovery:upwork"],
    reason:
      "Upwork is a marketplace marked restricted-user-gated; warn because account state, proposal workflows, marketplace terms, and user privacy are central to access.",
  },
  {
    domain: "vivian.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:vivian-health"],
    reason:
      "Vivian Health is marked restricted-user-gated for healthcare and travel nursing roles; warn before direct collection until access model and account behavior are reviewed.",
  },
  {
    domain: "wellfound.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:wellfound"],
    reason:
      "Wellfound is marked restricted-user-gated for startup hiring; warn before direct collection until current source access model and account behavior are reviewed.",
  },
  {
    domain: "ziprecruiter.com",
    category: "restricted-job-board",
    sourceRefs: ["job-source-discovery:ziprecruiter"],
    reason:
      "ZipRecruiter is a broad job board marked restricted-user-gated; direct collection needs explicit user agreement because terms, account, and platform controls may apply.",
  },
] as const satisfies readonly RestrictedJobSourceDomainRecord[];

export const RESTRICTED_JOB_SOURCE_DOMAINS: readonly string[] =
  RESTRICTED_JOB_SOURCE_DOMAIN_RECORDS.map((record) => record.domain);

export const RESTRICTED_JOB_SOURCE_WARNING =
  "Some job sites have rules about automated tools. JobSentinel keeps you in control: it will not sign in for you, click for you, bypass checks, or save your login. Continue only for sites you choose to use, and review that site's rules if you are unsure.";

export const RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES = 60;

export const RESTRICTED_AUTHENTICATED_SOURCE_WARNING =
  "JobSentinel can open a sign-in window for a restricted job site when you ask. You sign in and use the site yourself. JobSentinel does not save your sign-in, read the page for you, click buttons, or run in the background. Use JobSentinel's local buttons and notes to record what you did.";

export const RESTRICTED_SCHEDULED_JOB_SOURCES = [
  {
    id: "builtin",
    label: "BuiltIn",
    reason:
      "BuiltIn is a job board checked directly from this computer, not an official API feed.",
  },
  {
    id: "dice",
    label: "Dice",
    reason:
      "Dice is a job board checked directly from this computer, not an official API feed.",
  },
  {
    id: "simplyhired",
    label: "SimplyHired",
    reason:
      "SimplyHired is a job aggregator with anti-bot controls and may restrict automated collection.",
  },
  {
    id: "glassdoor",
    label: "Glassdoor",
    reason:
      "Glassdoor publishes jobs together with reviews and account-protected pages, and may restrict automated collection.",
  },
] as const;

export type RestrictedScheduledJobSourceId =
  (typeof RESTRICTED_SCHEDULED_JOB_SOURCES)[number]["id"];

export type RestrictedSourceAcknowledgements = Record<
  RestrictedScheduledJobSourceId,
  boolean
>;

export const DEFAULT_RESTRICTED_SOURCE_ACKNOWLEDGEMENTS: RestrictedSourceAcknowledgements =
  {
    builtin: false,
    dice: false,
    simplyhired: false,
    glassdoor: false,
  };

export function normalizeRestrictedSourceAcknowledgements(
  acknowledgements:
    | Partial<Record<RestrictedScheduledJobSourceId, boolean>>
    | null
    | undefined,
): RestrictedSourceAcknowledgements {
  return {
    ...DEFAULT_RESTRICTED_SOURCE_ACKNOWLEDGEMENTS,
    ...(acknowledgements ?? {}),
  };
}

export function restrictedScheduledJobSourceLabel(
  sourceId: RestrictedScheduledJobSourceId,
): string {
  return (
    RESTRICTED_SCHEDULED_JOB_SOURCES.find((source) => source.id === sourceId)
      ?.label ?? sourceId
  );
}

export function isRestrictedJobSourceHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return RESTRICTED_JOB_SOURCE_DOMAINS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

export function isRestrictedJobSourceUrl(value: string): boolean {
  try {
    return isRestrictedJobSourceHost(new URL(value).hostname);
  } catch {
    return false;
  }
}
