import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkExternalAiGateway } from "../check-external-ai-gateway.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-external-ai-gateway-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkExternalAiGateway rejects direct OpenAI SDK imports", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/services/directOpenAi.ts",
      `
import OpenAI from "openai";

export const client = new OpenAI();
`,
    );

    const violations = checkExternalAiGateway(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/services/directOpenAi.ts:2 (OpenAI SDK usage)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkExternalAiGateway rejects non-OpenAI provider endpoints in config", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      ".github/workflows/ai.yml",
      `
jobs:
  summarize:
    steps:
      - run: curl https://api.anthropic.com/v1/messages
`,
    );

    const violations = checkExternalAiGateway(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          ".github/workflows/ai.yml:5 (Anthropic API endpoint)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkExternalAiGateway rejects external AI secrets in JSON config", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "config/providers.json",
      JSON.stringify({ env: "GEMINI_API_KEY" }),
    );

    const violations = checkExternalAiGateway(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "config/providers.json:1 (external AI API key variable)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkExternalAiGateway rejects external AI package dependencies", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify({ dependencies: { openai: "1.0.0" } }),
    );

    const violations = checkExternalAiGateway(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "package.json:1 (external AI SDK dependency)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkExternalAiGateway rejects provider code inside the frontend policy boundary", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/externalAi/internal/aiGateway.ts",
      `
import OpenAI from "openai";

const endpoint = "https://api.openai.com/v1/responses";
`,
    );

    assert.ok(
      checkExternalAiGateway(root).some((violation) =>
        violation.includes("src/shared/externalAi/internal/aiGateway.ts:"),
      ),
    );
  });
});

test("checkExternalAiGateway allows provider endpoints inside the Rust AI owner", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-ai/src/provider.rs",
      `
const ENDPOINT: &str = "https://api.openai.com/v1/responses";
`,
    );

    assert.deepEqual(checkExternalAiGateway(root), []);
  });
});

test("checkExternalAiGateway rejects provider endpoints inside the Tauri adapter", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/external_ai.rs",
      `
const ENDPOINT: &str = "https://api.openai.com/v1/responses";
`,
    );

    assert.ok(
      checkExternalAiGateway(root).some((violation) =>
        violation.includes("src-tauri/src/commands/external_ai.rs:2"),
      ),
    );
  });
});

test("checkExternalAiGateway avoids company-name false positives", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/notifications/companySuggestions.ts",
      `
export const companies = [
  { name: "openai", displayName: "OpenAI" },
  { name: "anthropic", displayName: "Anthropic" },
];
`,
    );

    assert.deepEqual(checkExternalAiGateway(root), []);
  });
});
