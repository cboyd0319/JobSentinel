import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";

describe("mock scraper and interview command handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("handles scraper health commands in dev mocks", async () => {
    const summary = await mockInvoke<{
      total_scrapers: number;
      healthy: number;
      degraded: number;
      down: number;
      disabled: number;
      total_jobs_24h: number;
    }>("get_health_summary");
    expect(summary.total_scrapers).toBeGreaterThan(0);

    const scrapers = await mockInvoke<Array<{ scraper_name: string; is_enabled: boolean }>>(
      "get_scraper_health",
    );
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
    const updatedScrapers = await mockInvoke<Array<{ scraper_name: string; is_enabled: boolean }>>(
      "get_scraper_health",
    );
    expect(updatedScrapers.find((scraper) => scraper.scraper_name === "greenhouse")?.is_enabled)
      .toBe(false);
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

    const allSmoke = await mockInvoke<Array<{ scraper_name: string; passed: boolean }>>(
      "run_all_smoke_tests",
    );
    expect(allSmoke.length).toBeGreaterThanOrEqual(scrapers.length);

    await expect(mockInvoke<Array<unknown>>("get_expiring_credentials"))
      .resolves.toEqual(expect.any(Array));
  });

  it("handles interview persistence commands in dev mocks", async () => {
    await expect(
      mockInvoke<void>("save_interview_prep_item", {
        interviewId: 1,
        itemId: "research",
        completed: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      mockInvoke<Array<{ itemId: string; completed: boolean; completedAt: string | null }>>(
        "get_interview_prep_checklist",
        { interviewId: 1 },
      ),
    ).resolves.toEqual([
      expect.objectContaining({ itemId: "research", completed: true }),
    ]);

    const followup = await mockInvoke<{
      interviewId: number;
      thankYouSent: boolean;
      sentAt: string | null;
    }>("save_interview_followup", {
      interviewId: 1,
      thankYouSent: true,
    });
    expect(followup).toMatchObject({
      interviewId: 1,
      thankYouSent: true,
      sentAt: expect.any(String),
    });
    await expect(
      mockInvoke("get_interview_followup", { interviewId: 1 }),
    ).resolves.toMatchObject({
      interviewId: 1,
      thankYouSent: true,
    });
  });
});
