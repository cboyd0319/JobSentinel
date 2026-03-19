import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./Settings";

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

vi.mock("../utils/export", () => ({
  exportConfigToJSON: vi.fn(),
  importConfigFromJSON: vi.fn(),
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

  it("shows error state with Retry button when get_config throws", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") throw new Error("DB locked");
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return false;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("Retry button re-attempts loadConfig successfully", async () => {
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
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    // Click retry — should succeed this time
    await user.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(
        screen.queryByText(/failed to load settings/i),
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
      "Some credentials unavailable",
      expect.stringContaining("2"),
    );

    // Should NOT show error state
    expect(
      screen.queryByText(/failed to load settings/i),
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

    // Should warn about all 7 credential failures
    expect(mockToast.warning).toHaveBeenCalledWith(
      "Some credentials unavailable",
      expect.stringContaining("7"),
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
      "Ghost detection defaults loaded",
      expect.stringContaining("defaults"),
    );
  });

  it("fetches LinkedIn expiry status when linkedin credential exists", async () => {
    const expiryStatus = {
      connected: true,
      expires_at: "2026-04-01T00:00:00Z",
      days_remaining: 14,
      expiry_warning: false,
      expired: false,
    };

    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        const { key } = args as { key: string };
        return key === "linkedin_cookie";
      }
      if (cmd === "get_linkedin_expiry_status") return expiryStatus;
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Verify linkedin expiry was fetched
    expect(mockInvoke).toHaveBeenCalledWith("get_linkedin_expiry_status");
  });

  it("does NOT fetch LinkedIn expiry when linkedin credential check fails", async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        const { key } = args as { key: string };
        if (key === "linkedin_cookie") throw new Error("Keyring locked");
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

    // LinkedIn expiry should NOT have been fetched (credential check failed → false)
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
        "Save failed",
        expect.any(String),
      );
    });

    // Should NOT close on failure
    expect(onClose).not.toHaveBeenCalled();
  });
});
