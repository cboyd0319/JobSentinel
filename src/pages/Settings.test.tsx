import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./Settings";
import { exportConfigToJSON, importConfigFromJSON } from "../utils/export";

const mockInvoke = vi.mocked(invoke);
const mockExportConfigToJSON = vi.mocked(exportConfigToJSON);
const mockImportConfigFromJSON = vi.mocked(importConfigFromJSON);

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

vi.mock("../utils/errorMessages", () => ({
  getUserFriendlyError: (err: unknown) => ({
    title: "Error",
    message: String(err),
  }),
}));

vi.mock("../utils/export", () => ({
  exportConfigToJSON: vi.fn(),
  importConfigFromJSON: vi.fn(),
}));

vi.mock("../components/ErrorLogPanel", () => ({
  ErrorLogPanel: () => <div data-testid="error-log-panel" />,
}));

// Minimal valid config that satisfies the Config interface
function makeConfig() {
  return {
    title_allowlist: [],
    title_blocklist: [],
    keywords_boost: ["rust"],
    keywords_exclude: [],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: false,
      allow_onsite: false,
      cities: [],
    },
    salary_floor_usd: 100000,
    company_whitelist: [],
    company_blacklist: [],
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
    jobswithgpt_endpoint: "",
    jobswithgpt_approval: {
      enabled: false,
      payload: null,
      approved_at: null,
    },
    use_resume_matching: false,
  };
}

// Default ghost config
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

// Wire up mockInvoke to handle the happy path
function setupHappyPath() {
  mockInvoke.mockImplementation(async (cmd: string) => {
    if (cmd === "get_config") return makeConfig();
    if (cmd === "get_credential_status") return [];
    if (cmd === "get_credential_unlock_status") {
      return { mode: "system", configured: false, unlocked: true };
    }
    if (cmd === "has_credential") return false;
    if (cmd === "get_ghost_config") return makeGhostConfig();
    if (cmd === "detect_location") return null;
    return null;
  });
}

