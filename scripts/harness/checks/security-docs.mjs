// Detects stale security guidance and credential-config boundary drift.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const notificationDocsPaths = new Set([
  "docs/features/notifications.md",
  "docs/user/QUICK_START.md",
]);

const webhookSecurityDocsPaths = new Set(["docs/security/WEBHOOK_SECURITY.md"]);
const commandExecutionSecurityDocsPaths = new Set(["docs/security/COMMAND_EXECUTION.md"]);
const urlValidationSecurityDocsPaths = new Set(["docs/security/URL_VALIDATION.md"]);

const xssSecurityDocsPaths = new Set([
  "docs/security/README.md",
  "docs/security/XSS_PREVENTION.md",
  "docs/security/dompurify-test-examples.js",
]);

const keyringSecurityDocsPaths = new Set([
  "docs/security/KEYRING.md",
  "docs/features/saved-secrets.md",
]);

const retiredCredentialMigrationPath = "crates/jobsentinel-credentials/src/migration.rs";
const credentialConfigPaths = new Set([
  "crates/jobsentinel-application/src/desktop/startup.rs",
  "crates/jobsentinel-credentials/src/lib.rs",
  "crates/jobsentinel-application/src/config/io.rs",
  "src-tauri/src/ipc/config.rs",
  retiredCredentialMigrationPath,
]);
const retiredCredentialPointers = [
  "/alerts/email/smtp_password",
  "/alerts/telegram/bot_token",
  "/alerts/slack/webhook_url",
  "/alerts/discord/webhook_url",
  "/alerts/teams/webhook_url",
  "/linkedin/session_cookie",
  "/usajobs/api_key",
];
const credentialArchitecturePaths = new Set(["crates/jobsentinel-credentials/src/lib.rs"]);
const userDataFeatureDocsPaths = new Set(["docs/features/user-data-management.md"]);

export function hasStaleNotificationWebhookDocs(root, path) {
  if (!notificationDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Discord:\*\* Must start with `https:\/\/discord\.com\/api\/webhooks\/`/.test(text) ||
    /Teams:\*\* Must start with `https:\/\/outlook\.office\.com\/webhook\/`/.test(text) ||
    /Slack says token is invalid|sign-in\s+tokens|Color-coded embeds|high scores|Send Test|Discord embed looks broken|chat ID/i.test(
      text,
    )
  );
}

