/**
 * Career profile taxonomy for zero-config onboarding.
 * Keep role titles, search keywords, exclusions, and preview terms here so
 * profile language can grow without touching setup behavior.
 */

import { GENERAL_CAREER_PROFILES } from "./careerProfileGeneralEntries";
import { TECHNICAL_CAREER_PROFILES } from "./careerProfileTechnicalEntries";
import { BUSINESS_CAREER_PROFILES } from "./careerProfileBusinessEntries";
import { SERVICE_CAREER_PROFILES } from "./careerProfileServiceEntries";
import type { CareerProfile } from "./careerProfileModel";

export type { CareerProfile } from "./careerProfileModel";

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
