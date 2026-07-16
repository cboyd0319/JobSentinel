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


test("checkRepoBloat rejects stale webhook security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/WEBHOOK_SECURITY.md",
      [
        "// ❌ BAD: Easy to bypass",
        "2. **Invalid domain**: Try `https://evil.com/hook` → Should error",
        "1. **v2.0.0+**: Webhooks stored in OS keyring",
        "**Last Updated**: 2026-03-18",
        "**Version**: 2.6.4",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/security/WEBHOOK_SECURITY.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace webhook security doc stale markers: docs/security/WEBHOOK_SECURITY.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale command execution security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/COMMAND_EXECUTION.md",
      [
        "PDF File → pdftoppm → PNG Images → tesseract → Extracted Text",
        "// ❌ VULNERABLE: Shell injection risk",
        "- ✅ Path traversal: `../../etc/passwd` → Error",
        "**Last Updated**: 2026-03-18",
        "**Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/security/COMMAND_EXECUTION.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace command execution security doc stale markers: docs/security/COMMAND_EXECUTION.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale URL validation security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/URL_VALIDATION.md",
      [
        "### Insecure Approach ❌",
        "// ✅ GOOD: Explicit allowlist",
        "**Last Updated**: 2026-05-19",
        "**Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/security/URL_VALIDATION.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync URL validation security doc markers: docs/security/URL_VALIDATION.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale XSS security docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/README.md",
      [
        "Input → Validation → Sanitization",
        "User Input ↑ Parse",
        "// ❌ Insecure: Allows on error",
        "// ✅ Secure: Denies on error",
        "**Last Updated**: 2026-05-19",
        "**JobSentinel Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/XSS_PREVENTION.md",
      [
        "> JobSentinel Security Documentation",
        "npm install dompurify  # JobSentinel uses v3.3.1+",
        '<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>',
        "### Resume Builder Configuration",
        "While JobSentinel is a desktop app with no backend",
        "// ✅ SAFE - Always sanitize first",
        "**DOMPurify Version**: 3.x",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/dompurify-test-examples.js",
      [
        " * DOMPurify Integration Test Example",
        "// ✅ Output: Same as input",
        "// ❌ UNSAFE",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/security/README.md",
        "docs/security/XSS_PREVENTION.md",
        "docs/security/dompurify-test-examples.js",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/README.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/XSS_PREVENTION.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/dompurify-test-examples.js",
      ),
      violations.join("\n"),
    );
  });
});
