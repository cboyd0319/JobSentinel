import { describe, expect, it } from "vitest";
import { JOB_SOURCE_DISCOVERY_TAXONOMY } from "./jobSourceDiscoveryTaxonomy";
import {
  OFFICIAL_JOB_SOURCE_API_CORPUS,
  officialApiEntriesForExample,
  officialApiEntriesForSourceFamily,
} from "./jobSourceOfficialApiCorpus";

describe("jobSourceOfficialApiCorpus", () => {
  it("keeps corpus IDs unique", () => {
    const ids = OFFICIAL_JOB_SOURCE_API_CORPUS.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers representative employer examples with official API paths", () => {
    expect(officialApiEntriesForExample("Fivetran")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFamilyId: "greenhouse",
          access: "documented-public-api",
          implementation: "supported-adapter",
        }),
      ]),
    );
    expect(officialApiEntriesForExample("OpenAI")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFamilyId: "ashby",
          access: "documented-public-api",
        }),
      ]),
    );
    expect(officialApiEntriesForExample("Optiv")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFamilyId: "workday",
          access: "employer-owned-web-api",
        }),
      ]),
    );
    expect(officialApiEntriesForExample("Amazon")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFamilyId: "amazon-jobs",
          access: "employer-owned-web-api",
        }),
      ]),
    );
    expect(officialApiEntriesForExample("GitHub")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFamilyId: "icims",
          access: "employer-owned-web-api",
        }),
      ]),
    );
  });

  it("separates supported adapters from candidate adapters and gated sessions", () => {
    const supportedIds = OFFICIAL_JOB_SOURCE_API_CORPUS.filter(
      (entry) => entry.implementation === "supported-adapter",
    ).map((entry) => entry.id);
    const gated = OFFICIAL_JOB_SOURCE_API_CORPUS.find(
      (entry) => entry.id === "linkedin-user-session",
    );
    const indeed = OFFICIAL_JOB_SOURCE_API_CORPUS.find(
      (entry) => entry.id === "indeed-api-guides",
    );

    expect(supportedIds).toEqual(
      expect.arrayContaining([
        "greenhouse-job-board-api",
        "lever-postings-api",
        "remoteok-api",
        "hacker-news-algolia-api",
      ]),
    );
    expect(officialApiEntriesForSourceFamily("remote-first-jobs")).toEqual([
      expect.objectContaining({
        id: "remote-first-jobs-api",
        access: "documented-public-api",
        implementation: "candidate-adapter",
      }),
    ]);
    expect(officialApiEntriesForSourceFamily("adzuna")).toEqual([
      expect.objectContaining({
        id: "adzuna-api",
        access: "partner-or-authenticated-api",
      }),
    ]);
    expect(gated).toMatchObject({
      access: "restricted-authenticated-user-session",
      implementation: "restricted-user-gated",
    });
    expect(indeed).toMatchObject({
      access: "partner-or-authenticated-api",
      implementation: "review-before-adapter",
    });
  });

  it("records locally validated Fortune 100 adapter lanes without promoting them to unrestricted broad crawlers", () => {
    expect(officialApiEntriesForSourceFamily("workday")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "workday-cxs-web-api",
          access: "employer-owned-web-api",
          implementation: "candidate-adapter",
        }),
      ]),
    );
    expect(officialApiEntriesForSourceFamily("phenom")).toEqual([
      expect.objectContaining({
        id: "phenom-widget-refine-search",
        access: "employer-owned-web-api",
        implementation: "candidate-adapter",
      }),
    ]);
    expect(officialApiEntriesForSourceFamily("radancy-talentbrew")).toEqual([
      expect.objectContaining({
        id: "radancy-talentbrew-html",
        access: "public-career-html",
        implementation: "candidate-adapter",
      }),
    ]);
  });

  it("keeps every corpus source family discoverable in the shared taxonomy", () => {
    const discoveryIds = new Set(
      JOB_SOURCE_DISCOVERY_TAXONOMY.map((entry) => entry.id),
    );

    for (const entry of OFFICIAL_JOB_SOURCE_API_CORPUS) {
      expect(
        discoveryIds.has(entry.sourceFamilyId),
        `${entry.id} references missing source family ${entry.sourceFamilyId}`,
      ).toBe(true);
    }
  });

  it("records endpoint patterns without live session material", () => {
    for (const entry of OFFICIAL_JOB_SOURCE_API_CORPUS) {
      expect(entry.endpointPatterns.length, `${entry.id} endpoint patterns`).toBeGreaterThan(0);
      expect(entry.endpointPatterns.join(" ")).not.toMatch(
        /cookie|session|li_at|authorization|csrf|instrumentation|telemetry|collector/i,
      );
    }
  });

  it("returns all official APIs for a source family", () => {
    expect(officialApiEntriesForSourceFamily("greenhouse")).toEqual([
      expect.objectContaining({ id: "greenhouse-job-board-api" }),
    ]);
    expect(officialApiEntriesForSourceFamily("linkedin")).toEqual([
      expect.objectContaining({ id: "linkedin-user-session" }),
    ]);
  });
});
