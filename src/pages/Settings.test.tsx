import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./Settings";
import * as feedbackService from "../services/feedbackService";
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
    if (cmd === "has_credential") return false;
    if (cmd === "get_ghost_config") return makeGhostConfig();
    if (cmd === "detect_location") return null;
    return null;
  });
}

describe("Settings — loadConfig flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // sessionStorage mock for location cache
    window.sessionStorage.clear?.();
  });

  it("shows loading spinner initially, then settings form on success", async () => {
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    // Should show loading state
    expect(screen.getByLabelText("Loading settings")).toBeInTheDocument();

    // Wait for config to load — settings title should appear
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Loading spinner should be gone
    expect(screen.queryByLabelText("Loading settings")).not.toBeInTheDocument();
  });

  it("does not detect location when settings opens", async () => {
    const user = userEvent.setup();
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(
      mockInvoke.mock.calls.some(([cmd]) => cmd === "detect_location"),
    ).toBe(false);

    await user.click(screen.getByRole("checkbox", { name: /hybrid/i }));

    expect(
      screen.getByText(/asks an outside location lookup service/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing is saved unless you add the city/i),
    ).toBeInTheDocument();
    expect(
      mockInvoke.mock.calls.some(([cmd]) => cmd === "detect_location"),
    ).toBe(false);
  });

  it("keeps safe support report actions obvious and privacy-first", async () => {
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Help and Support" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /safe support reports hide common private details before copy or save/i,
      ),
    ).toBeInTheDocument();

    const copyButton = screen.getByRole("button", {
      name: "Copy Safe Support Report",
    });
    expect(copyButton).toHaveAttribute(
      "title",
      "Copy a safe support report you can share only if you want help",
    );

    const saveButton = screen.getByRole("button", {
      name: "Save Safe Support Report",
    });
    expect(saveButton).toHaveAttribute(
      "title",
      "Save a safe support report you can share only if you want help",
    );

    const visibleText = document.body.textContent ?? "";
    expect(visibleText).not.toMatch(/debug report/i);
    expect(visibleText).not.toMatch(/detailed report/i);
  });

  it("copies a sanitized support report from settings with one click", async () => {
    const user = userEvent.setup();
    const copySpy = vi
      .spyOn(feedbackService, "copySanitizedDebugReport")
      .mockResolvedValueOnce({
        content: "safe support report",
        copied: true,
        errorCount: 0,
      });
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Copy Safe Support Report" }));

    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Safe support report copied",
      "Share it only if you want help. JobSentinel hides common private details; review it before sharing."
    );
  });

  it("saves a sanitized support report from settings with one click", async () => {
    const user = userEvent.setup();
    const saveSpy = vi
      .spyOn(feedbackService, "saveSanitizedDebugReport")
      .mockResolvedValueOnce({
        fileName: "jobsentinel-support-report.txt",
        revealToken: "feedback-token",
      });
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Save Safe Support Report" }));

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Support report saved for review",
      "Review jobsentinel-support-report.txt before sharing it. Share it only if you want help."
    );
  });

  it("shows error state with Try Again button when get_config throws", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") throw new Error("DB locked");
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return false;
    });

    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText(/settings could not load/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/safe support report from Help before closing/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Restart JobSentinel/i)).not.toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("Try Again button re-attempts loadConfig successfully", async () => {
    const user = userEvent.setup();
    let callCount = 0;

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") {
        callCount++;
        if (callCount === 1) throw new Error("DB locked");
        return makeConfig();
      }
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    // Click retry — should succeed this time
    await user.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(
        screen.queryByText(/settings could not load/i),
      ).not.toBeInTheDocument();
    });
  });

  it("renders settings form even when some credential checks fail (allSettled)", async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        const { key } = args as { key: string };
        // Simulate keyring failure for slack and discord
        if (key === "slack_webhook" || key === "discord_webhook") {
          throw new Error("Keyring locked");
        }
        return false;
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    // Should still render settings (not error state!)
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Should warn about credential failures
    expect(mockToast.warning).toHaveBeenCalledWith(
      "Some saved connection details unavailable",
      expect.stringContaining("2"),
    );

    // Should NOT show error state
    expect(
      screen.queryByText(/settings could not load/i),
    ).not.toBeInTheDocument();
  });

  it("renders settings form when ALL credential checks fail (allSettled)", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") throw new Error("Keyring unavailable");
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    // Should still render settings — credential checks failing should NOT block the page
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Should warn about all active credential failures
    expect(mockToast.warning).toHaveBeenCalledWith(
      "Some saved connection details unavailable",
      expect.stringContaining("6"),
    );
  });

  it("loads ghost config defaults with warning when get_ghost_config fails", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") throw new Error("Ghost config missing");
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(mockToast.warning).toHaveBeenCalledWith(
      "Posting risk defaults loaded",
      expect.stringContaining("defaults"),
    );
  });

  it("keeps LinkedIn as a user-opened search link instead of a connected source", async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        const { key } = args as { key: string };
        return key === "slack_webhook";
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getByText("Search links only")).toBeInTheDocument();
    expect(
      screen.getByText(/JobSentinel does not log in to LinkedIn/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/public company application pages such as Greenhouse/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/public ATS sources/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect linkedin/i })).not.toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalledWith("get_linkedin_expiry_status");
    expect(mockInvoke).not.toHaveBeenCalledWith("linkedin_login");
  });

  it("uses plain help and status copy in source settings", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(
      screen.getByRole("heading", { name: /help and status/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /check job-source status or save a safe support report/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Troubleshooting")).not.toBeInTheDocument();
  });

  it("uses plain posting-risk copy for freshness settings", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getByText("Posting Risk and Freshness")).toBeInTheDocument();
    expect(screen.getByText("Freshness behavior:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Widest search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Balanced" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fresh and verified first" })).toBeInTheDocument();
    expect(
      screen.getByText(/keeps jobs visible while warning sooner/i),
    ).toBeInTheDocument();

    expect(screen.queryByText("Ghost Detection Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Detection Level:")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lenient" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Strict" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(screen.getByText("Warn when a posting is older than")).toBeInTheDocument();
    expect(screen.getByText("Warn after a posting appears this many times")).toBeInTheDocument();
    expect(screen.getByText(/Show posting-risk warning:/)).toBeInTheDocument();
    expect(screen.getByText(/Hide postings that need review:/)).toBeInTheDocument();
    expect(screen.queryByText("Stale Threshold (days)")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale-posting warning after (days)")).not.toBeInTheDocument();
    expect(screen.queryByText("Repeated-posting warning count")).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide risky postings:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Early warning point:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide-by-default point:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Warning Threshold:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide Threshold:/)).not.toBeInTheDocument();
    expect(screen.queryByText("0.30")).not.toBeInTheDocument();
    expect(screen.queryByText("0.70")).not.toBeInTheDocument();
  });

  it("exposes email alert toggle with an accessible name", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    const emailToggle = screen.getByRole("checkbox", {
      name: "Enable email alerts",
    });
    await user.click(emailToggle);

    expect(emailToggle).toBeChecked();
    expect(screen.getByText("Optional setup:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Leave these alone unless your email service gave you these details.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gmail" }));

    expect(
      screen.getByText(/Use an app password from Google Account Security/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Only if your email service gave you these details"),
    ).toBeInTheDocument();
    expect(screen.getByText("Email sending service")).toBeInTheDocument();
    expect(screen.getByText("Number from email service")).toBeInTheDocument();
    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.queryByText(/regular password/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Email Server")).not.toBeInTheDocument();
    expect(screen.queryByText("Email provider details")).not.toBeInTheDocument();
    expect(screen.queryByText(/email provider/i)).not.toBeInTheDocument();
  });

  it("uses plain search-word copy for matching settings", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(screen.getByText("Search Words to Avoid")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a word or phrase to avoid...")).toBeInTheDocument();
    expect(screen.getByText("No search words to avoid")).toBeInTheDocument();
    expect(screen.queryByText("Keywords to Avoid")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getByText(/resume skills first, then your search words/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByText("Tip:")
        .some((node) => /Add your resume in the Resume tab first/i.test(node.closest("p")?.textContent ?? "")),
    ).toBe(true);
    expect(screen.getByText("Job title and search-word fit")).toBeInTheDocument();
    expect(screen.queryByText(/keyword-only scoring/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resume match \+ 30% search words/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload your resume/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/uploaded, scoring uses/i)).not.toBeInTheDocument();
  });

  it("uses protective auto-search helper copy", async () => {
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText(/Turn this on to check for new postings while JobSentinel is open/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/never miss a new posting/i)).not.toBeInTheDocument();
  });

  it("does not check LinkedIn credentials when loading settings", async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        const { key } = args as { key: string };
        expect(key).not.toBe("linkedin_cookie");
        return false;
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(mockInvoke).not.toHaveBeenCalledWith("get_linkedin_expiry_status");
  });
});

