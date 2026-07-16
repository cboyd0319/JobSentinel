import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../dev-runtime/mocks/handlers";

type SkillTrend = {
  skill_name: string;
  total_jobs: number;
  avg_salary: number | null;
  change_percent: number;
  trend_direction: string;
};

type MarketAlert = {
  id: number;
  title: string;
  is_read: boolean;
};

type MarketSnapshot = {
  total_jobs: number;
  top_skill: string | null;
  market_sentiment: string;
};

describe("mock market intelligence commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("returns stable hiring trend fixtures", async () => {
    const skills = await mockInvoke<SkillTrend[]>("get_trending_skills", {});
    expect(skills[0]).toMatchObject({
      skill_name: "Customer Support",
      trend_direction: "up",
    });

    const companies = await mockInvoke<Array<{ company_name: string }>>(
      "get_active_companies",
      {},
    );
    expect(companies.map((company) => company.company_name)).toContain(
      "CareBridge Health",
    );

    const locations = await mockInvoke<Array<{ location: string }>>(
      "get_hottest_locations",
      {},
    );
    expect(locations.map((location) => location.location)).toContain("Remote");

    const snapshot = await mockInvoke<MarketSnapshot>("get_market_snapshot", {});
    expect(snapshot).toMatchObject({
      total_jobs: 911,
      top_skill: "Customer Support",
      market_sentiment: "neutral",
    });
  });

  it("keeps market alert read state in the main mock store", async () => {
    const alerts = await mockInvoke<MarketAlert[]>("get_market_alerts", {});
    expect(alerts[0]).toMatchObject({
      title: "Customer support demand is rising",
      is_read: false,
    });

    await mockInvoke<void>("mark_alert_read", { id: alerts[0].id });

    const updatedAlerts = await mockInvoke<MarketAlert[]>("get_market_alerts", {});
    expect(updatedAlerts[0]).toMatchObject({
      id: alerts[0].id,
      is_read: true,
    });
  });
});
