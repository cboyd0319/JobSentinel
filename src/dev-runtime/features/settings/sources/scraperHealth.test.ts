import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../mocks/handlers";

describe("Settings source health mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("handles source health commands in development mocks", async () => {
    const summary = await mockInvoke<{
      total_scrapers: number;
      healthy: number;
      degraded: number;
      down: number;
      disabled: number;
      total_jobs_24h: number;
    }>("get_health_summary");
    expect(summary.total_scrapers).toBeGreaterThan(0);

    const scrapers = await mockInvoke<
      Array<{ scraper_name: string; is_enabled: boolean }>
    >("get_scraper_health");
    expect(scrapers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scraper_name: "greenhouse", is_enabled: true }),
      ]),
    );

    await expect(
      mockInvoke<void>("set_scraper_enabled", {
        scraperName: "greenhouse",
        enabled: false,
      }),
    ).resolves.toBeUndefined();
    const updatedScrapers = await mockInvoke<
      Array<{ scraper_name: string; is_enabled: boolean }>
    >("get_scraper_health");
    expect(
      updatedScrapers.find((scraper) => scraper.scraper_name === "greenhouse")
        ?.is_enabled,
    ).toBe(false);
    await mockInvoke<void>("set_scraper_enabled", {
      scraperName: "greenhouse",
      enabled: true,
    });

    const runs = await mockInvoke<Array<{ scraper_name: string; status: string }>>(
      "get_scraper_runs",
      { scraperName: "greenhouse", limit: 2 },
    );
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ scraper_name: "greenhouse" });

    const smoke = await mockInvoke<{ scraper_name: string; passed: boolean }>(
      "run_scraper_smoke_test",
      { scraperName: "greenhouse" },
    );
    expect(smoke).toMatchObject({ scraper_name: "greenhouse", passed: true });

    const restricted = await mockInvoke<{
      scraper_name: string;
      details: { status: string };
    }>("run_scraper_smoke_test", {
      scraperName: "dice",
      restrictedSourceAcknowledged: true,
    });
    expect(restricted).toMatchObject({
      scraper_name: "dice",
      details: { status: "skipped" },
    });

    const allSmoke = await mockInvoke<
      Array<{ scraper_name: string; passed: boolean }>
    >("run_all_smoke_tests");
    expect(allSmoke.length).toBeGreaterThanOrEqual(scrapers.length);

  });
});
