import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { formatHarnessPlan, summarizeHarnessPlan } from "../harness-plan.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-harness-plan-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function commandsFor(plan) {
  return plan.commands.map((entry) => entry.command);
}

test("plans harness and markdown checks for active docs", () => {
  withFixture((root) => {
    const plan = summarizeHarnessPlan(root, {
      changedFiles: ["docs/plans/active/status.md", "README.md"],
      since: "origin/main",
    });

    assert.deepEqual(commandsFor(plan), [
      "npm run harness:check",
      "npm run lint:md",
      "npm run lint:bloat",
    ]);
    assert.equal(plan.since, "origin/main");
    assert.match(formatHarnessPlan(plan), /changed files since origin\/main plus dirty working tree/);
  });
});

test("plans harness, markdown, and bloat checks for design contract docs", () => {
  withFixture((root) => {
    const plan = summarizeHarnessPlan(root, {
      changedFiles: ["DESIGN.md", "docs/design/README.md", "docs/design/design-spec.md"],
    });

    assert.deepEqual(commandsFor(plan), [
      "npm run harness:check",
      "npm run lint:md",
      "npm run lint:bloat",
    ]);
    assert.deepEqual(plan.notes, [
      "Manual visual proof required: use Computer Use or Playwright screenshots for touched routes, modals, toasts, settings, keyboard flow, and narrow-width states.",
    ]);
  });
});

test("plans focused frontend tests when adjacent coverage exists", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/features/dashboard/components/JobCard.test.tsx");

    const plan = summarizeHarnessPlan(root, {
      changedFiles: ["src/features/dashboard/components/JobCard.tsx"],
    });

    assert.deepEqual(commandsFor(plan), [
      "npm run lint",
      "npm run test:run -- src/features/dashboard/components/JobCard.test.tsx",
      "npm run lint:bloat",
    ]);
    assert.match(formatHarnessPlan(plan), /Manual visual proof required/);
  });
});

test("plans full unit suite when frontend source has no adjacent test", () => {
  withFixture((root) => {
    const plan = summarizeHarnessPlan(root, {
      changedFiles: ["src/services/jobImport.ts"],
    });

    assert.deepEqual(commandsFor(plan), ["npm run lint", "npm run test:run"]);
  });
});

test("plans Rust, Tauri invoke, and migration checks", () => {
  withFixture((root) => {
    const plan = summarizeHarnessPlan(root, {
      changedFiles: [
        "src-tauri/src/commands/job_import.rs",
        "src-tauri/migrations/20260601000000_example.sql",
      ],
    });

    assert.deepEqual(commandsFor(plan), [
      "cd src-tauri && cargo fmt --all -- --check",
      "cd src-tauri && cargo clippy -- -D warnings",
      "cd src-tauri && cargo test --lib",
      "npm run lint:tauri-invokes",
      'cd src-tauri && DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare',
    ]);
  });
});

test("plans root workspace checks for Rust crates and owned migrations", () => {
  withFixture((root) => {
    writeFixtureFile(root, "Cargo.toml", "[workspace]\n");
    const plan = summarizeHarnessPlan(root, {
      changedFiles: [
        "crates/jobsentinel-core/src/search.rs",
        "crates/jobsentinel-core/migrations/20260713000000_example.sql",
      ],
    });

    assert.deepEqual(commandsFor(plan), [
      "cargo fmt --all -- --check",
      "cargo clippy --workspace -- -D warnings",
      "cargo test -p jobsentinel-core",
      'DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare --workspace',
    ]);
  });
});

test("plans script tests and focused script test", () => {
  withFixture((root) => {
    writeFixtureFile(root, "scripts/tests/harness-plan.test.mjs");

    const plan = summarizeHarnessPlan(root, {
      changedFiles: ["scripts/harness-plan.mjs"],
    });

    assert.deepEqual(commandsFor(plan), [
      "npm run harness:check",
      "npm run test:scripts",
      "node --test scripts/tests/harness-plan.test.mjs",
    ]);
  });
});

test("plans E2E smoke and strict browser doctor for Playwright harness changes", () => {
  withFixture((root) => {
    writeFixtureFile(root, "scripts/tests/run-playwright.test.mjs");

    const plan = summarizeHarnessPlan(root, {
      changedFiles: ["scripts/run-playwright.mjs"],
    });

    assert.deepEqual(commandsFor(plan), [
      "npm run harness:check",
      "npm run test:scripts",
      "node --test scripts/tests/run-playwright.test.mjs",
      "npm run doctor:e2e",
      "npm run test:e2e:smoke",
    ]);
  });
});

test("plans session snapshot when no changed files are detected", () => {
  withFixture((root) => {
    const plan = summarizeHarnessPlan(root, { changedFiles: [] });

    assert.deepEqual(commandsFor(plan), ["npm run harness:session"]);
    assert.match(formatHarnessPlan(plan), /Changed files: 0/);
  });
});
