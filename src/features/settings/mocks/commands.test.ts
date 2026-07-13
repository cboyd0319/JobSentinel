import { describe, expect, it } from "vitest";
import { mockConfig } from "../../../mocks/data";
import { getDefaultGhostConfig } from "../../../mocks/handlers/commandHelpers";
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

  it("rejects commands owned by another feature", () => {
    const state = createState();
    expect(handleMockSettingsCommand("complete_setup", undefined, state)).toMatchObject({
      handled: false,
      shouldSave: false,
      state,
    });
  });
});
