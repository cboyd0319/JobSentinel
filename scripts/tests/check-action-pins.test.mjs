import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  collectActionLatestViolations,
  collectActionPinViolations,
  parseLsRemoteTags,
  parseWorkflowActionUses,
} from "../checks/action-pins.mjs";

const checkoutSha = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";
const setupNodeSha = "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e";
const rustStableSha = "29eef336d9b2848a0b548edc03f92a220660cdb8";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

async function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-action-pins-"));

  try {
    await callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeWorkflow(root, lines) {
  writeFixtureFile(
    root,
    ".github/workflows/ci.yml",
    [
      "name: CI",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-24.04",
      "    steps:",
      ...lines.map((line) => `      ${line}`),
    ].join("\n"),
  );
}

test("workflow action parser extracts pins and comments", () => {
  const actions = parseWorkflowActionUses(
    [
      `- uses: actions/checkout@${checkoutSha} # v7.0.0`,
      `- uses: dtolnay/rust-toolchain@${rustStableSha} # stable`,
    ].join("\n"),
    ".github/workflows/ci.yml",
  );

  assert.deepEqual(
    actions.map((action) => [action.spec, action.ref, action.comment, action.line]),
    [
      ["actions/checkout", checkoutSha, "v7.0.0", 1],
      ["dtolnay/rust-toolchain", rustStableSha, "stable", 2],
    ],
  );
});

test("action pin check accepts full SHA pins with stable comments", async () => {
  await withFixture(async (root) => {
    writeWorkflow(root, [
      `- uses: actions/checkout@${checkoutSha} # v7.0.0`,
      `- uses: actions/setup-node@${setupNodeSha} # v6.4.0`,
      `- uses: dtolnay/rust-toolchain@${rustStableSha} # stable`,
    ]);

    assert.deepEqual(collectActionPinViolations(root), []);
  });
});

test("action pin check rejects tag refs, missing comments, prerelease comments, and inconsistent pins", async () => {
  await withFixture(async (root) => {
    writeFixtureFile(
      root,
      ".github/workflows/ci.yml",
      [
        `- uses: actions/checkout@v7.0.0 # v7.0.0`,
        `- uses: actions/setup-node@${setupNodeSha}`,
        `- uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1-beta.1`,
        `- uses: dtolnay/rust-toolchain@${rustStableSha} # stable`,
        "- uses: dtolnay/rust-toolchain@631a55b12751854ce901bb631d5902ceb48146f7 # stable",
      ].join("\n"),
    );

    const violations = collectActionPinViolations(root);

    assert.equal(violations.some((violation) => violation.includes("must pin a full")), true);
    assert.equal(violations.some((violation) => violation.includes("must include a version comment")), true);
    assert.equal(violations.some((violation) => violation.includes("must use a stable version comment")), true);
    assert.equal(violations.some((violation) => violation.includes("must match")), true);
  });
});

test("ls-remote tag parser prefers dereferenced annotated tags", () => {
  const tags = parseLsRemoteTags(
    [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefs/tags/v7.0.0",
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\trefs/tags/v7.0.0^{}",
      "cccccccccccccccccccccccccccccccccccccccc\trefs/tags/v6.0.2",
    ].join("\n"),
  );

  assert.equal(tags.get("v7.0.0"), "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(tags.get("v6.0.2"), "cccccccccccccccccccccccccccccccccccccccc");
});

test("latest action check reports stale semver tags and stale rolling stable refs", async () => {
  await withFixture(async (root) => {
    writeWorkflow(root, [
      `- uses: actions/checkout@${checkoutSha} # v6.0.2`,
      "- uses: dtolnay/rust-toolchain@631a55b12751854ce901bb631d5902ceb48146f7 # stable",
    ]);

    const violations = await collectActionLatestViolations(root, {
      spawn: (_cmd, args) => {
        const text = args.join(" ");
        if (text.includes("actions/checkout")) {
          return {
            status: 0,
            stdout: [
              `${checkoutSha}\trefs/tags/v7.0.0`,
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefs/tags/v6.0.2",
            ].join("\n"),
            stderr: "",
          };
        }

        if (text.includes("dtolnay/rust-toolchain")) {
          return {
            status: 0,
            stdout: `${rustStableSha}\trefs/heads/stable\n`,
            stderr: "",
          };
        }

        return { status: 1, stdout: "", stderr: "unexpected repo" };
      },
    });

    assert.deepEqual(violations, [
      "actions/checkout comment is # v6.0.2; latest stable tag is v7.0.0",
      "dtolnay/rust-toolchain is pinned to 631a55b12751854ce901bb631d5902ceb48146f7; stable ref is 29eef336d9b2848a0b548edc03f92a220660cdb8",
    ]);
  });
});
