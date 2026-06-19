export type {
  JobSourceAccessModel,
  JobSourceCoverage,
  JobSourceDiscoveryCategory,
  JobSourceDiscoveryEntry,
  JobSourceImplementationStatus,
  JobSourceTechnicalAccess,
  RestrictedInteractiveSessionPolicy,
} from "./jobSourceDiscoveryModel";
import {
  technicalAccessForJobSource,
  type JobSourceDiscoveryEntry,
} from "./jobSourceDiscoveryModel";
import { JOB_SOURCE_BOARDS_DISCOVERY_ENTRIES } from "./jobSourceDiscoveryBoardsEntries";
import { JOB_SOURCE_PLATFORM_DISCOVERY_ENTRIES } from "./jobSourceDiscoveryPlatformEntries";
import { JOB_SOURCE_SECTOR_DISCOVERY_ENTRIES } from "./jobSourceDiscoverySectorEntries";

export const JOB_SOURCE_DISCOVERY_TAXONOMY: readonly JobSourceDiscoveryEntry[] = [
  ...JOB_SOURCE_PLATFORM_DISCOVERY_ENTRIES,
  ...JOB_SOURCE_BOARDS_DISCOVERY_ENTRIES,
  ...JOB_SOURCE_SECTOR_DISCOVERY_ENTRIES,
];

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

export function publicUnauthenticatedJobSourceDiscoveryEntries(): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter(
    (entry) => technicalAccessForJobSource(entry) === "public-unauthenticated",
  );
}

export function publicUserAgreementJobSourceDiscoveryEntries(): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter(
    (entry) =>
      technicalAccessForJobSource(entry) === "public-unauthenticated" &&
      (entry.accessModel === "restricted-user-gated" ||
        entry.requiresUserAgreement === true),
  );
}

export function authenticatedJobSourceDiscoveryEntries(): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter(
    (entry) =>
      technicalAccessForJobSource(entry) === "authenticated-user-session",
  );
}

export function restrictedInteractiveJobSourceDiscoveryEntries(): readonly JobSourceDiscoveryEntry[] {
  return JOB_SOURCE_DISCOVERY_TAXONOMY.filter(
    (entry) => entry.restrictedInteractiveSessionPolicy !== undefined,
  );
}

export { technicalAccessForJobSource };
