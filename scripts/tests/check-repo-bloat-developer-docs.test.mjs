import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-developer-docs-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects developer testing doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      [
        "// Good ✅",
        "// Bad ❌",
        "| Core business logic | 90%+ | ✅ Achieved |",
        "| Scrapers | 70%+ | ⚠️ In Progress |",
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated:** May 19, 2026",
        "**Version:** v2.6.4",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: May 19, 2026",
        "**Test Count**: Run `npm run test:run` for current frontend count",
        "**Stack**: Vitest 4.0.17",
        "**Maintained By**: JobSentinel Team",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      [
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: March 18, 2026",
        "**Test Count**: Run `cargo test --test '*' -- --list`",
        "**Version**: v2.6.4",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/MUTATION_TESTING.md",
      [
        "x > 0  // ✅ Line covered",
        "is_positive(5);  // ❌ No assertion",
        "**⚠️ Warning:** Full mutation testing can take 30-60+ minutes!",
        "✅ CAUGHT by test_negative_salary_floor_fails",
        "❌ MISSED - no test caught this mutation",
        "| **Timeout** ⏱️ | Tests took too long |",
        "**Last Updated**: May 20, 2026",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/TESTING.md",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
        "docs/developer/MUTATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace developer testing doc stale markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/INTEGRATION_TESTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/MUTATION_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer architecture doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      [
        "**JobSentinel v2.6.4 System Architecture**",
        "// Good ✅: Core depends on abstractions",
        "// Bad ❌: Core depends on concrete types",
        "- No cloud dependencies (v1.0)",
        "**Last Updated**: May 20, 2026",
        "**Version**: 2.6.4",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      [
        "// Good ✅: Structured fields",
        "// Bad ❌: String interpolation only",
        "**DO ✅:**",
        "**DON'T ❌:**",
        "| Bad ❌ | Good ✅ |",
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: May 20, 2026",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/ARCHITECTURE.md", "docs/developer/ERROR_HANDLING.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer architecture doc diagram glyphs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["```text", "┌──────────────┐", "│ Frontend     │", "Frontend → Backend", "```", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      ["```text", "├─ Yes → Use a domain-specific error enum", "└─ No → Use anyhow::Result", "```", ""].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/ARCHITECTURE.md", "docs/developer/ERROR_HANDLING.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer maintenance doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/CONTRIBUTING.md",
      [
        "# Contributing",
        "",
        "**Current version:** 2.6.4 (Production Ready)",
        "",
        "## 🚀 Getting Started",
        "",
        "- ✅ **Do:** Provide constructive feedback",
        "- ❌ **Don't:** Share private information",
        "",
        "**Last Updated:** March 18, 2026 (v2.6.4)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      [
        "# Getting Started",
        "",
        "**Version 2.6.4**",
        "",
        "│   │   │   ├── db/          # Database layer (refactored v1.5)",
        "",
        "### Modular Architecture (v1.5+)",
        "",
        "1. Read ROADMAP.md for v1.5+ priorities",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/WHY_TAURI.md",
      [
        "# Why Tauri?",
        "",
        "**Last Updated:** March 18, 2026",
        "**Version:** v2.6.4",
        "├── Chrome runtime",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/RELEASING.md",
      ["# Releases", "", "## Version History", "", "- **v2.7.1 (unreleased)** - Notes", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/CI_CD.md",
      ["# CI/CD", "", "**Last updated:** March 2026", "**Version:** v2.6.4", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/ADDING_DEEP_LINK_SITES.md",
      ["# Add Deep Link Sites", "", "Right-click → \"View Page Source\"", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/MACOS_DEVELOPMENT.md",
      ["# macOS Development", "", "Happy hacking on macOS! 🍎", ""].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/CONTRIBUTING.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/WHY_TAURI.md",
        "docs/developer/RELEASING.md",
        "docs/developer/CI_CD.md",
        "docs/developer/ADDING_DEEP_LINK_SITES.md",
        "docs/developer/MACOS_DEVELOPMENT.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/CONTRIBUTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/WHY_TAURI.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/RELEASING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/CI_CD.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/ADDING_DEEP_LINK_SITES.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/MACOS_DEVELOPMENT.md",
      ),
      violations.join("\n"),
    );
  });
});
