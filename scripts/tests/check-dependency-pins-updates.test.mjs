import assert from "node:assert/strict";
import test from "node:test";
import {
  collectCargoCompatibleUpdateViolations,
  collectCargoLatestStableViolations,
  collectNpmCompatibleOutdatedViolations,
  collectNpmCompatibleUpdateViolations,
  collectNpmLatestStableViolations,
} from "../checks/dependency-pins.mjs";
import {
  readFixtureFile,
  withFixtureAsync,
  writeFixtureFile,
  writeMinimalCargoFixture,
  writeMinimalNpmFixture,
} from "./dependency-pins-test-fixtures.mjs";

test("npm latest-stable check compares package manager pin to registry version", async () => {
  await withFixtureAsync(async (root) => {
    writeMinimalNpmFixture(root);

    const violations = await collectNpmLatestStableViolations(root, {
      fetchImpl: async (url) => ({
        ok: true,
        json: async () => ({
          versions: String(url).endsWith("npm")
            ? { "11.17.0": {}, "11.18.0": {} }
            : String(url).endsWith("react")
              ? { "1.2.3": {} }
              : { "8.0.16": {} },
        }),
      }),
    });

    assert.deepEqual(violations, [
      "package.json packageManager npm is pinned to 11.17.0; latest stable npm version is 11.18.0",
    ]);
  });
});

test("npm latest-stable check compares override pins to registry versions", async () => {
  await withFixtureAsync(async (root) => {
    writeMinimalNpmFixture(root);
    const packageJson = JSON.parse(readFixtureFile(root, "package.json"));
    packageJson.overrides = {
      "@testing-library/jest-dom": {
        "aria-query": "5.3.2",
      },
    };
    writeFixtureFile(root, "package.json", JSON.stringify(packageJson));

    const violations = await collectNpmLatestStableViolations(root, {
      fetchImpl: async (url) => ({
        ok: true,
        json: async () => ({
          versions: String(url).endsWith("npm")
            ? { "11.17.0": {} }
            : String(url).endsWith("react")
              ? { "1.2.3": {} }
              : String(url).endsWith("aria-query")
                ? { "5.3.2": {}, "5.3.3": {} }
                : { "8.0.16": {} },
        }),
      }),
    });

    assert.deepEqual(violations, [
      "package.json overrides.@testing-library/jest-dom.aria-query is pinned to 5.3.2; latest stable npm version is 5.3.3",
    ]);
  });
});

test("npm latest-stable check accepts an upstream-constrained TypeScript pin", async () => {
  await withFixtureAsync(async (root) => {
    const packageJson = {
      packageManager: "npm@12.0.1",
      devDependencies: {
        typescript: "6.0.3",
        "typescript-eslint": "8.64.0",
      },
    };
    writeFixtureFile(root, "package.json", JSON.stringify(packageJson));

    const violations = await collectNpmLatestStableViolations(root, {
      fetchImpl: async (url) => {
        const name = decodeURIComponent(String(url).split("/").pop());
        const versions =
          name === "typescript"
            ? { "6.0.3": {}, "7.0.2": {} }
            : name === "typescript-eslint"
              ? {
                  "8.64.0": {
                    peerDependencies: { typescript: ">=4.8.4 <6.1.0" },
                  },
                }
              : { "12.0.1": {} };
        return { ok: true, json: async () => ({ versions }) };
      },
    });

    assert.deepEqual(violations, []);
  });
});

test("Cargo latest-stable check compares exact pins to crates.io versions", async () => {
  await withFixtureAsync(async (root) => {
    writeMinimalCargoFixture(root, "=1.0.0");

    const violations = await collectCargoLatestStableViolations(root, {
      fetchImpl: async (url) => ({
        ok: true,
        json: async () => ({
          versions: String(url).endsWith("serde")
            ? [{ num: "1.0.0" }, { num: "1.0.1" }, { num: "2.0.0-beta.1" }]
            : [{ num: "1.0.0" }, { num: "1.0.1", yanked: true }],
        }),
      }),
    });

    assert.deepEqual(violations, [
      "Cargo.toml serde is pinned to 1.0.0; latest stable crates.io version is 1.0.1",
    ]);
  });
});

test("Cargo latest-stable check skips versioned local workspace dependencies", async () => {
  await withFixtureAsync(async (root) => {
    writeFixtureFile(
      root,
      "Cargo.toml",
      [
        "[workspace]",
        'members = ["crates/example-core"]',
        "",
        "[workspace.dependencies]",
        'example-core = { path = "crates/example-core", version = "=2.9.5" }',
      ].join("\n"),
    );
    const requests = [];

    const violations = await collectCargoLatestStableViolations(root, {
      fetchImpl: async (url) => {
        requests.push(String(url));
        throw new Error("local dependencies must not be queried");
      },
    });

    assert.deepEqual(violations, []);
    assert.deepEqual(requests, []);
  });
});

