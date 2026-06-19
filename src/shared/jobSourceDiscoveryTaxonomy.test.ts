import { describe, expect, it } from "vitest";
import { CAREER_PROFILES } from "./careerProfileTaxonomy";
import {
  JOB_SOURCE_DISCOVERY_TAXONOMY,
  publicNativeJobSourceDiscoveryEntries,
  restrictedInteractiveJobSourceDiscoveryEntries,
  restrictedJobSourceDiscoveryEntries,
  sourceDiscoveryEntriesForCareerProfile,
} from "./jobSourceDiscoveryTaxonomy";
import { RESTRICTED_INTERACTIVE_SESSION_MAX_MINUTES } from "./restrictedSourceTaxonomy";

describe("jobSourceDiscoveryTaxonomy", () => {
  it("keeps source IDs unique", () => {
    const ids = JOB_SOURCE_DISCOVERY_TAXONOMY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references known career profile IDs", () => {
    const careerProfileIds = new Set(
      CAREER_PROFILES.map((profile) => profile.id),
    );

    for (const source of JOB_SOURCE_DISCOVERY_TAXONOMY) {
      if (source.careerProfileIds === "all") {
        continue;
      }

      for (const profileId of source.careerProfileIds) {
        expect(
          careerProfileIds.has(profileId),
          `${source.id} references unknown career profile ${profileId}`,
        ).toBe(true);
      }
    }
  });

  it("covers every career profile with multiple discovery paths", () => {
    for (const profile of CAREER_PROFILES) {
      const sources = sourceDiscoveryEntriesForCareerProfile(profile.id);

      expect(sources.length, `${profile.id} source count`).toBeGreaterThan(5);
      expect(
        sources.some((source) => source.category === "employer-careers"),
        `${profile.id} employer-careers coverage`,
      ).toBe(true);
      expect(
        sources.some((source) => source.category === "regional-local"),
        `${profile.id} regional-local coverage`,
      ).toBe(true);
    }
  });

  it("tracks public native and official source candidates separately from restricted boards", () => {
    const publicNativeIds = publicNativeJobSourceDiscoveryEntries().map(
      (entry) => entry.id,
    );
    const restrictedIds = restrictedJobSourceDiscoveryEntries().map(
      (entry) => entry.id,
    );

    expect(publicNativeIds).toEqual(
      expect.arrayContaining([
        "greenhouse",
        "lever",
        "ashby",
        "smartrecruiters",
        "usajobs",
      ]),
    );
    expect(restrictedIds).toEqual(
      expect.arrayContaining(["linkedin", "indeed", "builtin"]),
    );
    expect(publicNativeIds).not.toContain("linkedin");
  });

  it("keeps Greenhouse current and legacy host coverage explicit", () => {
    const greenhouse = JOB_SOURCE_DISCOVERY_TAXONOMY.find(
      (entry) => entry.id === "greenhouse",
    );

    expect(greenhouse?.hostPatterns).toEqual(
      expect.arrayContaining([
        "boards-api.greenhouse.io",
        "job-boards.greenhouse.io",
        "boards.greenhouse.io",
      ]),
    );
  });

  it("treats Built In and LinkedIn as restricted user-gated sources", () => {
    const builtin = JOB_SOURCE_DISCOVERY_TAXONOMY.find(
      (entry) => entry.id === "builtin",
    );
    const linkedin = JOB_SOURCE_DISCOVERY_TAXONOMY.find(
      (entry) => entry.id === "linkedin",
    );
    const linkedinJobsTracker = JOB_SOURCE_DISCOVERY_TAXONOMY.find(
      (entry) => entry.id === "linkedin-jobs-tracker",
    );

    expect(builtin).toMatchObject({
      accessModel: "restricted-user-gated",
      requiresUserAgreement: true,
    });
    expect(builtin?.hostPatterns).toEqual(
      expect.arrayContaining(["builtin.com", "builtincolorado.com"]),
    );
    expect(builtin?.locationSearchPatterns).toEqual(
      expect.arrayContaining([
        "/jobs",
        "/jobs?state=<state>&country=<country>&allLocations=true",
        "/jobs?city=<city>&state=<state>&country=<country>&allLocations=true",
      ]),
    );
    expect(linkedin).toMatchObject({
      accessModel: "restricted-user-gated",
      requiresUserAgreement: true,
    });
    expect(linkedin?.searchParameterPatterns).toEqual(
      expect.arrayContaining([
        "keywords=<role-or-skill>",
        "geoId=<linkedin-location-id>",
        "f_TPR=<posted-within-seconds>",
        "f_AL=true",
        "referralSearchId=<session-search-id>",
      ]),
    );
    expect(linkedin?.navigationSurfacePatterns).toEqual(
      expect.arrayContaining([
        "preferences",
        "job tracker",
        "my career insights",
      ]),
    );
    expect(linkedinJobsTracker).toMatchObject({
      accessModel: "restricted-user-gated",
      requiresUserAgreement: true,
    });
    expect(linkedinJobsTracker?.searchParameterPatterns).toEqual(
      expect.arrayContaining(["stage=applied", "stage=saved"]),
    );
  });

  it("caps restricted authenticated interactive sessions and forbids auth storage", () => {
    const interactiveSources = restrictedInteractiveJobSourceDiscoveryEntries();

    expect(interactiveSources.map((entry) => entry.id).sort()).toEqual([
      "linkedin",
      "linkedin-jobs-tracker",
    ]);

    for (const source of interactiveSources) {
      expect(source.restrictedInteractiveSessionPolicy).toMatchObject({
        requiresUserInitiatedAction: true,
        requiresFreshLogin: true,
        preLoginWarningRequired: true,
        storesAuthTokens: false,
        storesSessionCookies: false,
        storesBrowserStorage: false,
        storesAuthorizationHeaders: false,
        backgroundAutomationAllowed: false,
        offlineUseAllowed: false,
        maxSessionMinutes: RESTRICTED_INTERACTIVE_SESSION_MAX_MINUTES,
      });
    }
  });
});
