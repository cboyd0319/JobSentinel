import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeConfig,
  makeGhostConfig,
  mockInvoke,
  mockToast,
  setupHappyPath,
} from "./Settings.testSupport";
import Settings from "./Settings";

describe("Settings — notification safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
