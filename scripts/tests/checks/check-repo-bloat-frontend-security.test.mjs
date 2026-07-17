import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-frontend-security-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects unsanitized frontend error report storage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "class ErrorReporter {",
        "  private errors = [];",
        "  capture(report) {",
        "    this.errors.unshift(report);",
        "    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors));",
        "    logError(`[ErrorReporter][${type}]`, error.message, {",
        "      report,",
        "      originalError: error,",
        "    });",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize frontend error report storage: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw ErrorReporter storage warning details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "const TOKEN_PATTERN = /token(?:\\s+|=)/;",
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)/;",
        "function sanitizeStoredReport(report) { return report; }",
        "function isErrorReport(report) { return Boolean(report); }",
        "function parseStoredErrorReports(stored) { return []; }",
        "class ErrorReporter {",
        "  load(e) {",
        "    console.warn('[ErrorReporter] Failed to load from storage:', e);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize frontend error report storage: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw frontend error reporter forwarding", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "class ErrorReporter {",
        "  init() {",
        "    window.onerror = () => {",
        "      return false;",
        "    };",
        "    window.onunhandledrejection = (event) => {",
        "      if (!import.meta.env.DEV) {",
        "        event.preventDefault();",
        "      }",
        "    };",
        "    const originalConsoleError = console.error;",
        "    console.error = (...args) => originalConsoleError.apply(console, args);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize frontend error reporter console forwarding: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw frontend error helper debug logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/errorSupport.ts",
      [
        "export function logErrorDetails(error, context) {",
        "  console.error('Error:', error);",
        "  console.log('Context:', context);",
        "  console.log('Stack:', error.stack);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/errorSupport.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize frontend error helper debug logging: src/errorSupport.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw frontend user error messages", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/errorSupport.ts",
      [
        "export function getUserMessage(error) {",
        "  if (error instanceof Error) {",
        "    return error.message;",
        "  }",
        "  return 'An unexpected error occurred.';",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/errorSupport.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize frontend user error messages: src/errorSupport.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw shared frontend error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/logger.ts",
      [
        "export function logError(message, error) {",
        "  console.error(message, error);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/shared/errorReporting/logger.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize shared frontend error logging: src/shared/errorReporting/logger.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw shared frontend error messages", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/logger.ts",
      [
        "export function getErrorMessage(error) {",
        "  if (error instanceof Error) return error.message;",
        "  if (typeof error === 'string') return error;",
        "  return String(error);",
        "}",
        "export function logError(message, error) {",
        "  console.error(sanitizeTextForStorage(message), sanitizeLoggedError(error));",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/shared/errorReporting/logger.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize shared frontend error logging: src/shared/errorReporting/logger.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects direct frontend console error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/app/errors/ErrorBoundary.tsx",
      [
        "export class ErrorBoundary {",
        "  componentDidCatch(error, errorInfo) {",
        "    console.error('Global Error Boundary caught error:', error, errorInfo);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/app/errors/ErrorBoundary.tsx"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "route frontend direct error logging through sanitized logger: src/app/errors/ErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale frontend webhook redaction patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com\\/services|discord\\.com\\/api\\/webhooks|outlook\\.office\\.com\\/webhook)[^\\s]*/gi;",
        "function sanitizeStoredReport(report) { return report; }",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize frontend error report storage: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe stored error report parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "function sanitizeStoredReport(report) { return report; }",
        "function loadFromStorage(stored) {",
        "  this.errors = JSON.parse(stored).map((report) => sanitizeStoredReport(report));",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate stored error reports before loading: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe reason JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/ui/score-display/internal/scoreReasons.ts",
      [
        "function parseScoreReasons(reasonsJson) {",
        "  const reasons: string[] = JSON.parse(reasonsJson);",
        "  return reasons.map((reason) => reason.toLowerCase());",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/GhostIndicator.tsx",
      [
        "function parseReasons(reasonsJson) {",
        "  try {",
        "    return JSON.parse(reasonsJson);",
        "  } catch {",
        "    return [];",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/ui/score-display/internal/scoreReasons.ts",
        "src/features/dashboard/components/GhostIndicator.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate reason JSON before rendering: src/ui/score-display/internal/scoreReasons.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "validate reason JSON before rendering: src/features/dashboard/components/GhostIndicator.tsx",
      ),
      violations.join("\n"),
    );
  });
});