export function hasStaleWebhookSecurityDocMarkers(root, path) {
  if (!webhookSecurityDocsPaths.has(path)) {
    return false;
  }

  return /[✅❌⚠️→]|\*\*(?:Last Updated|Version)\*\*:|v2\.0\.0\+/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleCommandExecutionSecurityDocMarkers(root, path) {
  if (!commandExecutionSecurityDocsPaths.has(path)) {
    return false;
  }

  return /[✅❌⚠️→]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleUrlValidationSecurityDocMarkers(root, path) {
  if (!urlValidationSecurityDocsPaths.has(path)) {
    return false;
  }

  const primaryText = readFileSync(join(root, path), "utf8");
  const webhookPath = join(root, "docs/security/WEBHOOK_URL_VALIDATION.md");
  const text = existsSync(webhookPath)
    ? `${primaryText}\n${readFileSync(webhookPath, "utf8")}`
    : primaryText;
  return (
    /[✅❌⚠️]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(text) ||
    /fn\s+validate_webhook_url\s*\(/.test(text) ||
    !text.includes("jobsentinel-security") ||
    !text.includes("validate_webhook_target")
  );
}

export function hasStaleXssSecurityDocs(root, path) {
  if (!xssSecurityDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️→←↑↓]|\*\*(?:Last Updated|(?:DOMPurify|JobSentinel) Version|Security Level)\*\*:/.test(
      text,
    ) ||
    /JobSentinel Security Documentation|DOMPurify Integration Test Example/.test(text) ||
    /JobSentinel uses v3\.3\.1\+|While JobSentinel is a desktop app with no backend/.test(text) ||
    /Resume Builder Configuration|cdn\.jsdelivr\.net\/npm\/dompurify/.test(text) ||
    /\/\/ ✅ Output|\/\/ ❌|\/\/ ✅ SAFE|\/\/ ❌ UNSAFE/.test(text)
  );
}

export function hasStaleKeyringSecurityDocs(root, path) {
  if (!keyringSecurityDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const hasStaleKeyringMarkers =
    /JobSentinel:slack-webhook|SlackWebhookUrl|DiscordWebhookUrl|TeamsWebhookUrl/.test(text) ||
    /EmailSmtpPassword|LinkedinCookies|TelegramToken/.test(text) ||
    /tauri-plugin-secure-storage` JS API|Does NOT delete plaintext values/.test(text) ||
    /HashMap<String, bool>|Vec<\(CredentialKey, bool\)>|list_status\(\) -> Result/.test(text) ||
    /v2\.0\.0 introduces|[✅❌⚠️✓→←]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(text) ||
    /Migration From Plaintext Config|Startup migration runs|keyring_migrated_v1/.test(text) ||
    /tries to move those details into the|JobSentinel retries later/.test(text);

  if (hasStaleKeyringMarkers) {
    return true;
  }

  if (path === "docs/features/saved-secrets.md") {
    return (
      !text.includes("USAJobs access code") ||
      !text.includes("[Local Secret Vault And Keychain Integration](../security/KEYRING.md)")
    );
  }

  return (
    !text.includes("jobsentinel_usajobs_api_key") ||
    !text.includes("store_credential")
  );
}

function rustFunction(text, name) {
  return text.match(
    new RegExp(`^([ \\t]*)(?:pub(?:\\([^)]*\\))?\\s+)?(?:async\\s+)?fn\\s+${name}\\b[\\s\\S]*?^\\1\\}`, "m"),
  )?.[0] ?? "";
}

function hasGuardedConfigDecode(body, decoder) {
  const guard = body.search(/reject_retired_config_fields\([^;]+\)\?;/);
  const decode = body.search(
    new RegExp(`let\\s+(?:mut\\s+)?config\\s*:\\s*(?:Config|Self)\\s*=\\s*serde_json::${decoder}\\(`),
  );
  return guard >= 0 && decode > guard;
}

export function hasUnsafeCredentialConfigCompatibility(root, path) {
  if (!credentialConfigPaths.has(path)) {
    return false;
  }
  if (existsSync(join(root, retiredCredentialMigrationPath))) return true;
  if (path === retiredCredentialMigrationPath) return false;

  const text = readFileSync(join(root, path), "utf8").replace(/^[ \t]*\/\/[^\n]*$/gm, "");
  if (/\b(?:migrate_plaintext_credentials_to_secure_storage|extract_plaintext_credentials|clear_config_credentials|is_migrated|set_migrated)\b|\bmod\s+migration\s*;|\buse\s+(?:self::)?migration::/.test(text)) {
    return true;
  }
  if (path === "crates/jobsentinel-application/src/config/io.rs") {
    const guard = rustFunction(text, "reject_retired_config_fields");
    const presence = guard.search(/\bvalue\.pointer\(\w+\)\.is_some\(\)/);
    return (
      !hasGuardedConfigDecode(rustFunction(text, "from_json"), "from_str") ||
      !hasGuardedConfigDecode(rustFunction(text, "from_value"), "from_value") ||
      !retiredCredentialPointers.every((pointer) => guard.includes(`"${pointer}"`)) ||
      presence < 0 || !/\breturn\s+Err\s*\(/.test(guard.slice(presence))
    );
  }
  if (path === "src-tauri/src/ipc/config.rs") {
    const body = rustFunction(text, "save_config_to_runtime_and_path");
    const decode = body.search(/Config::from_value\(config\)[^;]+\?;/);
    const change = body.search(/runtime_config\.read\(|reconcile_restricted_source_consents\(|\.save\(config_path\)/);
    return decode < 0 || change < decode || /serde_json::from_value/.test(body);
  }
  return false;
}

export function hasStaleCredentialArchitectureComments(root, path) {
  if (!credentialArchitecturePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /tauri-plugin-secure-storage` JS API|set_item|get_item|remove_item|[✅❌⚠️✓→←]/.test(
      text,
    ) ||
    /println!\([^)]*(?:password|secret|token|webhook|cookie|api key)[^)]*\)/i.test(text) ||
    /Got password/i.test(text)
  );
}

export function hasStaleNotificationPreferenceDocs(root, path) {
  if (!userDataFeatureDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const staleShape =
    /per_source_settings|min_score|include_ghosts|keyword_rules|\bthresholds\s*:/.test(text) ||
    /Minimum score|score thresholds per notification channel|minimum score threshold/i.test(text) ||
    /invoke\("save_notification_preferences",\s*\{\s*(?:\r?\n)?\s*(?:per_source_settings|linkedin):/m.test(
      text,
    );

  return staleShape || /save_notification_preferences|advancedFilters|minScoreThreshold/.test(text);
}
