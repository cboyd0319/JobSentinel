/**
 * Career profile utilities for zero-config onboarding.
 */

import {
  CAREER_PROFILES,
  type CareerProfile,
  type ProfileIconType,
} from "../shared/careerProfileTaxonomy";
import {
  TECH_SOURCE_PROFILE_IDS,
  TECH_SOURCE_TERMS,
} from "../shared/jobSourceRecommendationTaxonomy";

export { CAREER_PROFILES, type CareerProfile, type ProfileIconType };

export interface SourceDefaults {
  remoteokEnabled: boolean;
  hnHiringEnabled: boolean;
  weworkremotelyEnabled: boolean;
}

const TECH_SOURCE_PROFILE_ID_SET = new Set<string>(TECH_SOURCE_PROFILE_IDS);

function buildSourceDefaults(
  isTechFocused: boolean,
  allowRemote: boolean,
): SourceDefaults {
  return {
    remoteokEnabled: isTechFocused && allowRemote,
    hnHiringEnabled: isTechFocused,
    weworkremotelyEnabled: isTechFocused && allowRemote,
  };
}

export function searchLooksTechFocused(terms: string[]): boolean {
  return terms
    .map((term) => normalizeSearchTerm(term))
    .some((term) =>
      TECH_SOURCE_TERMS.some((techTerm) => term.includes(` ${techTerm} `)),
    );
}

function normalizeSearchTerm(term: string): string {
  return ` ${term
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export function getProfileSourceDefaults(
  profile: CareerProfile,
): SourceDefaults {
  return buildSourceDefaults(
    TECH_SOURCE_PROFILE_ID_SET.has(profile.id),
    profile.locationPreferences.allow_remote,
  );
}

export function getSearchSourceDefaults(search: {
  titles: string[];
  keywords: string[];
  allowRemote: boolean;
}): SourceDefaults {
  return buildSourceDefaults(
    searchLooksTechFocused([...search.titles, ...search.keywords]),
    search.allowRemote,
  );
}

/**
 * Get a career profile by ID.
 */
export function getProfileById(id: string): CareerProfile | undefined {
  return CAREER_PROFILES.find((profile) => profile.id === id);
}

/**
 * Convert a career profile to config format for first-run setup.
 */
export function profileToConfig(profile: CareerProfile) {
  return {
    title_allowlist: [...profile.titleAllowlist],
    title_blocklist: [...profile.titleBlocklist],
    keywords_boost: [...profile.keywordsBoost],
    keywords_exclude: [...profile.keywordsExclude],
    location_preferences: {
      ...profile.locationPreferences,
      cities: [] as string[],
    },
    salary_floor_usd: profile.salaryFloor,
    alerts: {
      slack: {
        enabled: false,
        webhook_url: "",
      },
      desktop: {
        enabled: false,
        play_sound: false,
        show_when_focused: false,
      },
    },
    // First-run setup shows source suggestions separately. Sources stay off
    // until the user checks them in review or turns them on in Settings.
    remoteok: {
      enabled: false,
      tags: [] as string[],
      limit: 50,
    },
    hn_hiring: {
      enabled: false,
      remote_only: false,
      limit: 100,
    },
    weworkremotely: {
      enabled: false,
      limit: 50,
    },
    simplyhired: {
      enabled: false,
      query: "",
      limit: 50,
    },
  };
}
