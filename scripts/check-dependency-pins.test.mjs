import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  collectCargoDependencySpecs,
  collectCargoCompatibleUpdateViolations,
  collectCargoLatestStableViolations,
  collectCargoPinViolations,
  collectNpmCompatibleOutdatedViolations,
  collectNpmCompatibleUpdateViolations,
  collectNpmLatestStableViolations,
  collectNpmPinViolations,
  collectRuntimeLatestStableViolations,
  collectRuntimePinViolations,
  collectTauriLinuxDebDependencyViolations,
  compareStableSemver,
  highestStableVersion,
  parseStableSemver,
} from "./check-dependency-pins.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function readFixtureFile(root, path) {
  return readFileSync(join(root, path), "utf8");
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
      packageManager: "npm@11.17.0",
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

function writeMinimalRuntimeFixture(root, options = {}) {
  const nodeVersion = options.nodeVersion ?? "24.16.0";
  const rustVersion = options.rustVersion ?? "1.96.0";
  const cargoDenyVersion = options.cargoDenyVersion ?? "0.19.9";

  writeFixtureFile(root, ".nvmrc", `${nodeVersion}\n`);
  writeFixtureFile(
    root,
    "rust-toolchain.toml",
    ['[toolchain]', `channel = "${rustVersion}"`, 'components = ["clippy", "rustfmt"]'].join("\n"),
  );
  writeFixtureFile(
    root,
    ".github/workflows/ci.yml",
    [
      "jobs:",
      "  test:",
      "    steps:",
      "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
      `        with: { node-version: "${options.workflowNodeVersion ?? nodeVersion}" }`,
      "      - uses: dtolnay/rust-toolchain@29eef336d9b2848a0b548edc03f92a220660cdb8 # stable",
      `        with: { toolchain: "${options.workflowRustVersion ?? rustVersion}" }`,
      `      - run: cargo install cargo-deny --version ${cargoDenyVersion} --locked`,
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/developer/TESTING.md",
    "cargo install cargo-tarpaulin --version 0.35.4 --locked\n",
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

test("npm pin check rejects missing or floating package manager pins", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root);
    const packageJson = JSON.parse(
      [
        "{",
        '  "dependencies": { "react": "1.2.3" },',
        '  "devDependencies": { "vite": "8.0.16" }',
        "}",
      ].join("\n"),
    );
    writeFixtureFile(root, "package.json", JSON.stringify(packageJson));

    assert.equal(
      collectNpmPinViolations(root).some((violation) =>
        violation.includes("packageManager must pin npm to an exact stable version"),
      ),
      true,
    );

    packageJson.packageManager = "npm@^11.17.0";
    writeFixtureFile(root, "package.json", JSON.stringify(packageJson));

    assert.equal(
      collectNpmPinViolations(root).some((violation) =>
        violation.includes("packageManager must pin npm to an exact stable version"),
      ),
      true,
    );
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

test("npm pin check accepts exact stable overrides present in lockfile", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root);
    const packageJson = JSON.parse(readFixtureFile(root, "package.json"));
    packageJson.overrides = {
      "@testing-library/jest-dom": {
        "aria-query": "5.3.2",
      },
    };
    writeFixtureFile(root, "package.json", JSON.stringify(packageJson));

    const packageLock = JSON.parse(readFixtureFile(root, "package-lock.json"));
    packageLock.packages["node_modules/@testing-library/jest-dom/node_modules/aria-query"] = {
      version: "5.3.2",
    };
    writeFixtureFile(root, "package-lock.json", JSON.stringify(packageLock));

    assert.deepEqual(collectNpmPinViolations(root), []);
  });
});

test("npm pin check rejects override ranges and missing lockfile entries", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root);
    const packageJson = JSON.parse(readFixtureFile(root, "package.json"));
    packageJson.overrides = {
      "@testing-library/jest-dom": {
        "aria-query": "^5.3.2",
      },
      "@reduxjs/toolkit": {
        reselect: "5.2.0",
      },
    };
    writeFixtureFile(root, "package.json", JSON.stringify(packageJson));

    const violations = collectNpmPinViolations(root);

    assert.equal(
      violations.some((violation) =>
        violation.includes("package.json overrides.@testing-library/jest-dom.aria-query must use an exact stable override version"),
      ),
      true,
    );
    assert.equal(
      violations.some((violation) =>
        violation.includes("package-lock.json must contain override reselect 5.2.0"),
      ),
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

test("runtime pin check accepts exact Node, Rust, workflow, and cargo install pins", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root);
    writeFixtureFile(
      root,
      ".github/workflows/linux.yml",
      [
        "jobs:",
        "  linux:",
        "    runs-on: ubuntu-24.04",
        "    steps:",
        "      - run: |",
        "          sudo apt-get update",
        "          sudo apt-get install -y \\",
        "            libwebkit2gtk-4.1-dev=2.52.3-0ubuntu0.24.04.1 \\",
        "            libgtk-3-dev=3.24.41-4ubuntu1.1",
      ].join("\n"),
    );

    assert.deepEqual(collectRuntimePinViolations(root), []);
  });
});

