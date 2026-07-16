import { describe, expect, it } from "vitest";
import { mockConfig } from "../../../../test-support/mocks/data";
import { handleMockSupportCommand } from "./commands";

describe("Settings support mock commands", () => {
  it("returns minimized system information", () => {
    const result = handleMockSupportCommand(
      "get_system_info",
      undefined,
      mockConfig,
      false,
    );

    expect(result).toEqual({
      handled: true,
      value: {
        app_version: "dev",
        platform: "mock",
        os_version: "browser",
        architecture: "wasm",
      },
    });
  });

  it("rejects commands owned by another Settings subdomain", () => {
    expect(
      handleMockSupportCommand("get_config", undefined, mockConfig, false),
    ).toEqual({ handled: false, value: undefined });
  });
});
