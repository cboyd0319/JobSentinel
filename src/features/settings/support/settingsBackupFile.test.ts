import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadPrivateSettingsBackup,
  selectSettingsBackupFile,
} from "./settingsBackupFile";

const downloadTextFile = vi.hoisted(() => vi.fn());
vi.mock("../../../shared/browserDownload", () => ({ downloadTextFile }));

describe("Settings backup files", () => {
  beforeEach(() => {
    downloadTextFile.mockReset();
  });

  it("downloads formatted JSON with a provided or dated filename", () => {
    downloadPrivateSettingsBackup({ setting: "value" }, "backup.json");
    expect(downloadTextFile).toHaveBeenLastCalledWith(
      '{\n  "setting": "value"\n}',
      "backup.json",
      "application/json",
    );

    downloadPrivateSettingsBackup({ setting: "value" });
    expect(downloadTextFile.mock.calls[1]?.[1]).toMatch(
      /^jobsentinel-settings-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });

  it("recursively removes every supported credential field", () => {
    const backup = {
      alerts: {
        slack: { webhook_url: "slack-secret", enabled: true },
        email: { smtp_password: "smtp-secret", smtp_server: "smtp.test" },
        discord: { discord_webhook: "discord-secret" },
        telegram: { bot_token: "telegram-secret", chat_id: "123" },
        teams: { teams_webhook: "teams-secret" },
      },
      linkedin: {
        session_cookie: "linkedin-secret",
        query: "care coordinator",
      },
      usajobs: { api_key: "usajobs-secret", email: "user@example.com" },
      credentials: {
        slack_webhook: "slack-field-secret",
        telegram_bot_token: "telegram-field-secret",
        usajobs_api_key: "usajobs-field-secret",
        linkedin_cookie: "linkedin-field-secret",
      },
      nested: [{ api_key: "array-secret", label: "keep" }],
    };

    downloadPrivateSettingsBackup(backup);
    const exported = JSON.parse(
      downloadTextFile.mock.calls[0]?.[0],
    ) as typeof backup;

    expect(exported.alerts.slack.webhook_url).toBe("");
    expect(exported.alerts.email.smtp_password).toBe("");
    expect(exported.alerts.discord.discord_webhook).toBe("");
    expect(exported.alerts.telegram.bot_token).toBe("");
    expect(exported.alerts.teams.teams_webhook).toBe("");
    expect(exported.linkedin.session_cookie).toBe("");
    expect(exported.usajobs.api_key).toBe("");
    expect(exported.credentials.slack_webhook).toBe("");
    expect(exported.credentials.telegram_bot_token).toBe("");
    expect(exported.credentials.usajobs_api_key).toBe("");
    expect(exported.credentials.linkedin_cookie).toBe("");
    expect(exported.nested[0]?.api_key).toBe("");
    expect(exported.alerts.email.smtp_server).toBe("smtp.test");
    expect(exported.usajobs.email).toBe("user@example.com");
    expect(exported.nested[0]?.label).toBe("keep");
  });

  describe("file selection", () => {
    let input: {
      type: string;
      accept: string;
      onchange: ((event: Event) => void) | null;
      oncancel: (() => void) | null;
      click: ReturnType<typeof vi.fn>;
      files: FileList | null;
    };

    beforeEach(() => {
      input = {
        type: "",
        accept: "",
        onchange: null,
        oncancel: null,
        click: vi.fn(),
        files: null,
      };
      vi.spyOn(document, "createElement").mockReturnValue(
        input as unknown as HTMLInputElement,
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("opens a JSON file picker and reports cancellation", async () => {
      const result = selectSettingsBackupFile();
      expect(input.type).toBe("file");
      expect(input.accept).toBe(".json,application/json");
      expect(input.click).toHaveBeenCalledOnce();

      input.oncancel?.();
      await expect(result).resolves.toEqual({ status: "cancelled" });
    });

    it("reports a change without a selected file as cancellation", async () => {
      const result = selectSettingsBackupFile();
      input.onchange?.({ target: input } as unknown as Event);
      await expect(result).resolves.toEqual({ status: "cancelled" });
    });

    it("parses selected JSON", async () => {
      const backup = { setting: "value", nested: { key: 123 } };
      const file = { text: vi.fn().mockResolvedValue(JSON.stringify(backup)) };
      const result = selectSettingsBackupFile<typeof backup>();
      input.files = { 0: file, length: 1 } as unknown as FileList;

      input.onchange?.({ target: input } as unknown as Event);

      await expect(result).resolves.toEqual({ status: "ok", backup });
    });

    it("rejects unreadable JSON", async () => {
      const file = { text: vi.fn().mockResolvedValue("not valid json") };
      const result = selectSettingsBackupFile();
      input.files = { 0: file, length: 1 } as unknown as FileList;

      input.onchange?.({ target: input } as unknown as Event);

      await expect(result).resolves.toEqual({ status: "invalid" });
    });
  });
});
