import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-feedback-readability-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale feedback system-info architecture field", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/feedbackClient.ts",
      [
        "export interface SystemInfo {",
        "  arch: string;",
        "}",
        "export function formatDebugInfo(systemInfo: SystemInfo): string {",
        "  return `Architecture: ${systemInfo.arch}`;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      "export function DebugInfoPreview({ systemInfo }) { return systemInfo.arch; }\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_system_info':",
        "      return { arch: 'wasm' };",
        "    default:",
        "      return undefined;",
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
        "src/features/settings/support/feedback/feedbackClient.ts",
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/features/settings/support/feedback/feedbackClient.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/features/settings/support/feedback/DebugInfoPreview.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw feedback debug-event JSON", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      [
        "export function formatDebugInfo(debugEvents) {",
        "  return debugEvents.map(event => JSON.stringify(event.details));",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      "export function DebugInfoPreview({ event }) { return JSON.stringify(event.details); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/settings/support/feedback/feedbackReportFormatting.ts",
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep feedback debug event details readable: src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep feedback debug event details readable: src/features/settings/support/feedback/DebugInfoPreview.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical company labels in feedback reports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      [
        "export function formatDebugInfo(configSummary) {",
        '  return `Company exclusion list: ${configSummary.has_blocked_companies}\\nCompany preference list: ${configSummary.has_preferred_companies}`;',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep feedback reports plain-language: src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw problem-history context JSON", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/support/ErrorLogPanel.tsx",
      [
        "export function ErrorLogPanel({ error }) {",
        "  return <p>{error.message}</p>;",
        "  return <pre>{JSON.stringify(error.context)}</pre>;",
        "  return <pre>{error.stack}</pre>;",
        "  return <pre>{error.componentStack}</pre>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/features/settings/support/ErrorLogPanel.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep problem-history context details readable: src/features/settings/support/ErrorLogPanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw visible error-boundary details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
      [
        "export function ComponentErrorBoundary({ error }) {",
        "  return <p>{this.state.error.message}</p>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/app/errors/ErrorBoundary.tsx",
      [
        "export function ErrorBoundary({ error }) {",
        "  return <p>{this.state.error.message}</p>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ModalErrorBoundary.tsx",
      [
        "export function ModalErrorBoundary({ error }) {",
        "  return <pre>{this.state.error.stack}</pre>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/app/errors/PageErrorBoundary.tsx",
      [
        "export function PageErrorBoundary({ error }) {",
        "  const message = error.message;",
        "  return <p>{sanitizeTextForStorage(message)}</p>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
        "src/app/errors/ErrorBoundary.tsx",
        "src/features/dashboard/errors/ModalErrorBoundary.tsx",
        "src/app/errors/PageErrorBoundary.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/features/dashboard/errors/ComponentErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/app/errors/ErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/features/dashboard/errors/ModalErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/app/errors/PageErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical recovery copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
      [
        "export function ComponentErrorBoundary() {",
        "  return <p>{this.props.componentName} Error</p>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/app/errors/ErrorBoundary.tsx",
      [
        "export function ErrorBoundary({ count }) {",
        "  return <p>Error occurred {count} times</p>;",
        "  return <button>Reset Window State & Reload</button>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ModalErrorBoundary.tsx",
      [
        "export function ModalErrorBoundary() {",
        "  return <button aria-label=\"Close error dialog\">Close</button>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/app/errors/PageErrorBoundary.tsx",
      [
        "export function PageErrorBoundary({ pageName }) {",
        "  return <EmptyState title={`${pageName || \"Page\"} Error`} />;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      [
        "export function ScraperHealthDashboard() {",
        "  return <CardHeader title=\"Error\" />;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
        "src/app/errors/ErrorBoundary.tsx",
        "src/features/dashboard/errors/ModalErrorBoundary.tsx",
        "src/app/errors/PageErrorBoundary.tsx",
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
      "src/app/errors/ErrorBoundary.tsx",
      "src/features/dashboard/errors/ModalErrorBoundary.tsx",
      "src/app/errors/PageErrorBoundary.tsx",
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
    ]) {
      assert.ok(
        violations.includes(`keep recovery copy plain-language: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
