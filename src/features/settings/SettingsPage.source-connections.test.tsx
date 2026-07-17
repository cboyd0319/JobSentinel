import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeConfig,
  makeGhostConfig,
  mockInvoke,
  mockToast,
} from "./SettingsPage.testSupport";
import Settings from "./SettingsPage";

describe("Settings source connection saves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks USAJobs save before keychain writes when required details are missing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const config = makeConfig();

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") return null;
      if (cmd === "store_credential") return null;
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: /Turn USAJobs scheduled job checks on or off/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Finish USAJobs scheduled checks",
      "Add the USAJobs email and access code shown below, or turn USAJobs scheduled checks off.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "save_config",
      expect.anything(),
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "store_credential",
      expect.objectContaining({ key: "usajobs_api_key" }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("fills query-backed source defaults before saving scheduled checks", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const config = makeConfig();
    config.title_allowlist = ["Data Analyst"];
    config.keywords_boost = ["SQL"];
    config.location_preferences.cities = ["Denver"];
    let savedConfig: ReturnType<typeof makeConfig> | null = null;

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") {
        savedConfig = (args as { config: ReturnType<typeof makeConfig> })
          .config;
        return null;
      }
      if (cmd === "store_credential") return null;
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.click(screen.getByText("More Job Boards"));
    await user.click(
      screen.getByRole("checkbox", {
        name: /Turn Dice scheduled job checks on or off/i,
      }),
    );
    await user.click(
      screen.getByLabelText(
        /I understand and accept this risk\. Run Dice scheduled checks from this computer/i,
      ),
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savedConfig?.dice.enabled).toBe(true);
    });
    expect(savedConfig?.restricted_source_acknowledgements.dice).toBe(true);
    expect(savedConfig?.dice.query).toBe("Data Analyst SQL");
    expect(savedConfig?.dice.location).toBe("Denver");
    expect(onClose).toHaveBeenCalled();
  });

  it("blocks saving an invalid Discord connection link", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const config = makeConfig();
    config.alerts.discord.enabled = true;

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") return null;
      if (cmd === "store_credential") return null;
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.type(
      screen.getByPlaceholderText(/Discord connection link/i),
      "https://evil.com/api/webhooks/123/abc",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Check Discord connection link",
      "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "save_config",
      expect.anything(),
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "store_credential",
      expect.objectContaining({ key: "discord_webhook" }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("blocks saving an invalid Teams connection link", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const config = makeConfig();
    config.alerts.teams.enabled = true;

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") return null;
      if (cmd === "store_credential") return null;
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.type(
      screen.getByPlaceholderText(/Teams connection link/i),
      "https://evil.com/webhook/abc",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Check Teams connection link",
      "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "save_config",
      expect.anything(),
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "store_credential",
      expect.objectContaining({ key: "teams_webhook" }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
