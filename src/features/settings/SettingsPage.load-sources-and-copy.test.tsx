import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  cleanupSettingsLoadTest,
  makeConfig,
  makeGhostConfig,
  mockInvoke,
  mockToast,
  resetSettingsLoadTest,
  setupHappyPath,
} from "./SettingsPage.testSupport";
import Settings from "./SettingsPage";

describe("Settings — loadConfig flow", () => {
  beforeEach(resetSettingsLoadTest);
  afterEach(cleanupSettingsLoadTest);

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

    await userEvent.click(
      screen.getByRole("tab", { name: "Sources & Alerts" }),
    );

    expect(screen.getByText("User controlled")).toBeInTheDocument();
    expect(
      screen.getByText(/Open LinkedIn when you choose/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/How this works/i)[0]).toHaveTextContent(
      /local buttons and notes/i,
    );
    expect(screen.getByText(/Site rules reminder/i)).toHaveTextContent(
      /keeps you in control/i,
    );
    expect(
      screen.getByText(/public company application pages such as Greenhouse/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/public ATS sources/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect linkedin/i }),
    ).not.toBeInTheDocument();
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
      screen.getByRole("button", {
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
    expect(
      screen.getByRole("button", { name: "Widest search" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Balanced" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fresh and verified first" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/keeps jobs visible while warning sooner/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Ghost Detection Settings"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Detection Level:")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lenient" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Strict" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(
      screen.getByText("Warn when a posting is older than"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Warn after a posting appears this many times"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Show posting-risk warning:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Hide postings that need review:/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Stale Threshold (days)"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Stale-posting warning after (days)"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Repeated-posting warning count"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide risky postings:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Early warning point:/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Hide-by-default point:/),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByText("Email provider details"),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByPlaceholderText("Add a word or phrase to avoid..."),
    ).toBeInTheDocument();
    expect(screen.getByText("No search words to avoid")).toBeInTheDocument();
    expect(screen.queryByText("Keywords to Avoid")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sources & Alerts" }));

    expect(
      screen.getByText(/reviewed local resume skills, then your search words/i),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByText("Tip:")
        .some((node) =>
          /review saved skills first/i.test(
            node.closest("p")?.textContent ?? "",
          ),
        ),
    ).toBe(true);
    expect(
      screen.getByText("Job title and search-word fit"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/keyword-only scoring/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/resume match \+ 30% search words/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/resume skills first, then your search words/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload your resume/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/uploaded, scoring uses/i),
    ).not.toBeInTheDocument();
  });

  it("uses protective auto-search helper copy", async () => {
    setupHappyPath();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText(
        /Turn this on to check for new postings while JobSentinel is open/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/never miss a new posting/i),
    ).not.toBeInTheDocument();
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

  it("does not query secure storage when settings opens", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "has_credential") {
        throw new Error("secure storage should be lazy");
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      return null;
    });

    render(<Settings onClose={vi.fn()} />);

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
