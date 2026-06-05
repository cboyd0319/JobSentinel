import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./Settings";
import * as feedbackService from "../services/feedbackService";

const mockInvoke = vi.mocked(invoke);

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
