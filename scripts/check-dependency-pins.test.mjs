import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  collectCargoDependencySpecs,
  collectCargoCompatibleUpdateViolations,
  collectCargoLatestStableViolations,
  collectCargoPinViolations,
  collectNpmCompatibleUpdateViolations,
  collectNpmLatestStableViolations,
  collectNpmPinViolations,
  compareStableSemver,
  highestStableVersion,
  parseStableSemver,
} from "./check-dependency-pins.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dependency-pins-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function withFixtureAsync(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dependency-pins-"));

  try {
    await callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeMinimalNpmFixture(root, version = "1.2.3") {
  writeFixtureFile(
    root,
    "package.json",
    JSON.stringify({
      dependencies: {
        react: version,
      },
      devDependencies: {
        vite: "8.0.16",
      },
    }),
  );
  writeFixtureFile(
    root,
    "package-lock.json",
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": {
          dependencies: {
            react: version,
          },
          devDependencies: {
            vite: "8.0.16",
          },
        },
        "node_modules/react": {
          version,
        },
        "node_modules/vite": {
          version: "8.0.16",
        },
        "node_modules/vite/node_modules/@polka/url": {
          version: "1.0.0-next.29",
        },
        "node_modules/gensync": {
          version: "1.0.0-beta.2",
        },
      },
    }),
  );
}

function writeMinimalCargoFixture(root, version = "=1.0.228") {
  writeFixtureFile(
    root,
    "src-tauri/Cargo.toml",
    [
      "[package]",
      'name = "jobsentinel"',
      'version = "0.0.0"',
      "",
      "[build-dependencies]",
      `tauri-build = { version = "${version}", features = [] }`,
      "",
      "[dependencies]",
      `serde = { version = "${version}", features = ["derive"] }`,
      `regex = "${version}"`,
      "",
      "[target.'cfg(windows)'.dependencies]",
      `windows = { version = "${version}", features = ["Win32_Foundation"] }`,
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "src-tauri/Cargo.lock",
    [
      "[[package]]",
      'name = "serde"',
      `version = "${version.slice(1)}"`,
      "",
      "[[package]]",
      'name = "regex"',
      `version = "${version.slice(1)}"`,
      "",
      "[[package]]",
      'name = "tauri-build"',
      `version = "${version.slice(1)}"`,
      "",
      "[[package]]",
      'name = "windows"',
      `version = "${version.slice(1)}"`,
      "",
    ].join("\n"),
  );
}

test("stable semver helpers reject prereleases and sort stable versions", () => {
  assert.deepEqual(parseStableSemver("1.2.3"), {
    major: 1,
    minor: 2,
    patch: 3,
    raw: "1.2.3",
  });
  assert.equal(parseStableSemver("1.2.3-beta.1"), null);
  assert.equal(compareStableSemver("1.2.4", "1.2.3") > 0, true);
  assert.equal(highestStableVersion(["1.2.3", "2.0.0-beta.1", "1.3.0"]), "1.3.0");
});

test("npm pin check accepts exact package pins and matching lockfile entries", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root);

    assert.deepEqual(collectNpmPinViolations(root), []);
  });
});

test("npm pin check rejects ranges and lockfile drift", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root, "^1.2.3");

    const violations = collectNpmPinViolations(root);

    assert.equal(violations.some((violation) => violation.includes("exact stable version")), true);
  });
});

test("npm pin check rejects unreviewed prerelease lockfile entries", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root);
    const packageLockPath = "package-lock.json";
    const packageLock = JSON.parse(
      [
        "{",
        '  "lockfileVersion": 3,',
        '  "packages": {',
        '    "": { "dependencies": { "react": "1.2.3" }, "devDependencies": { "vite": "8.0.16" } },',
        '    "node_modules/react": { "version": "1.2.3" },',
        '    "node_modules/vite": { "version": "8.0.16" },',
        '    "node_modules/example": { "version": "2.0.0-rc.1" }',
        "  }",
        "}",
      ].join("\n"),
    );
    writeFixtureFile(root, packageLockPath, JSON.stringify(packageLock));

    const violations = collectNpmPinViolations(root);

    assert.equal(
      violations.some((violation) => violation.includes("node_modules/example")),
      true,
    );
  });
});

test("Cargo dependency parser includes normal, build, and target dependencies", () => {
  const specs = collectCargoDependencySpecs(
    [
      "[dependencies]",
      'serde = { version = "=1.0.228", features = ["derive"] }',
      'regex = "=1.12.4"',
      "",
      "[build-dependencies]",
      'tauri-build = { version = "=2.6.2", features = [] }',
      "",
      "[target.'cfg(windows)'.dependencies]",
      'windows = { version = "=0.62.2", features = ["Win32_Foundation"] }',
    ].join("\n"),
  );

  assert.deepEqual(
    specs.map((spec) => [spec.section, spec.name, spec.version]),
    [
      ["dependencies", "serde", "=1.0.228"],
      ["dependencies", "regex", "=1.12.4"],
      ["build-dependencies", "tauri-build", "=2.6.2"],
      ["target.'cfg(windows)'.dependencies", "windows", "=0.62.2"],
    ],
  );
});

test("Cargo pin check accepts exact pins and matching lockfile entries", () => {
  withFixture((root) => {
    writeMinimalCargoFixture(root);

    assert.deepEqual(collectCargoPinViolations(root), []);
  });
});

test("Cargo pin check rejects non-exact pins and lockfile drift", () => {
  withFixture((root) => {
    writeMinimalCargoFixture(root, "1.0.228");

    const violations = collectCargoPinViolations(root);

    assert.equal(
      violations.some((violation) => violation.includes("must use an exact =version pin")),
      true,
    );
  });
});

test("Cargo pin check rejects prerelease lockfile crate versions", () => {
  withFixture((root) => {
    writeMinimalCargoFixture(root);
    writeFixtureFile(
      root,
      "src-tauri/Cargo.lock",
      [
        "[[package]]",
        'name = "serde"',
        'version = "1.0.228"',
        "",
        "[[package]]",
        'name = "unstable-crate"',
        'version = "2.0.0-alpha.1"',
        "",
      ].join("\n"),
    );

    const violations = collectCargoPinViolations(root);

    assert.equal(
      violations.some((violation) => violation.includes("unstable-crate")),
      true,
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
            : { "8.0.16": {}, "9.0.0-beta.1": {} },
        }),
      }),
    });

    assert.deepEqual(violations, [
      "package.json react is pinned to 1.2.3; latest stable npm version is 1.3.0",
    ]);
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
  const violations = collectNpmCompatibleUpdateViolations("/tmp/jobsentinel-fixture", {
    spawn: () => ({
      status: 0,
      stdout: "up to date in 1s\n",
      stderr: "",
    }),
  });

  assert.deepEqual(violations, []);
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
