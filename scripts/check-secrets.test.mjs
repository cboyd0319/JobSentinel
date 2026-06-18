import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { checkSecrets } from "./check-secrets.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-secret-scan-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("secret scan rejects high-confidence provider secrets", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/leak.ts",
      [
        'const openai = "sk-proj-' + "A".repeat(48) + '";',
        'const google = "AIza' + "B".repeat(35) + '";',
        'const slack = "xoxb-' + "1-".repeat(12) + 'secret";',
      ].join("\n"),
    );

    const violations = checkSecrets(root);

    assert.equal(violations.length, 3);
    assert.ok(violations.some((violation) => violation.includes("OpenAI API key")));
    assert.ok(violations.some((violation) => violation.includes("Google API key")));
    assert.ok(violations.some((violation) => violation.includes("Slack token")));
  });
});

test("secret scan rejects committed webhook and cookie values", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/runbook.md",
      [
        `Slack: https://hooks.slack.com/services/T${"A".repeat(8)}/B${"B".repeat(8)}/${"C".repeat(24)}`,
        `LinkedIn: li_at=${"d".repeat(48)}`,
      ].join("\n"),
    );

    const violations = checkSecrets(root);

    assert.equal(violations.length, 2);
    assert.ok(violations.some((violation) => violation.includes("Slack webhook URL")));
    assert.ok(violations.some((violation) => violation.includes("LinkedIn session cookie")));
  });
});

test("secret scan rejects private key blocks", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "notes/key.md",
      [
        "-----BEGIN OPENSSH ",
        "PRIVATE KEY-----",
        "\nnot-a-real-key\n-----END OPENSSH PRIVATE KEY-----\n",
      ].join(""),
    );

    const violations = checkSecrets(root);

    assert.equal(violations.length, 1);
    assert.ok(violations[0].includes("private key block"));
  });
});

test("secret scan allows placeholders and documented redaction examples", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/examples.md",
      [
        "PROVIDER_API_KEY is an environment variable name.",
        "Use token=abc123 in sanitizer tests.",
        "Example Slack webhook: https://hooks.slack.com/services/T000/B000/secret",
        "Use sk-REDACTED or <token> placeholders in docs.",
      ].join("\n"),
    );

    assert.deepEqual(checkSecrets(root), []);
  });
});

test("secret scan allows existing long Slack placeholder fixtures only", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/webhooks.md",
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXXverylong",
    );

    assert.deepEqual(checkSecrets(root), []);
  });
});

test("secret scan ignores generated and dependency directories", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "node_modules/package/index.js",
      `const token = "sk-proj-${"A".repeat(48)}";`,
    );
    writeFixtureFile(
      root,
      "src-tauri/target/debug/build.rs",
      `const token = "sk-proj-${"A".repeat(48)}";`,
    );

    assert.deepEqual(checkSecrets(root), []);
  });
});
