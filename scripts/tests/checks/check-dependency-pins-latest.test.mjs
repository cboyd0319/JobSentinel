import assert from "node:assert/strict";
import test from "node:test";
import {
  collectNpmLatestStableViolations,
  collectRuntimeLatestStableViolations,
  collectRuntimePinViolations,
} from "../../checks/dependency-pins.mjs";
import {
  withFixture,
  withFixtureAsync,
  writeFixtureFile,
  writeMinimalNpmFixture,
  writeMinimalRuntimeFixture,
} from "./dependency-pins-test-fixtures.mjs";

test("runtime pin check rejects local npm installs without pinned npm activation", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root);
    writeFixtureFile(root, "scripts/dev/setup-docs-linting.sh", "npm ci\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      ["node scripts/harness/npm-pin.mjs", "npm ci --ignore-scripts"].join("\n"),
    );

    const violations = collectRuntimePinViolations(root);

    assert.equal(
      violations.some((violation) =>
        violation.includes("scripts/dev/setup-docs-linting.sh:1 npm install commands must run after"),
      ),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("docs/developer/GETTING_STARTED.md")),
      false,
    );
  });
});

test("npm latest-stable check compares direct pins to registry versions", async () => {
  await withFixtureAsync(async (root) => {
    writeMinimalNpmFixture(root);

    const violations = await collectNpmLatestStableViolations(root, {
      fetchImpl: async (url) => ({
        ok: true,
        json: async () => ({
          versions: String(url).endsWith("react")
            ? { "1.2.3": {}, "1.3.0": {}, "2.0.0-beta.1": {} }
            : String(url).endsWith("npm")
              ? { "11.17.0": {}, "12.0.0-beta.1": {} }
              : { "8.0.16": {}, "9.0.0-beta.1": {} },
        }),
      }),
    });

    assert.deepEqual(violations, [
      "package.json react is pinned to 1.2.3; latest stable npm version is 1.3.0",
    ]);
  });
});

test("runtime latest-stable check compares tool pins to upstream versions", async () => {
  await withFixtureAsync(async (root) => {
    writeMinimalRuntimeFixture(root);

    const violations = await collectRuntimeLatestStableViolations(root, {
      fetchImpl: async (url) => {
        if (String(url).includes("nodejs.org/dist/index.json")) {
          return {
            ok: true,
            json: async () => [
              { version: "v26.3.0", lts: false },
              { version: "v24.18.0", lts: "Krypton" },
              { version: "v24.17.0", lts: "Krypton" },
            ],
          };
        }

        if (String(url).includes("channel-rust-stable.toml")) {
          return {
            ok: true,
            text: async () => '[pkg.rust]\nversion = "1.97.0 (abcdef 2026-06-01)"\n',
          };
        }

        return {
          ok: true,
          json: async () => ({
            versions: String(url).endsWith("cargo-deny")
              ? [{ num: "0.19.9" }, { num: "0.20.0" }]
              : [{ num: "0.35.4" }, { num: "1.0.0-beta.1" }],
          }),
        };
      },
    });

    assert.deepEqual(violations, [
      ".nvmrc is pinned to 24.17.0; latest stable Node.js LTS version is 24.18.0",
      "rust-toolchain.toml is pinned to 1.96.0; latest stable Rust version is 1.97.0",
      ".github/workflows/ci.yml:10 cargo install cargo-deny is pinned to 0.19.9; latest stable crates.io version is 0.20.0",
    ]);
  });
});
