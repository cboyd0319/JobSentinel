import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { ToastProvider } from "../../app/providers/ToastProvider";
import Settings from "./SettingsPage";
import {
  makeConfig as makeBaseConfig,
  makeGhostConfig,
} from "./SettingsPage.testFixtures";

const mockInvoke = vi.mocked(invoke);

vi.mock("../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("../../shared/errorReporting/messages", () => ({
  getUserFriendlyError: (err: unknown) => ({
    title: "Error",
    message: String(err),
  }),
}));

vi.mock("./support/ErrorLogPanel", () => ({
  ErrorLogPanel: () => <div data-testid="error-log-panel" />,
}));

function makeConfig() {
  const config = makeBaseConfig();
  config.keywords_boost = ["operations"];
  config.location_preferences.allow_hybrid = true;
  config.salary_floor_usd = 80000;
  return config;
}

function setupSettingsInvoke(
  config: Partial<ReturnType<typeof makeConfig>>,
  detectedLocation: unknown = null,
) {
  mockInvoke.mockImplementation(async (command: string) => {
    if (command === "get_config") return config;
    if (command === "get_latest_source_request") return null;
    if (command === "get_ghost_config") return makeGhostConfig();
    if (command === "detect_location") return detectedLocation;
    if (command === "get_system_info") {
      return {
        app_version: "test",
        platform: "test",
        os_version: "test",
        architecture: "test",
      };
    }
    if (command === "get_config_summary") {
      return {
        scrapers_enabled: 0,
        keywords_count: 0,
        has_location_prefs: false,
        has_salary_prefs: false,
        notifications_configured: 0,
        has_resume: false,
      };
    }
    if (command === "get_debug_log_events") return [];
    return null;
  });
}

describe("Settings toast-triggered form state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear?.();
  });

  it("keeps unsaved detected location after success toast renders", async () => {
    const user = userEvent.setup();

    setupSettingsInvoke(makeConfig(), {
      city: "Denver",
      region: "CO",
      country: "US",
      timezone: "America/Denver",
    });

    render(
      <ToastProvider>
        <Settings onClose={vi.fn()} />
      </ToastProvider>,
    );

    await screen.findByRole("tab", { name: "Search Preferences" });

    await user.click(screen.getByRole("button", { name: "Detect location" }));
    await screen.findByText("Denver, CO");

    await user.click(screen.getByRole("button", { name: /^Use This$/ }));

    expect(
      await screen.findByRole("button", { name: "Remove Denver, CO" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Location added")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        mockInvoke.mock.calls.filter(([cmd]) => cmd === "get_config"),
      ).toHaveLength(1);
    });
  });

  it("adds company preferences when a saved config has no company arrays", async () => {
    const user = userEvent.setup();
    const legacyConfig = makeConfig() as Partial<ReturnType<typeof makeConfig>>;
    delete legacyConfig.preferred_companies;
    delete legacyConfig.blocked_companies;

    setupSettingsInvoke(legacyConfig);

    render(
      <ToastProvider>
        <Settings onClose={vi.fn()} />
      </ToastProvider>,
    );

    await screen.findByRole("tab", { name: "Search Preferences" });
    const companySection = screen
      .getByRole("heading", { name: /^Company Preferences/ })
      .closest("section");
    expect(companySection).not.toBeNull();
    const addCompanyButtons = within(companySection!).getAllByRole("button", {
      name: "Add",
    });

    await user.type(
      screen.getByPlaceholderText("Add a company you'd love to work for..."),
      "Verification Preferred Co",
    );
    await user.click(addCompanyButtons[0]!);

    expect(
      await screen.findByRole("button", {
        name: "Remove Verification Preferred Co",
      }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Add a company you don't want to see..."),
      "Verification Avoid Co",
    );
    await user.click(addCompanyButtons[1]!);

    expect(
      await screen.findByRole("button", {
        name: "Remove Verification Avoid Co",
      }),
    ).toBeInTheDocument();
  });

  it("shows desktop alert options when saved config has no desktop alert object", async () => {
    const user = userEvent.setup();
    const legacyConfig = makeConfig() as Partial<ReturnType<typeof makeConfig>>;
    delete (legacyConfig.alerts as Partial<typeof legacyConfig.alerts>).desktop;

    setupSettingsInvoke(legacyConfig);

    render(
      <ToastProvider>
        <Settings onClose={vi.fn()} />
      </ToastProvider>,
    );

    await screen.findByRole("tab", { name: "Search Preferences" });
    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(
      screen.getByRole("checkbox", { name: "Enable desktop alerts" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Play sound" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "Show even when JobSentinel is open on screen",
      }),
    ).not.toBeChecked();
  });
});
