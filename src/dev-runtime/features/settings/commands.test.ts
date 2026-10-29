/** Verifies browser-development settings command projections and persistence. */

import { describe, expect, it } from "vitest";
import { mockConfig } from "../../mocks/data";
import { getDefaultGhostConfig } from "../../mocks/handlers/commandHelpers";
import { handleMockSettingsCommand } from "./commands";

function createState() {
  return {
    config: { ...mockConfig },
    credentials: {},
    credentialUnlock: { mode: "system" as const, configured: false, unlocked: true },
    ghostConfig: getDefaultGhostConfig(),
    bookmarkletConfig: { port: 4321, enabled: false },
    pendingBookmarkletImports: [],
  };
}

describe("Settings mock commands", () => {
  it("does not count a legacy JobsWithGPT approval as an enabled source", () => {
    const state = createState();
    const endpoint = "https://api.jobswithgpt.example/mcp";
    state.config = {
      ...state.config,
      title_allowlist: ["Case Manager"],
      jobswithgpt_endpoint: endpoint,
      jobswithgpt_approval: {
        enabled: true,
        approved_at: "2026-07-19T00:00:00Z",
        payload: {
          endpoint,
          titles: ["Case Manager"],
          location: null,
          remote_only: false,
          limit: 100,
        },
      },
    };

    expect(
      handleMockSettingsCommand("get_dashboard_preferences", undefined, state).value,
    ).toMatchObject({ anyJobSourceEnabled: false });
  });

  it("starts Browser Import with the requested available port", () => {
    const result = handleMockSettingsCommand(
      "start_bookmarklet_server",
      { port: 4321 },
      createState(),
    );

    expect(result).toMatchObject({
      handled: true,
      shouldSave: true,
      value: { port: 4321, enabled: true },
      state: { bookmarkletConfig: { port: 4321, enabled: true } },
    });
  });

  it("persists and clears a canonical country preference while rejecting malformed values", () => {
    const initial = createState();
    const selected = handleMockSettingsCommand("save_config", {
      config: {
        ...initial.config,
        location_preferences: {
          ...initial.config.location_preferences,
          search_country: "GB",
        },
      },
    }, initial);

    expect(selected.state.config.location_preferences.search_country).toBe("GB");

    const cleared = handleMockSettingsCommand("save_config", {
      config: {
        ...selected.state.config,
        location_preferences: {
          ...selected.state.config.location_preferences,
          search_country: null,
        },
      },
    }, selected.state);
    expect(cleared.state.config.location_preferences.search_country).toBeNull();

    expect(() => handleMockSettingsCommand("save_config", {
      config: {
        ...initial.config,
        location_preferences: {
          ...initial.config.location_preferences,
          search_country: "gb",
        },
      },
    }, initial)).toThrow("recognized uppercase country code");
  });

  it("projects no country for default and legacy configurations", () => {
    const state = createState();
    expect(handleMockSettingsCommand("get_dashboard_preferences", undefined, state).value)
      .toMatchObject({ searchCountry: null });

    const legacyState = {
      ...state,
      config: {
        ...state.config,
        location_preferences: {
          ...state.config.location_preferences,
          search_country: undefined,
        },
      },
    };
    expect(handleMockSettingsCommand("get_dashboard_preferences", undefined, legacyState).value)
      .toMatchObject({ searchCountry: null });
  });

  it("rejects commands owned by another feature", () => {
    const state = createState();
    expect(handleMockSettingsCommand("complete_setup", undefined, state)).toMatchObject({
      handled: false,
      shouldSave: false,
      state,
    });
  });
});
