export function isMarkdown(path) {
  return path.endsWith(".md");
}

export function isSourceFile(path) {
  return /\.(ts|tsx)$/.test(path);
}

export function isFrontendTest(path) {
  return /\.(test|spec)\.(ts|tsx)$/.test(path);
}

export function isRustSource(path) {
  return (
    (path.startsWith("src-tauri/src/") || /^crates\/[^/]+\/src\//.test(path)) &&
    path.endsWith(".rs")
  );
}

export function rustPackageForPath(path) {
  return path.match(/^crates\/([^/]+)\//)?.[1] ?? "jobsentinel";
}

export function isE2ePath(path) {
  return (
    path.startsWith("tests/e2e/") ||
    path.startsWith("e2e/") ||
    path === "playwright.config.ts" ||
    path === "scripts/run-playwright.mjs" ||
    path === "scripts/tests/run-playwright.test.mjs"
  );
}

export function isHarnessPath(path) {
  return (
    [
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "README.md",
      "DESIGN.md",
      "package.json",
      "package-lock.json",
    ].includes(path) ||
    path.startsWith("docs/design/") ||
    path.startsWith("docs/harness/") ||
    path.startsWith("docs/plans/") ||
    path.startsWith(".github/workflows/") ||
    path.startsWith(".github/ISSUE_TEMPLATE/") ||
    path.startsWith("scripts/")
  );
}

export function isUserFacingPath(path) {
  return (
    ["README.md", "DESIGN.md"].includes(path) ||
    path.startsWith("docs/design/") ||
    path.startsWith("docs/user/") ||
    path.startsWith("docs/features/") ||
    path.startsWith(".github/ISSUE_TEMPLATE/") ||
    path.startsWith("examples/profiles/") ||
    path.startsWith("src/features/") ||
    path.startsWith("src/ui/")
  );
}

export function isDesignOrVisualPath(path) {
  return (
    path === "DESIGN.md" ||
    path.startsWith("docs/design/") ||
    path.startsWith("src/features/") ||
    path.startsWith("src/ui/")
  );
}

export function isPrivacyOrSecurityPath(path) {
  const lowerPath = path.toLowerCase();
  return (
    ["PRIVACY.md", "RESPONSIBLE_AI.md", "SECURITY.md"].includes(path) ||
    path.startsWith("src/shared/externalAi/") ||
    path === "scripts/check-external-ai-gateway.mjs" ||
    path === "scripts/checks/security-sensors.mjs" ||
    path.startsWith("scripts/checks/security-sensors/") ||
    path.startsWith("docs/security/") ||
    path.startsWith("docs/architecture/privacy-first-ai-gateway.md") ||
    ["credential", "privacy", "security", "auth", "token"].some((part) =>
      lowerPath.includes(part),
    )
  );
}

export function isTauriInvokePath(path) {
  return (
    path === "src-tauri/src/main.rs" ||
    path === "src-tauri/src/command_handlers.rs" ||
    path.startsWith("src-tauri/src/commands/") ||
    path === "scripts/checks/tauri-invokes.mjs" ||
    path.startsWith("scripts/checks/tauri-invokes/") ||
    path === "scripts/tests/check-tauri-invokes.test.mjs" ||
    path.startsWith("src/mocks/") ||
    path.startsWith("src/shared/tauri/commandClient") ||
    path.startsWith("src/shared/errorReporting/supportReport") ||
    path.startsWith("src/features/settings/support/feedback/feedbackClient") ||
    path.startsWith("src/shared/search-links")
  );
}

export function isDependencyPolicyPath(path) {
  return (
    path === "scripts/checks/dependency-pins.mjs" ||
    path.startsWith("scripts/checks/dependencies/") ||
    path.startsWith("scripts/dependency/")
  );
}

export function isRepoBloatPolicyPath(path) {
  return (
    path === "scripts/checks/repo-bloat.mjs" ||
    path.startsWith("scripts/checks/repo-bloat/") ||
    path.startsWith("scripts/harness/checks/")
  );
}
