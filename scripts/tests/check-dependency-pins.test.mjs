import assert from "node:assert/strict";
import test from "node:test";
import {
  collectCargoDependencySpecs,
  collectCargoPinViolations,
  collectNpmLatestStableViolations,
  collectNpmPinViolations,
  collectRuntimeLatestStableViolations,
  collectRuntimePinViolations,
  collectTauriLinuxDebDependencyViolations,
  compareStableSemver,
  highestStableVersion,
  parseStableSemver,
} from "../checks/dependency-pins.mjs";
import {
  readFixtureFile,
  withFixture,
  withFixtureAsync,
  writeFixtureFile,
  writeMinimalCargoFixture,
  writeMinimalNpmFixture,
  writeMinimalRuntimeFixture,
} from "./dependency-pins-test-fixtures.mjs";

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

test("npm pin check rejects untrusted lockfile tarball metadata", () => {
  withFixture((root) => {
    writeMinimalNpmFixture(root);
    const packageLock = JSON.parse(readFixtureFile(root, "package-lock.json"));
    packageLock.packages["node_modules/react"].resolved =
      "https://evil.example.invalid/react-1.2.3.tgz";
    packageLock.packages["node_modules/vite"].resolved =
      "https://registry.npmjs.org/vite/-/vite-8.0.16.tgz";
    writeFixtureFile(root, "package-lock.json", JSON.stringify(packageLock));

    const violations = collectNpmPinViolations(root);

    assert.equal(
      violations.some((violation) =>
        violation.includes("node_modules/react resolved URL must use https://registry.npmjs.org/"),
      ),
      true,
    );
    assert.equal(
      violations.some((violation) =>
        violation.includes("node_modules/vite must include an integrity hash"),
      ),
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
      "Cargo.lock",
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

test("runtime pin check rejects npm commands before pinned npm activation", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root);
    writeFixtureFile(
      root,
      ".github/workflows/ci.yml",
      [
        "jobs:",
        "  test:",
        "    steps:",
        "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
        '        with: { node-version: "24.17.0" }',
        "      - run: npm ci --ignore-scripts --prefer-offline --no-audit --no-fund",
      ].join("\n"),
    );

    const violations = collectRuntimePinViolations(root);

    assert.equal(
      violations.some((violation) =>
        violation.includes("npm commands after setup-node must first run `node scripts/install-pinned-npm.mjs`"),
      ),
      true,
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

test("runtime pin check rejects local npm installs without pinned npm activation", () => {
  withFixture((root) => {
    writeMinimalRuntimeFixture(root);
    writeFixtureFile(root, "scripts/setup-docs-linting.sh", "npm ci\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      ["node scripts/install-pinned-npm.mjs", "npm ci --ignore-scripts"].join("\n"),
    );

    const violations = collectRuntimePinViolations(root);

    assert.equal(
      violations.some((violation) =>
        violation.includes("scripts/setup-docs-linting.sh:1 npm install commands must run after"),
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
