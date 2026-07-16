/**
 * Career profile taxonomy for zero-config onboarding.
 * Keep role titles, search keywords, exclusions, and preview terms here so
 * profile language can grow without touching setup behavior.
 */

import { GENERAL_CAREER_PROFILES } from "./careerProfileGeneralEntries";
import { TECHNICAL_CAREER_PROFILES } from "./careerProfileTechnicalEntries";
import { BUSINESS_CAREER_PROFILES } from "./careerProfileBusinessEntries";
import { SERVICE_CAREER_PROFILES } from "./careerProfileServiceEntries";

export interface CareerProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  salaryRange: string;
  salaryFloor: number;
  titleAllowlist: string[];
  titleBlocklist: string[];
  keywordsBoost: string[];
  keywordsExclude: string[];
  locationPreferences: {
    allow_remote: boolean;
    allow_hybrid: boolean;
    allow_onsite: boolean;
  };
  sampleTitles: string[]; // First 3-4 titles for preview
}

export const CAREER_PROFILES: CareerProfile[] = [
  ...GENERAL_CAREER_PROFILES,
  ...TECHNICAL_CAREER_PROFILES,
  ...BUSINESS_CAREER_PROFILES,
  ...SERVICE_CAREER_PROFILES,
];

export type ProfileIconType =
  | "code"
  | "shield"
  | "chart"
  | "lightbulb"
  | "trending"
  | "briefcase"
  | "users"
  | "calculator"
  | "clipboard"
  | "pen"
  | "heart"
  | "scale"
  | "book"
  | "smile"
  | "palette";
