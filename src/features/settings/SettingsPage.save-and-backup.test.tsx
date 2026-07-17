import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeConfig,
  makeGhostConfig,
  makeSavedSearch,
  mockDownloadPrivateSettingsBackup,
  mockSelectSettingsBackupFile,
  mockInvoke,
  mockToast,
  setupHappyPath,
} from "./SettingsPage.testSupport";
import Settings from "./SettingsPage";

describe("Settings — handleSave flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        savedConfig = (args as { config: ReturnType<typeof makeConfig> })
          .config;
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
    const slackWebhook =
      "https://hooks.slack.com/services/T00/B00/secret-token";

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
    mockSelectSettingsBackupFile.mockResolvedValueOnce({ status: "invalid" });

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
    mockSelectSettingsBackupFile.mockResolvedValueOnce({
      status: "ok",
      backup: restoredConfig,
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Backup Settings" }));

    await waitFor(() => {
      expect(mockDownloadPrivateSettingsBackup).toHaveBeenCalledTimes(1);
    });
    expect(mockDownloadPrivateSettingsBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "jobsentinel-local-data-backup",
        schemaVersion: 1,
        settings: expect.objectContaining({
          keywords_boost: ["rust"],
        }),
        coverLetterTemplates: [],
        savedSearches: [],
        recoveryGuide: expect.objectContaining({
          portableIncludes: expect.arrayContaining([
            "settings",
            "saved searches",
          ]),
          notIncluded: expect.arrayContaining(["saved connection details"]),
          recoverySteps: expect.arrayContaining([
            expect.stringMatching(/safe support report/i),
          ]),
        }),
      }),
      expect.stringMatching(
        /^jobsentinel-local-data-backup-\d{4}-\d{2}-\d{2}\.json$/,
      ),
    );
    expect(
      screen.getByText(/Settings backups are private files/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/saved searches and cover letter templates/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Recovery coverage")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Full local recovery can replace local jobs, applications, resumes, notes, reminders, and history/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Copy or save a safe support report before full local recovery/i,
      ),
    ).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith(
      "Private backup saved",
      "Saved connection details are left out. The file includes settings, saved searches, and cover letter templates.",
    );

    await user.click(screen.getByRole("button", { name: "Restore Settings" }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Settings restored",
        "Review settings and use Save. Saved connection details are not included in backups, so add them again if needed.",
      );
    });
    expect(screen.queryByText(/Config imported/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Credentials must/i)).not.toBeInTheDocument();
  });

  it("restores local-data backups with templates and saved searches", async () => {
    const user = userEvent.setup();
    const restoredConfig = {
      ...makeConfig(),
      salary_floor_usd: 90000,
    };
    const template = {
      id: "template-1",
      name: "General cover letter",
      content: "Hello hiring team",
      category: "general",
      createdAt: "2026-06-19T12:00:00Z",
      updatedAt: "2026-06-19T12:00:00Z",
    };
    const savedSearch = makeSavedSearch();

    setupHappyPath();
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "get_config") return makeConfig();
      if (cmd === "get_credential_status") return [];
      if (cmd === "get_credential_unlock_status") {
        return { mode: "system", configured: false, unlocked: true };
      }
      if (cmd === "get_ghost_config") return makeGhostConfig();
      if (cmd === "detect_location") return null;
      if (cmd === "import_cover_letter_templates") return 1;
      if (cmd === "import_saved_searches") return 1;
      return null;
    });
    mockSelectSettingsBackupFile.mockResolvedValueOnce({
      status: "ok",
      backup: {
        kind: "jobsentinel-local-data-backup",
        schemaVersion: 1,
        exportedAt: "2026-06-19T12:00:00Z",
        settings: restoredConfig,
        coverLetterTemplates: [template],
        savedSearches: [savedSearch],
      },
    });

    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Restore Settings" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("import_cover_letter_templates", {
        templates: [template],
      });
      expect(mockInvoke).toHaveBeenCalledWith("import_saved_searches", {
        searches: [savedSearch],
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        "Local data restored",
        "Review settings and use Save. Restored 1 template(s) and 1 saved search(es). Saved connection details are not included.",
      );
    });
  });

  it("rejects JSON that is not a JobSentinel settings backup", async () => {
    const user = userEvent.setup();

    setupHappyPath();
    mockSelectSettingsBackupFile.mockResolvedValueOnce({
      status: "ok",
      backup: { setting: "value" },
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
});
