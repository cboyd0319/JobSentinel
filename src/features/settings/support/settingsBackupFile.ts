import { downloadTextFile } from "../../../shared/browserDownload";

const SENSITIVE_CONFIG_FIELD_NAMES = new Set([
  "api_key",
  "bot_token",
  "discord_webhook",
  "linkedin_cookie",
  "session_cookie",
  "slack_webhook",
  "smtp_password",
  "teams_webhook",
  "telegram_bot_token",
  "usajobs_api_key",
  "webhook_url",
]);

function scrubSensitiveFields(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(scrubSensitiveFields);
    return;
  }

  const record = value as Record<string, unknown>;
  Object.entries(record).forEach(([key, nested]) => {
    if (SENSITIVE_CONFIG_FIELD_NAMES.has(key)) {
      record[key] = "";
      return;
    }
    scrubSensitiveFields(nested);
  });
}

function serializePrivateSettingsBackup<T>(backup: T): string {
  const sanitized = JSON.parse(JSON.stringify(backup)) as Record<
    string,
    unknown
  >;
  scrubSensitiveFields(sanitized);
  return JSON.stringify(sanitized, null, 2);
}

export function downloadPrivateSettingsBackup<T>(
  backup: T,
  filename?: string,
): void {
  const date = new Date().toISOString().split("T")[0];
  downloadTextFile(
    serializePrivateSettingsBackup(backup),
    filename || `jobsentinel-settings-backup-${date}.json`,
    "application/json",
  );
}

export type SettingsBackupFileResult<T> =
  { status: "ok"; backup: T } | { status: "cancelled" } | { status: "invalid" };

export function selectSettingsBackupFile<T>(): Promise<
  SettingsBackupFileResult<T>
> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ status: "cancelled" });
        return;
      }

      try {
        resolve({ status: "ok", backup: JSON.parse(await file.text()) as T });
      } catch {
        resolve({ status: "invalid" });
      }
    };
    input.oncancel = () => resolve({ status: "cancelled" });
    input.click();
  });
}
