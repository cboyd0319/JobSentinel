import {
  getMockActiveCompanies,
  getMockHottestLocations,
  getMockMarketSnapshot,
  getMockTrendingSkills,
} from "../mockHandlers";
import { getNumericArg } from "../../../mocks/handlers/commandHelpers";
import type { MockMarketAlert } from "../../../mocks/handlers/types";

interface MockMarketState {
  marketAlerts: MockMarketAlert[];
}

interface MockMarketCommandResult {
  handled: boolean;
  value: unknown;
  state: MockMarketState;
  shouldSave: boolean;
}

export function handleMockMarketCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockMarketState,
): MockMarketCommandResult {
  switch (command) {
    case "get_trending_skills":
      return result(getMockTrendingSkills(), state);
    case "get_active_companies":
      return result(getMockActiveCompanies(), state);
    case "get_hottest_locations":
      return result(getMockHottestLocations(), state);
    case "get_market_alerts":
      return result(state.marketAlerts, state);
    case "get_market_snapshot":
      return result(getMockMarketSnapshot(), state);
    case "run_market_analysis":
      return result({ success: true }, state);
    case "mark_alert_read":
      return result(
        undefined,
        {
          marketAlerts: state.marketAlerts.map((alert) =>
            alert.id === getNumericArg(args, "id")
              ? { ...alert, is_read: true }
              : alert,
          ),
        },
        true,
      );
    case "mark_all_alerts_read":
      return result(
        undefined,
        {
          marketAlerts: state.marketAlerts.map((alert) => ({
            ...alert,
            is_read: true,
          })),
        },
        true,
      );
    default:
      return { handled: false, value: undefined, state, shouldSave: false };
  }
}

function result(
  value: unknown,
  state: MockMarketState,
  shouldSave = false,
): MockMarketCommandResult {
  return { handled: true, value, state, shouldSave };
}
