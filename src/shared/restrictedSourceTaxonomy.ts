export const RESTRICTED_JOB_SOURCE_DOMAINS = [
  "careerbuilder.com",
  "clearancejobs.com",
  "cv-library.co.uk",
  "dice.com",
  "flexjobs.com",
  "foundit.in",
  "foundit.id",
  "founditgulf.com",
  "glassdoor.com",
  "governmentjobs.com",
  "indeed.com",
  "linkedin.com",
  "monster.com",
  "naukri.com",
  "reed.co.uk",
  "shine.com",
  "simplyhired.com",
  "timesjobs.com",
  "totaljobs.com",
  "wellfound.com",
  "ziprecruiter.com",
] as const;

export const RESTRICTED_JOB_SOURCE_WARNING =
  "Some job sites, including LinkedIn, Indeed, Glassdoor, Monster, ZipRecruiter, Naukri, and similar boards, say third-party software that scrapes, modifies, or automates activity can violate their User Agreement or terms, may lead to account restrictions or legal claims, and may raise privacy-law concerns. Do not bypass login walls, human checks, platform controls, or another person's privacy.";

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
