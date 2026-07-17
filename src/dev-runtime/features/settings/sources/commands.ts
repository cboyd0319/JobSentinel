import type { MockConfig } from "../../../mocks/handlers/types";
import {
  getAllMockSmokeTestResults,
  getMockHealthSummary,
  getMockLatestSourceRequest,
  getMockScraperHealth,
  getMockScraperRuns,
  getMockSmokeTestResultForArgs,
  updateMockScraperEnabled,
} from "./scraperHealth";
import type { MockScraperEnabledOverrides } from "./scraperHealth";

interface MockSourceHealthState {
  config: MockConfig;
  scraperEnabledOverrides: MockScraperEnabledOverrides;
}

interface MockSourceHealthCommandResult {
  handled: boolean;
  value: unknown;
  state: MockSourceHealthState;
  shouldSave: boolean;
}

export function handleMockSourceHealthCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockSourceHealthState,
): MockSourceHealthCommandResult {
  switch (command) {
    case "get_health_summary":
      return result(getMockHealthSummary(state.scraperEnabledOverrides), state);
    case "get_scraper_health":
      return result(getMockScraperHealth(state.scraperEnabledOverrides), state);
    case "set_scraper_enabled": {
      const scraperEnabledOverrides = updateMockScraperEnabled(
        args,
        state.scraperEnabledOverrides,
      );
      return result(
        undefined,
        { ...state, scraperEnabledOverrides },
        scraperEnabledOverrides !== state.scraperEnabledOverrides,
      );
    }
    case "get_scraper_runs":
      return result(getMockScraperRuns(args), state);
    case "get_latest_source_request":
      return result(getMockLatestSourceRequest(args, state.config), state);
    case "run_scraper_smoke_test":
      return result(
        getMockSmokeTestResultForArgs(args, state.scraperEnabledOverrides),
        state,
      );
    case "run_all_smoke_tests":
      return result(getAllMockSmokeTestResults(state.scraperEnabledOverrides), state);
    default:
      return { handled: false, value: undefined, state, shouldSave: false };
  }
}

function result(
  value: unknown,
  state: MockSourceHealthState,
  shouldSave = false,
): MockSourceHealthCommandResult {
  return { handled: true, value, state, shouldSave };
}
