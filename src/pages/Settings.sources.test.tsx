import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./Settings";

const mockInvoke = vi.mocked(invoke);

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
    dice: { enabled: false, query: "", location: undefined as string | undefined, limit: 25 },
    yc_startup: { enabled: false, remote_only: false, limit: 25 },
    usajobs: {
      enabled: false,
      email: "",
      remote_only: false,
      date_posted_days: 7,
      limit: 25,
    },
    simplyhired: {
      enabled: false,
      query: "",
      location: undefined as string | undefined,
      limit: 25,
    },
    glassdoor: {
      enabled: false,
      query: "",
      location: undefined as string | undefined,
      limit: 25,
    },
    jobswithgpt_endpoint: "",
    jobswithgpt_approval: {
      enabled: false,
      payload: null,
      approved_at: null,
    },
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

describe("Settings source setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(
      panelQueries.getAllByRole("button", { name: "Review source" }).length,
    ).toBeGreaterThan(0);
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
      screen.getByRole("checkbox", {
        name: /Turn Remote OK scheduled job checks on or off/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: /Turn startup and tech hiring post checks on or off/i,
      }),
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
      screen.getByText(
        /access code, USAJobs email, search words, location,\s*remote choice, how recent jobs should be/i,
      ),
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
    expect(mockInvoke).not.toHaveBeenCalledWith("save_config", expect.anything());
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
        savedConfig = (args as { config: ReturnType<typeof makeConfig> }).config;
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
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savedConfig?.dice.enabled).toBe(true);
    });
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
      screen.getByPlaceholderText(/Teams connection link/i),
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
