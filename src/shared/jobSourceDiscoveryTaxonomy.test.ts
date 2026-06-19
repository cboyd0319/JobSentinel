import { describe, expect, it } from "vitest";
import { CAREER_PROFILES } from "./careerProfileTaxonomy";
import {
  JOB_SOURCE_DISCOVERY_TAXONOMY,
  authenticatedJobSourceDiscoveryEntries,
  publicNativeJobSourceDiscoveryEntries,
  publicUnauthenticatedJobSourceDiscoveryEntries,
  publicUserAgreementJobSourceDiscoveryEntries,
  restrictedInteractiveJobSourceDiscoveryEntries,
  restrictedJobSourceDiscoveryEntries,
  sourceDiscoveryEntriesForCareerProfile,
  technicalAccessForJobSource,
} from "./jobSourceDiscoveryTaxonomy";
import { RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES } from "./restrictedSourceTaxonomy";

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
    expect("technicalAccess" in builtin!).toBe(false);
    expect(technicalAccessForJobSource(builtin!)).toBe("public-unauthenticated");
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
      technicalAccess: "authenticated-user-session",
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
      technicalAccess: "authenticated-user-session",
      requiresUserAgreement: true,
    });
    expect(linkedinJobsTracker?.searchParameterPatterns).toEqual(
      expect.arrayContaining(["stage=applied", "stage=saved"]),
    );
  });

  it("separates public consent-gated sources from authenticated user sessions", () => {
    const publicUnauthenticatedIds =
      publicUnauthenticatedJobSourceDiscoveryEntries().map((entry) => entry.id);
    const publicAgreementIds =
      publicUserAgreementJobSourceDiscoveryEntries().map((entry) => entry.id);
    const authenticatedIds = authenticatedJobSourceDiscoveryEntries().map(
      (entry) => entry.id,
    );

    expect(publicUnauthenticatedIds).toEqual(
      expect.arrayContaining(["greenhouse", "indeed", "builtin", "dice"]),
    );
    expect(publicAgreementIds).toEqual(
      expect.arrayContaining(["indeed", "builtin", "dice", "glassdoor"]),
    );
    expect(authenticatedIds).toEqual(
      expect.arrayContaining([
        "linkedin",
        "linkedin-jobs-tracker",
        "flexjobs",
        "upwork",
        "freelancer",
        "toptal",
      ]),
    );

    expect(publicAgreementIds).not.toContain("linkedin");
    expect(publicAgreementIds).not.toContain("upwork");
    expect(authenticatedIds).not.toContain("indeed");
    expect(authenticatedIds).not.toContain("builtin");
  });

  it("keeps reviewed public APIs and public feeds low-friction", () => {
    const lowFrictionPublicIds = publicNativeJobSourceDiscoveryEntries().map(
      (entry) => entry.id,
    );

    expect(lowFrictionPublicIds).toEqual(
      expect.arrayContaining([
        "greenhouse",
        "lever",
        "remoteok",
        "we-work-remotely",
        "hacker-news-who-is-hiring",
        "yc-work-at-a-startup",
      ]),
    );

    for (const source of publicNativeJobSourceDiscoveryEntries()) {
      expect(source.requiresUserAgreement).not.toBe(true);
      expect(source.restrictedInteractiveSessionPolicy).toBeUndefined();
      expect(technicalAccessForJobSource(source)).not.toBe(
        "authenticated-user-session",
      );
    }
  });

  it("caps restricted authenticated interactive sessions and forbids auth storage", () => {
    const interactiveSources = restrictedInteractiveJobSourceDiscoveryEntries();

    expect(interactiveSources.map((entry) => entry.id).sort()).toEqual([
      "linkedin",
      "linkedin-jobs-tracker",
    ]);

    for (const source of interactiveSources) {
      expect(technicalAccessForJobSource(source)).toBe(
        "authenticated-user-session",
      );
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
        privacyReminderMinutes: RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES,
        hardSessionExpiryRequired: false,
      });
    }
  });

  it("does not time-gate unauthenticated restricted public sources", () => {
    for (const source of publicUserAgreementJobSourceDiscoveryEntries()) {
      expect(technicalAccessForJobSource(source)).toBe("public-unauthenticated");
      expect(source.restrictedInteractiveSessionPolicy).toBeUndefined();
    }
  });
});