describe("Settings — handleSave flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        "Settings saved!",
        expect.any(String),
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
        "Settings saved!",
        expect.any(String),
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

  it("reports settings save failure separately from saved connection details", async () => {
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
      expect.stringContaining("Config was saved"),
    );
    expect(mockInvoke).toHaveBeenCalledWith("store_credential", {
      key: "slack_webhook",
      value: "https://hooks.slack.com/services/T00/B00/secret-token",
    });
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

  it("tests an existing Slack webhook without retrieving it into the renderer", async () => {
    const user = userEvent.setup();

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        return (args as { key: string }).key === "slack_webhook";
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "validate_slack_webhook") return true;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.click(screen.getByRole("button", { name: "Test" }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Test sent!",
        "Check your Slack channel",
      );
    });

    expect(mockInvoke).toHaveBeenCalledWith("validate_slack_webhook", {
      webhookUrl: "",
    });
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "retrieve_credential",
      expect.anything(),
    );
  });

  it("tests an existing email app password without retrieving it into the renderer", async () => {
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

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") {
        return (args as { key: string }).key === "smtp_password";
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "test_email_notification") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));
    await user.click(screen.getByRole("button", { name: "Test" }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Test sent!",
        "Check your email inbox",
      );
    });

    expect(mockInvoke).toHaveBeenCalledWith("test_email_notification", {
      emailConfig: expect.objectContaining({
        smtp_password: "",
      }),
    });
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
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    const { container } = render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(
      screen.getByPlaceholderText(
        "Paste Slack connection link, then turn Slack alerts on",
      ),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste Discord connection link")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste Teams connection link")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste Telegram setup code")).toBeInTheDocument();
    expect(screen.getByText("Telegram destination")).toBeInTheDocument();
    expect(screen.getByText(/Optional Telegram alert setup/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(
      /Incoming Webhooks|incoming webhook connector|Webhooks → New Webhook|Incoming Webhook → Configure|Telegram Connection Token|Telegram Chat ID|passwords, tokens|Message @BotFather to create a private alert bot|already use Telegram for automatic alerts|Telegram chat number|@BotFather|@userinfobot|\/newbot/i,
    );
  });

  it("keeps Telegram bot details behind the optional chat-alert path", async () => {
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

    const { container } = render(<Settings onClose={vi.fn()} />);

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

    const notificationText = container.textContent ?? "";
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

  it("does not recommend tech-heavy sources for broad remote searches", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.title_allowlist = ["Office Manager"];
    config.keywords_boost = ["Scheduling"];
    config.location_preferences.allow_remote = true;
    config.location_preferences.cities = ["Austin"];

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

    expect(screen.queryByText("Optional sources to review")).not.toBeInTheDocument();
  });

  it("does not recommend tech-heavy sources for broad searches with common tool keywords", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.title_allowlist = ["Accountant"];
    config.keywords_boost = ["SQL", "Excel"];
    config.location_preferences.allow_remote = true;
    config.location_preferences.cities = ["Austin"];

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

    expect(screen.queryByText("Optional sources to review")).not.toBeInTheDocument();
  });

  it("recommends tech-heavy sources for technical searches", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.title_allowlist = ["Software Engineer"];
    config.keywords_boost = ["React"];
    config.location_preferences.allow_remote = true;
    config.location_preferences.cities = ["Austin"];

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

    const sourceReview = screen.getByText("Optional sources to review");
    const panel = sourceReview.parentElement?.parentElement;
    expect(panel).toBeInstanceOf(HTMLElement);
    const panelQueries = within(panel as HTMLElement);

    expect(panelQueries.getByText("RemoteOK")).toBeInTheDocument();
    expect(panelQueries.getByText("WeWorkRemotely")).toBeInTheDocument();
    expect(panelQueries.getByText("Startup and tech job posts")).toBeInTheDocument();
    expect(panelQueries.queryByText("Hacker News Who's Hiring")).not.toBeInTheDocument();
    expect(panelQueries.getByText(/remote tech roles/i)).toBeInTheDocument();
    expect(panelQueries.getAllByRole("button", { name: "Review source" }).length).toBeGreaterThan(0);
  });

  it("uses plain source-check guidance without site-protection jargon", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.simplyhired.enabled = true;
    config.glassdoor.enabled = true;

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
      screen.getAllByText(/This site does not always let JobSentinel check listings/i),
    ).toHaveLength(2);
    expect(screen.getAllByText(/use Job Site Search Links/i)).toHaveLength(2);
    expect(
      screen.getByText("See which sources are working and what to try next"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cloudflare protection/i)).not.toBeInTheDocument();
  });

  it("introduces additional job sources without provider-name prerequisites", async () => {
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
      screen.getByText(/public company career pages and selected job sites/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Greenhouse, Lever, and other popular job boards/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Turn Remote OK scheduled job checks on or off/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Turn startup and tech hiring post checks on or off/i }),
    ).toBeInTheDocument();
  });

  it("labels USAJobs source setup as optional scheduled checks", async () => {
    const user = userEvent.setup();
    const config = makeConfig();
    config.usajobs.enabled = true;

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return config;
      if (cmd === "has_credential") return false;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    const { container } = render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(screen.getByText(/Optional USAJobs scheduled checks/i)).toBeInTheDocument();
    expect(screen.getByText(/Skip this if you only want to open USAJobs/i)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Turn USAJobs scheduled job checks on or off/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/JobSentinel contacts USAJobs on your schedule/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/access code, USAJobs email, search words, location,\s*remote choice, how recent jobs should be/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search words")).toBeInTheDocument();
    expect(screen.getByText("Posted in last:")).toBeInTheDocument();
    expect(screen.getByText("Jobs to check:")).toBeInTheDocument();
    expect(screen.queryByLabelText("Keywords")).not.toBeInTheDocument();
    expect(screen.queryByText("Posted within:")).not.toBeInTheDocument();
    expect(screen.queryByText("Max results:")).not.toBeInTheDocument();
    expect(screen.queryByText(/Optional USAJobs auto-check/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/automatic checks/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /automatic checks/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/scheduled USAJobs checks/i)).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/automatic\s+USAJobs\s+checks/i);
    expect(
      screen.getByRole("link", { name: /Open USAJobs search in your browser/i }),
    ).toHaveAttribute("href", "https://www.usajobs.gov/Search/Results");
    expect(
      screen.getByRole("link", { name: /Open USAJobs access-code request/i }),
    ).toHaveAttribute("href", "https://developer.usajobs.gov/APIRequest/Index");
    expect(screen.queryByText(/Quick Setup/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced federal monitoring/i)).not.toBeInTheDocument();
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
      screen.getByPlaceholderText("Paste Discord connection link"),
      "https://evil.com/api/webhooks/123/abc",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Check Discord connection link",
      "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("save_config", expect.anything());
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
      screen.getByPlaceholderText("Paste Teams connection link"),
      "https://evil.com/webhook/abc",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Check Teams connection link",
      "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("save_config", expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "store_credential",
      expect.objectContaining({ key: "teams_webhook" }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
