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

const keyringMigrationPaths = new Set([
  "crates/jobsentinel-application/src/desktop/startup.rs",
]);
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
    /v2\.0\.0 introduces|[✅❌⚠️✓→←]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(text);

  if (hasStaleKeyringMarkers) {
    return true;
  }

  if (path === "docs/features/saved-secrets.md") {
    return (
      !text.includes("USAJobs access code") ||
      !text.includes("Legacy LinkedIn saved details") ||
      !text.includes("[Local Secret Vault And Keychain Integration](../security/KEYRING.md)")
    );
  }

  return (
    !text.includes("jobsentinel_usajobs_api_key") ||
    !text.includes("Legacy LinkedIn credential") ||
    !text.includes("store_credential")
  );
}

export function hasUnsafeKeyringMigration(root, path) {
  if (!keyringMigrationPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const hasRetrySafeMarker =
    text.includes("Keyring migration incomplete; will retry on next startup") ||
    text.includes("Secure-storage migration incomplete; will retry on next startup");

  return (
    /even if partial/.test(text) ||
    /✓ Migrated/.test(text) ||
    !text.includes("mark_migration_complete") ||
    !hasRetrySafeMarker
  );
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