test("Cargo latest-stable check accepts SQLx-constrained SQLCipher bridge", async () => {
  await withFixtureAsync(async (root) => {
    writeFixtureFile(
      root,
      "Cargo.toml",
      [
        "[workspace]",
        'members = ["crates/example"]',
        "",
        "[workspace.dependencies]",
        'sqlx = { version = "=0.9.0", default-features = false, features = ["sqlite"] }',
        'libsqlite3-sys = { version = "=0.37.0", default-features = false, features = ["bundled-sqlcipher-vendored-openssl"] }',
      ].join("\n"),
    );

    const violations = await collectCargoLatestStableViolations(root, {
      fetchImpl: async (url) => ({
        ok: true,
        json: async () => ({
          versions: String(url).endsWith("libsqlite3-sys")
            ? [{ num: "0.37.0" }, { num: "0.38.1" }]
            : [{ num: "0.9.0" }, { num: "0.10.0-alpha.1" }],
        }),
      }),
    });

    assert.deepEqual(violations, []);
  });
});

test("Cargo latest-stable check rejects SQLCipher bridge exception drift", async () => {
  await withFixtureAsync(async (root) => {
    writeFixtureFile(
      root,
      "Cargo.toml",
      [
        "[workspace]",
        'members = ["crates/example"]',
        "",
        "[workspace.dependencies]",
        'sqlx = { version = "=0.9.0", default-features = false, features = ["sqlite"] }',
        'libsqlite3-sys = { version = "=0.37.0", default-features = false, features = ["bundled"] }',
      ].join("\n"),
    );

    const violations = await collectCargoLatestStableViolations(root, {
      fetchImpl: async (url) => ({
        ok: true,
        json: async () => ({
          versions: String(url).endsWith("libsqlite3-sys")
            ? [{ num: "0.37.0" }, { num: "0.38.1" }]
            : [{ num: "0.9.0" }],
        }),
      }),
    });

    assert.deepEqual(violations, [
      "Cargo.toml libsqlite3-sys is pinned to 0.37.0; latest stable crates.io version is 0.38.1",
    ]);
  });
});

test("Cargo compatible update check ignores index refresh and reports package updates", () => {
  const violations = collectCargoCompatibleUpdateViolations("/tmp/jobsentinel-fixture", {
    spawn: () => ({
      status: 0,
      stdout: "",
      stderr: [
        "Updating crates.io index",
        "Updating serde v1.0.227 -> v1.0.228",
      ].join("\n"),
    }),
  });

  assert.deepEqual(violations, [
    "Cargo.lock has a compatible update pending: Updating serde v1.0.227 -> v1.0.228",
  ]);
});

test("npm compatible update check accepts up-to-date lockfiles", () => {
  const calls = [];
  const violations = collectNpmCompatibleUpdateViolations("/tmp/jobsentinel-fixture", {
    platform: "win32",
    env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
    spawn: (command, args) => {
      calls.push([command, args]);
      return {
        status: 0,
        stdout: "up to date in 1s\n",
        stderr: "",
      };
    },
  });

  assert.deepEqual(violations, []);
  assert.deepEqual(calls, [
    [
      "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/s", "/c", "npm.cmd", "update", "--package-lock-only", "--dry-run", "--ignore-scripts"],
    ],
  ]);
});

test("npm compatible update check reports package-lock dry-run changes", () => {
  const violations = collectNpmCompatibleUpdateViolations("/tmp/jobsentinel-fixture", {
    spawn: () => ({
      status: 0,
      stdout: "changed 3 packages in 1s\n",
      stderr: "",
    }),
  });

  assert.deepEqual(violations, [
    "package-lock.json has compatible updates pending: changed 3 packages in 1s",
  ]);
});

test("npm compatible outdated check reports current-vs-wanted transitive drift", () => {
  const calls = [];
  const violations = collectNpmCompatibleOutdatedViolations("/tmp/jobsentinel-fixture", {
    platform: "win32",
    env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
    spawn: (command, args) => {
      calls.push([command, args]);
      return {
        status: 1,
        stdout: JSON.stringify({
          "aria-query": {
            current: "5.3.0",
            wanted: "5.3.2",
            latest: "5.3.2",
            dependent: "@testing-library/jest-dom",
          },
          "major-only": {
            current: "1.0.0",
            wanted: "1.0.0",
            latest: "2.0.0",
            dependent: "example",
          },
        }),
        stderr: "",
      };
    },
  });

  assert.deepEqual(violations, [
    "package-lock.json has compatible npm transitive drift for @testing-library/jest-dom: aria-query is 5.3.0; wanted 5.3.2",
  ]);
  assert.deepEqual(calls, [
    ["C:\\Windows\\System32\\cmd.exe", ["/d", "/s", "/c", "npm.cmd", "outdated", "--all", "--json"]],
  ]);
});

test("npm compatible outdated check accepts constrained TypeScript peer drift", async () => {
  await withFixtureAsync(async (root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify({
        devDependencies: {
          typescript: "6.0.3",
          "typescript-eslint": "8.64.0",
        },
      }),
    );
    writeFixtureFile(
      root,
      "package-lock.json",
      JSON.stringify({
        packages: {
          "node_modules/typescript-eslint": {
            version: "8.64.0",
            peerDependencies: { typescript: ">=4.8.4 <6.1.0" },
          },
        },
      }),
    );

    const violations = collectNpmCompatibleOutdatedViolations(root, {
      spawn: () => ({
        status: 1,
        stdout: JSON.stringify({
          typescript: {
            current: "6.0.3",
            wanted: "7.0.2",
            dependent: "@storybook/react",
          },
        }),
        stderr: "",
      }),
    });

    assert.deepEqual(violations, []);
  });
});