describe("Settings — handleSave flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves settings tabs with arrow keys and keeps one tab stop", async () => {
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    const searchTab = screen.getByRole("tab", { name: "Search Preferences" });
    const sourcesTab = screen.getByRole("tab", { name: "Sources & Alerts" });

    expect(searchTab).toHaveAttribute("tabIndex", "0");
    expect(sourcesTab).toHaveAttribute("tabIndex", "-1");

    searchTab.focus();
    fireEvent.keyDown(searchTab, { key: "ArrowRight" });

    await waitFor(() => {
      expect(sourcesTab).toHaveAttribute("aria-selected", "true");
      expect(sourcesTab).toHaveFocus();
    });
    expect(searchTab).toHaveAttribute("tabIndex", "-1");
    expect(sourcesTab).toHaveAttribute("tabIndex", "0");

    fireEvent.keyDown(sourcesTab, { key: "Home" });

    await waitFor(() => {
      expect(searchTab).toHaveAttribute("aria-selected", "true");
      expect(searchTab).toHaveFocus();
    });
  });

  it("enables the saved-details passphrase lock from Settings", async () => {
    const user = userEvent.setup();
    let unlockStatus = { mode: "system", configured: false, unlocked: true };

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "get_credential_status") return [];
      if (cmd === "get_credential_unlock_status") return unlockStatus;
      if (cmd === "enable_credential_passphrase") {
        unlockStatus = { mode: "passphrase", configured: true, unlocked: true };
        return null;
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    expect(await screen.findByText("Saved Details Lock")).toBeInTheDocument();
    expect(screen.getByText("System lock is active")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New passphrase"), "correct battery staple");
    await user.type(screen.getByLabelText("Confirm passphrase"), "correct battery staple");
    await user.click(screen.getByRole("button", { name: "Use Passphrase Lock" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("enable_credential_passphrase", {
        passphrase: "correct battery staple",
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Passphrase lock enabled",
      "Saved details will need this passphrase after app start.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("has_credential", expect.anything());
  });

  it("unlocks saved details without checking credential existence", async () => {
    const user = userEvent.setup();
    let unlockStatus = { mode: "passphrase", configured: true, unlocked: false };

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "get_credential_status") return [];
      if (cmd === "get_credential_unlock_status") return unlockStatus;
      if (cmd === "unlock_credential_vault") {
        unlockStatus = { mode: "passphrase", configured: true, unlocked: true };
        return null;
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    expect(await screen.findByText("Passphrase lock is on")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Current passphrase"), "correct battery staple");
    await user.click(screen.getByRole("button", { name: "Unlock Saved Details" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("unlock_credential_vault", {
        passphrase: "correct battery staple",
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Saved details unlocked",
      "Saved details can be used during this app session.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("has_credential", expect.anything());
  });

  it("shows success toast and closes on successful save", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    setupHappyPath();
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") return null;
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Find and click save button
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Settings saved",
        "Your job-search preferences were saved.",
      );
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("saves JobsWithGPT only after exact payload approval", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const loadedConfig = {
      ...makeConfig(),
      title_allowlist: ["Case Manager"],
    };
    let savedConfig: ReturnType<typeof makeConfig> | null = null;

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return loadedConfig;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") {
        savedConfig = (args as { config: ReturnType<typeof makeConfig> }).config;
        return null;
      }
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.click(screen.getByText("More Job Boards"));
    await user.type(
      screen.getByLabelText("Optional job-source link"),
      "https://api.jobswithgpt.example/mcp",
    );

    expect(
      screen.getByPlaceholderText(
        "Leave blank unless you intentionally use an outside job feed",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Optional source address")).not.toBeInTheDocument();
    expect(
      screen.getByText("Review before JobSentinel contacts this source"),
    ).toBeInTheDocument();
    expect(screen.getByText("api.jobswithgpt.example")).toBeInTheDocument();
    expect(
      screen.queryByText("https://api.jobswithgpt.example/mcp"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show full link" }));

    expect(
      screen.getByText("https://api.jobswithgpt.example/mcp"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide full link" })).toBeInTheDocument();
    expect(screen.getByText("Case Manager")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Approve these exact details" }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/Approved for these exact details/i),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Settings saved",
        "Your job-search preferences were saved.",
      );
    });

    expect(savedConfig?.jobswithgpt_endpoint).toBe(
      "https://api.jobswithgpt.example/mcp",
    );
    expect(savedConfig?.jobswithgpt_approval.enabled).toBe(true);
    expect(savedConfig?.jobswithgpt_approval.payload).toEqual({
      endpoint: "https://api.jobswithgpt.example/mcp",
      titles: ["Case Manager"],
      location: null,
      remote_only: true,
      limit: 100,
    });
  });

  it("shows connected source contact history as minimized metadata", async () => {
    const user = userEvent.setup();
    const approvedPayload = {
      endpoint: "https://api.jobswithgpt.example/mcp",
      titles: ["Case Manager"],
      location: null,
      remote_only: true,
      limit: 100,
    };
    const loadedConfig = {
      ...makeConfig(),
      title_allowlist: ["Case Manager"],
      jobswithgpt_endpoint: approvedPayload.endpoint,
      jobswithgpt_approval: {
        enabled: true,
        payload: approvedPayload,
        approved_at: "2026-06-01T12:00:00Z",
      },
    };

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return loadedConfig;
      if (cmd === "get_latest_source_request") {
        return {
          id: 42,
          source: "jobswithgpt",
          sentAt: "2026-06-01T12:30:00Z",
          endpointHost: "api.jobswithgpt.example",
          titleCount: 1,
          hasLocation: false,
          remoteOnly: true,
          resultLimit: 100,
          outcome: "failure",
        };
      }
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.click(screen.getByText("More Job Boards"));

    const contactSummary = screen.getByText(/Last contacted:/i).closest("div");
    expect(contactSummary).not.toBeNull();
    expect(within(contactSummary!).getByText("Website contacted")).toBeInTheDocument();
    expect(within(contactSummary!).queryByText("Source host")).not.toBeInTheDocument();
    expect(within(contactSummary!).getByText("api.jobswithgpt.example")).toBeInTheDocument();
    expect(within(contactSummary!).getByText("Needs attention")).toBeInTheDocument();
    expect(within(contactSummary!).queryByText("Failed")).not.toBeInTheDocument();
    expect(within(contactSummary!).getByText("Remote only")).toBeInTheDocument();
    expect(within(contactSummary!).getByText("No")).toBeInTheDocument();
    expect(within(contactSummary!).getByText("Data not sent")).toBeInTheDocument();
    expect(
      within(contactSummary!).getByText(
        "Resume text, salary floor, private notes, application history, full source link",
      ),
    ).toBeInTheDocument();
  });

  it("shows error toast when save_config fails completely", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") throw new Error("Write failed");
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not save settings",
        expect.any(String),
      );
    });

    // Should NOT close on failure
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not write connection details when settings save fails", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "store_credential") return null;
      if (cmd === "save_config") throw new Error("Config write failed");
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.type(
      screen.getByPlaceholderText(
        "Paste Slack connection link, then turn Slack alerts on",
      ),
      "https://hooks.slack.com/services/T00/B00/secret-token",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not save settings",
        "Settings could not be saved. Try saving again.",
      );
    });

    expect(mockToast.warning).not.toHaveBeenCalledWith(
      "Some connection details were not saved",
      expect.any(String),
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "store_credential",
      expect.anything(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("requires turning Slack alerts on after pasting a connection link", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let savedConfig: ReturnType<typeof makeConfig> | null = null;

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "store_credential") return null;
      if (cmd === "save_config") {
        savedConfig = (args as { config: ReturnType<typeof makeConfig> }).config;
        return null;
      }
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    const slackToggle = screen.getByRole("checkbox", {
      name: "Enable Slack alerts",
    });

    await user.type(
      screen.getByPlaceholderText(
        "Paste Slack connection link, then turn Slack alerts on",
      ),
      "https://hooks.slack.com/services/T00/B00/secret-token",
    );

    expect(slackToggle).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savedConfig?.alerts.slack.enabled).toBe(false);
    });

    await user.click(slackToggle);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savedConfig?.alerts.slack.enabled).toBe(true);
    });
  });

  it("stores a typed credential once and clears it after save", async () => {
    const user = userEvent.setup();
    const slackWebhook = "https://hooks.slack.com/services/T00/B00/secret-token";

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "store_credential") return null;
      if (cmd === "save_config") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.type(
      screen.getByPlaceholderText(
        "Paste Slack connection link, then turn Slack alerts on",
      ),
      slackWebhook,
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("store_credential", {
        key: "slack_webhook",
        value: slackWebhook,
      });
    });

    expect(screen.queryByDisplayValue(slackWebhook)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        mockInvoke.mock.calls.filter(([cmd]) => cmd === "save_config"),
      ).toHaveLength(2);
    });
    expect(
      mockInvoke.mock.calls.filter(([cmd]) => cmd === "store_credential"),
    ).toHaveLength(1);
  });

  it("shows clear feedback when a settings backup cannot be read", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    mockImportConfigFromJSON.mockResolvedValueOnce({ status: "invalid" });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Restore Settings" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not read settings backup",
      "Choose another JobSentinel settings backup file.",
    );
    expect(mockToast.success).not.toHaveBeenCalledWith(
      "Settings restored",
      expect.any(String),
    );
  });

  it("uses plain backup wording for settings export and restore", async () => {
    const user = userEvent.setup();
    const restoredConfig = {
      ...makeConfig(),
      salary_floor_usd: 85000,
    };

    setupHappyPath();
    mockImportConfigFromJSON.mockResolvedValueOnce({
      status: "ok",
      config: restoredConfig,
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Backup Settings" }));

    expect(mockExportConfigToJSON).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Settings backups are private files/i)).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith(
      "Private settings backup saved",
      "Saved passwords and connection codes are left out. This backup can still include search, pay, location, company, and alert settings.",
    );

    await user.click(screen.getByRole("button", { name: "Restore Settings" }));

    expect(mockToast.success).toHaveBeenCalledWith(
      "Settings restored",
      "Review settings and use Save. Saved connection details are not included in backups, so add them again if needed.",
    );
    expect(screen.queryByText(/Config imported/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Credentials must/i)).not.toBeInTheDocument();
  });

  it("rejects JSON that is not a JobSentinel settings backup", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    mockImportConfigFromJSON.mockResolvedValueOnce({
      status: "ok",
      config: { setting: "value" },
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Restore Settings" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "That is not a JobSentinel settings backup",
      "Choose a settings backup created from JobSentinel Settings.",
    );
    expect(mockToast.success).not.toHaveBeenCalledWith(
      "Settings restored",
      expect.any(String),
    );
  });

  it("does not turn on chat alerts before connection details exist", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    const discordToggle = screen.getByRole("checkbox", {
      name: "Enable Discord alerts",
    });

    await user.click(discordToggle);

    expect(discordToggle).not.toBeChecked();
    expect(mockToast.info).toHaveBeenCalledWith(
      "Paste Discord connection link first",
      "Then turn Discord alerts on.",
    );
  });

  it("does not test an expected Slack webhook until saved details are confirmed or re-entered", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.alerts.slack.enabled = true;

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    expect(
      screen.getByText("Saved details need confirmation"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send test Slack message" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Finish Slack alerts",
      "Paste the Slack connection link again, or turn Slack alerts off.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("validate_slack_webhook", expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith("has_credential", expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "retrieve_credential",
      expect.anything(),
    );
  });

  it("does not test an expected email app password until saved details are confirmed or re-entered", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.alerts.email = {
      ...config.alerts.email,
      enabled: true,
      smtp_server: "smtp.example.com",
      smtp_port: 587,
      smtp_username: "user@example.com",
      from_email: "from@example.com",
      to_emails: ["to@example.com"],
      use_starttls: true,
    };

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    expect(
      screen.getByText("Saved details need confirmation"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send test email" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Finish email alerts",
      "Add the email app password, or turn email alerts off.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("test_email_notification", expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith("has_credential", expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "retrieve_credential",
      expect.anything(),
    );
  });

  it("uses plain notification connection wording instead of service-internal jargon", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.alerts.discord.enabled = true;
    config.alerts.teams.enabled = true;
    config.alerts.telegram.enabled = true;

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "get_credential_status") return [];
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getByPlaceholderText(/Slack connection link/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Discord connection link/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Teams connection link/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Telegram setup code/i)).toBeInTheDocument();
    expect(screen.getByText("Telegram destination")).toBeInTheDocument();
    expect(screen.getByText(/Optional Telegram alert setup/i)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(
      /Incoming Webhooks|incoming webhook connector|Webhooks → New Webhook|Incoming Webhook → Configure|Telegram Connection Token|Telegram Chat ID|passwords, tokens|Message @BotFather to create a private alert bot|already use Telegram for automatic alerts|Telegram chat number|@BotFather|@userinfobot|\/newbot/i,
    );
  });

  it("keeps Telegram bot details behind the optional chat-alert path", async () => {
    const user = userEvent.setup();
    const config = makeConfig();

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "get_credential_status") return [];
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getAllByText(/Optional chat alert/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Use desktop or email alerts unless Telegram is already part of your alert routine/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Paste Telegram setup code")).not.toBeInTheDocument();
    expect(screen.queryByText("Telegram destination")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Enable Telegram alerts" }));

    expect(screen.getByPlaceholderText("Paste Telegram setup code")).toBeInTheDocument();
    expect(screen.getByText("Telegram destination")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Finish Telegram alerts",
      "Add the Telegram details shown below, or turn Telegram alerts off.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("save_config", expect.anything());
  });

  it("does not save restored secret-backed settings without confirmed saved details", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const config = makeConfig();
    config.alerts.telegram = {
      enabled: true,
      chat_id: "saved-destination",
    };
    config.usajobs = {
      ...config.usajobs,
      enabled: true,
      email: "user@example.com",
    };
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Finish Telegram alerts",
      "Add the Telegram details shown below, or turn Telegram alerts off.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("save_config", expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "store_credential",
      expect.anything(),
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("has_credential", expect.anything());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("presents desktop and email alerts before optional chat alerts", async () => {
    const user = userEvent.setup();
    const config = makeConfig();

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(
      screen.getByText(/Start with desktop alerts/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Enable desktop alerts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Email and chat alerts are sent through the service you choose/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Resume text, private notes, application history, and local match reasons stay in JobSentinel/i),
    ).toBeInTheDocument();

    const notificationText = document.body.textContent ?? "";
    const desktopIndex = notificationText.indexOf("Desktop Notifications");
    const emailIndex = notificationText.indexOf("Email Alerts");
    const chatIndex = notificationText.indexOf("Optional chat alerts");
    const slackIndex = notificationText.indexOf("Slack Notifications");

    expect(desktopIndex).toBeGreaterThanOrEqual(0);
    expect(emailIndex).toBeGreaterThanOrEqual(0);
    expect(chatIndex).toBeGreaterThanOrEqual(0);
    expect(slackIndex).toBeGreaterThanOrEqual(0);
    expect(desktopIndex).toBeLessThan(emailIndex);
    expect(emailIndex).toBeLessThan(chatIndex);
    expect(chatIndex).toBeLessThan(slackIndex);
  });

  it("labels the resume sorting toggle for assistive tech", async () => {
    const user = userEvent.setup();
    setupHappyPath();

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(
      screen.getByRole("checkbox", { name: "Use Resume to Sort Jobs" }),
    ).toBeInTheDocument();
  });

  it("keeps missing desktop sound settings quiet in Settings", async () => {
    const user = userEvent.setup();
    const legacyConfig = makeConfig();
    legacyConfig.alerts.desktop.enabled = true;
    const legacyDesktop = legacyConfig.alerts.desktop as Partial<
      typeof legacyConfig.alerts.desktop
    >;
    delete legacyDesktop.play_sound;
    let savedConfig: ReturnType<typeof makeConfig> | null = null;

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return legacyConfig;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "save_config") {
        savedConfig = (args as { config: ReturnType<typeof makeConfig> }).config;
        return null;
      }
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getByRole("checkbox", { name: "Play sound" })).not.toBeChecked();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Show even when JobSentinel is open on screen",
      }),
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savedConfig?.alerts.desktop.play_sound).toBe(false);
    });
  });

});
