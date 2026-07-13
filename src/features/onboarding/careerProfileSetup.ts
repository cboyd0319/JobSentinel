import {
  CAREER_PROFILES,
  type CareerProfile,
} from "../../shared/careerProfileTaxonomy";

/**
 * Get a career profile by ID.
 */
export function findCareerProfileById(id: string): CareerProfile | undefined {
  return CAREER_PROFILES.find((profile) => profile.id === id);
}

/**
 * Convert a career profile to config format for first-run setup.
 */
export function buildSetupConfigFromCareerProfile(profile: CareerProfile) {
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
