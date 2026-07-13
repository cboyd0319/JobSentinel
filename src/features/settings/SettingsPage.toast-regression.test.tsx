import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { ToastProvider } from "../../contexts";
import Settings from "./SettingsPage";
import { DEFAULT_EXTERNAL_AI_CONFIG } from "./config/SettingsConfig";

const mockInvoke = vi.mocked(invoke);

vi.mock("../../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

vi.mock("../../utils/errorMessages", () => ({
  getUserFriendlyError: (err: unknown) => ({
    title: "Error",
    message: String(err),
  }),
}));

vi.mock("../../components/ErrorLogPanel", () => ({
  ErrorLogPanel: () => <div data-testid="error-log-panel" />,
}));

function makeConfig() {
  return {
    title_allowlist: [],
    title_blocklist: [],
    keywords_boost: ["operations"],
    keywords_exclude: [],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: true,
      allow_onsite: false,
      cities: [],
    },
    salary_floor_usd: 80000,
    preferred_companies: [],
    blocked_companies: [],
    auto_refresh: { enabled: false, interval_minutes: 30 },
    alerts: {
      slack: { enabled: false },
      email: {
        enabled: false,
        smtp_server: "",
        smtp_port: 587,
        smtp_username: "",
        from_email: "",
        to_emails: [],
        use_starttls: true,
      },
      discord: { enabled: false },
      telegram: { enabled: false },
      teams: { enabled: false },
      desktop: {
        enabled: false,
        show_when_focused: false,
        play_sound: false,
      },
    },
    linkedin: {
      enabled: false,
      query: "",
      location: "",
      remote_only: false,
      limit: 25,
    },
    remoteok: { enabled: false, tags: [], limit: 25 },
    weworkremotely: { enabled: false, limit: 25 },
    builtin: { enabled: false, cities: [], limit: 25 },
    hn_hiring: { enabled: false, remote_only: false, limit: 25 },
    dice: { enabled: false, query: "", limit: 25 },
    yc_startup: { enabled: false, remote_only: false, limit: 25 },
    usajobs: {
      enabled: false,
      email: "",
      remote_only: false,
      date_posted_days: 7,
      limit: 25,
    },
    simplyhired: { enabled: false, query: "", limit: 25 },
    glassdoor: { enabled: false, query: "", limit: 25 },
    restricted_source_acknowledgements: {
      builtin: false,
      dice: false,
      simplyhired: false,
      glassdoor: false,
    },
    jobswithgpt_endpoint: "",
    jobswithgpt_approval: {
      enabled: false,
      payload: null,
      approved_at: null,
    },
    external_ai: DEFAULT_EXTERNAL_AI_CONFIG,
    use_resume_matching: false,
  };
}

function makeGhostConfig() {
  return {
    stale_threshold_days: 60,
    repost_threshold: 3,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.3,
    hide_threshold: 0.7,
  };
}

describe("Settings toast-triggered form state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear?.();
  });

  it("keeps unsaved detected location after success toast renders", async () => {
    const user = userEvent.setup();

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "get_latest_source_request") return null;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") {
        return {
          city: "Denver",
          region: "CO",
          country: "US",
          timezone: "America/Denver",
        };
      }
      if (cmd === "get_system_info") {
        return {
          app_version: "test",
          platform: "test",
          os_version: "test",
          architecture: "test",
        };
      }
      if (cmd === "get_config_summary") {
        return {
          scrapers_enabled: 0,
          keywords_count: 0,
          has_location_prefs: false,
          has_salary_prefs: false,
          notifications_configured: 0,
          has_resume: false,
        };
      }
      if (cmd === "get_debug_log_events") return [];
      return null;
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

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return legacyConfig;
      if (cmd === "get_latest_source_request") return null;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "get_system_info") {
        return {
          app_version: "test",
          platform: "test",
          os_version: "test",
          architecture: "test",
        };
      }
      if (cmd === "get_config_summary") {
        return {
          scrapers_enabled: 0,
          keywords_count: 0,
          has_location_prefs: false,
          has_salary_prefs: false,
          notifications_configured: 0,
          has_resume: false,
        };
      }
      if (cmd === "get_debug_log_events") return [];
      return null;
    });

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

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return legacyConfig;
      if (cmd === "get_latest_source_request") return null;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "get_system_info") {
        return {
          app_version: "test",
          platform: "test",
          os_version: "test",
          architecture: "test",
        };
      }
      if (cmd === "get_config_summary") {
        return {
          scrapers_enabled: 0,
          keywords_count: 0,
          has_location_prefs: false,
          has_salary_prefs: false,
          notifications_configured: 0,
          has_resume: false,
        };
      }
      if (cmd === "get_debug_log_events") return [];
      return null;
    });

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