test("runtime pin check accepts Tauri v2 Linux Debian runtime dependencies", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/tauri.conf.json",
      JSON.stringify({
        bundle: {
          linux: {
            deb: {
              depends: ["libwebkit2gtk-4.1-0", "libgtk-3-0", "libappindicator3-1"],
            },
          },
        },
      }),
    );

    assert.deepEqual(collectTauriLinuxDebDependencyViolations(root), []);
  });
});

test("runtime pin check rejects stale Tauri v1 Linux WebKit dependency", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/tauri.conf.json",
      JSON.stringify({
        bundle: {
          linux: {
            deb: {
              depends: ["libwebkit2gtk-4.0-37", "libgtk-3-0", "libappindicator3-1"],
            },
          },
        },
      }),
    );

    const violations = collectTauriLinuxDebDependencyViolations(root);

    assert(
      violations.includes(
        "src-tauri/tauri.conf.json must not declare Tauri v1 WebKitGTK runtime dependencies; use libwebkit2gtk-4.1-0 for Tauri v2 Debian packages",
      ),
    );
    assert(
      violations.includes(
        "src-tauri/tauri.conf.json Debian dependencies must include libwebkit2gtk-4.1-0 for Tauri v2 Linux packages",
      ),
    );
  });
});

test("runtime pin check rejects floating workflow and cargo install tool pins", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root, {
      nodeVersion: "24",
      rustVersion: "stable",
      workflowNodeVersion: "24",
      workflowRustVersion: "stable",
      cargoDenyVersion: "0.19",
    });
    writeFixtureFile(
      root,
      "docs/security/README.md",
      "cargo install cargo-audit\ncargo install cargo-geiger --version 0.13.0\n",
    );

    const violations = collectRuntimePinViolations(root);

    assert.equal(
      violations.some((violation) => violation.includes(".nvmrc must pin an exact stable")),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("rust-toolchain.toml channel")),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("node-version must pin an exact stable")),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("Rust toolchain must pin an exact stable")),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("cargo install cargo-deny")),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("cargo install cargo-audit")),
      true,
    );
    assert.equal(
      violations.some(
        (violation) => violation.includes("cargo install cargo-geiger") && violation.includes("--locked"),
      ),
      true,
    );
  });
});

test("runtime pin check rejects floating runner labels and unpinned apt packages", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root);
    writeFixtureFile(
      root,
      ".github/workflows/release.yml",
      [
        "jobs:",
        "  build:",
        "    strategy:",
        "      matrix:",
        "        include:",
        "          - platform: macos-latest",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - run: sudo apt-get install -y libwebkit2gtk-4.1-dev librsvg2-dev=2.58.0+dfsg-1build1",
      ].join("\n"),
    );

    const violations = collectRuntimePinViolations(root);

    assert.equal(
      violations.some((violation) => violation.includes("found macos-latest")),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("found ubuntu-latest")),
      true,
    );
    assert.equal(
      violations.some((violation) =>
        violation.includes("apt-get install package libwebkit2gtk-4.1-dev must include an exact distro version pin"),
      ),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("librsvg2-dev=2.58.0+dfsg-1build1")),
      false,
    );
  });
});

test("runtime pin check rejects install-capable npx commands", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root);
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      "npx playwright test\nnpx --no-install playwright show-report\n",
    );

    const violations = collectRuntimePinViolations(root);

    assert.equal(
      violations.some((violation) =>
        violation.includes("docs/developer/TESTING.md:1 npx-based commands must include --no-install"),
      ),
      true,
    );
    assert.equal(
      violations.some((violation) => violation.includes("docs/developer/TESTING.md:2")),
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
              { version: "v24.17.0", lts: "Krypton" },
              { version: "v24.16.0", lts: "Krypton" },
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
      ".nvmrc is pinned to 24.16.0; latest stable Node.js LTS version is 24.17.0",
      "rust-toolchain.toml is pinned to 1.96.0; latest stable Rust version is 1.97.0",
      ".github/workflows/ci.yml:8 cargo install cargo-deny is pinned to 0.19.9; latest stable crates.io version is 0.20.0",
    ]);
  });
});

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

test("Cargo latest-stable check accepts SQLx-constrained SQLCipher bridge", async () => {
  await withFixtureAsync(async (root) => {
    writeFixtureFile(
      root,
      "src-tauri/Cargo.toml",
      [
        "[package]",
        'name = "jobsentinel"',
        'version = "0.0.0"',
        "",
        "[dependencies]",
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
      "src-tauri/Cargo.toml",
      [
        "[package]",
        'name = "jobsentinel"',
        'version = "0.0.0"',
        "",
        "[dependencies]",
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

test("npm compatible outdated check reports current-vs-wanted transitive drift", () => {
  const violations = collectNpmCompatibleOutdatedViolations("/tmp/jobsentinel-fixture", {
    spawn: () => ({
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
    }),
  });

  assert.deepEqual(violations, [
    "package-lock.json has compatible npm transitive drift for @testing-library/jest-dom: aria-query is 5.3.0; wanted 5.3.2",
  ]);
});
