import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./SettingsPage";
import { DEFAULT_EXTERNAL_AI_CONFIG } from "./config/SettingsConfig";
import * as supportReport from "../../shared/errorReporting/supportReport";
import { resetBodyScrollLocksForTests } from "../../ui/bodyScrollLock";

const mockInvoke = vi.mocked(invoke);

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

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
    resetBodyScrollLocksForTests();
    // sessionStorage mock for location cache
    window.sessionStorage.clear?.();
  });

  afterEach(() => {
    resetBodyScrollLocksForTests();
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

  it("keeps Settings scroll locked after closing nested feedback modal", async () => {
    const user = userEvent.setup();
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Send Feedback" }));

    const feedbackDialog = await screen.findByRole("dialog", {
      name: "Send Feedback",
    });

    await user.click(
      within(feedbackDialog).getByRole("button", { name: "Cancel" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Send Feedback" }),
      ).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("copies a sanitized support report from settings with one click", async () => {
    const user = userEvent.setup();
    const copySpy = vi
      .spyOn(supportReport, "copySanitizedDebugReport")
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

    await user.click(
      screen.getByRole("button", { name: "Copy Safe Support Report" }),
    );

    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Safe support report copied",
      "Share it only if you want help. JobSentinel hides common private details; review it before sharing.",
    );
  });

  it("saves a sanitized support report from settings with one click", async () => {
    const user = userEvent.setup();
    const saveSpy = vi
      .spyOn(supportReport, "saveSanitizedDebugReport")
      .mockResolvedValueOnce({
        fileName: "jobsentinel-support-report.txt",
        revealToken: "feedback-token",
      });
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Save Safe Support Report" }),
    );

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Support report saved for review",
      "Review jobsentinel-support-report.txt before sharing it. Share it only if you want help.",
    );
  });

  it("shows error state with Try Again button when get_config throws", async () => {
    const copySpy = vi
      .spyOn(supportReport, "copySanitizedDebugReport")
      .mockResolvedValueOnce({
        content: "safe support report",
        copied: true,
        errorCount: 0,
      });
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
      screen.getByText(/copy or save a safe support report before closing/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/from Help/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Safe Support Report" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Safe Support Report" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Restart JobSentinel/i)).not.toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Copy Safe Support Report" }),
    );
    expect(copySpy).toHaveBeenCalledTimes(1);
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

  it("renders settings form without secure-storage status checks", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        throw new Error("Keyring locked");
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

    expect(
      mockInvoke.mock.calls.some(([cmd]) => cmd === "has_credential"),
    ).toBe(false);
    expect(mockToast.warning).not.toHaveBeenCalledWith(
      "Some saved connection details unavailable",
      expect.any(String),
    );

    // Should NOT show error state
    expect(
      screen.queryByText(/settings could not load/i),
    ).not.toBeInTheDocument();
  });

  it("loads settings without asking for every saved connection detail", async () => {
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

    expect(
      mockInvoke.mock.calls.some(([cmd]) => cmd === "has_credential"),
    ).toBe(false);
    expect(mockToast.warning).not.toHaveBeenCalledWith(
      "Some saved connection details unavailable",
      expect.any(String),
    );
  });

});
