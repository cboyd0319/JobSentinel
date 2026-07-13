import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

export function readFixtureFile(root, path) {
  return readFileSync(join(root, path), "utf8");
}

export function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dependency-pins-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export async function withFixtureAsync(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dependency-pins-"));

  try {
    await callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export function writeMinimalNpmFixture(root, version = "1.2.3") {
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

export function writeMinimalCargoFixture(root, version = "=1.0.228") {
  writeFixtureFile(
    root,
    "Cargo.toml",
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
    "Cargo.lock",
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

export function writeMinimalRuntimeFixture(root, options = {}) {
  const nodeVersion = options.nodeVersion ?? "24.17.0";
  const rustVersion = options.rustVersion ?? "1.96.0";
  const cargoDenyVersion = options.cargoDenyVersion ?? "0.19.9";

  writeFixtureFile(root, "package.json", JSON.stringify({ packageManager: "npm@11.17.0" }));
  writeFixtureFile(root, "scripts/install-pinned-npm.mjs", "");
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
      "      - run: node scripts/install-pinned-npm.mjs",
      "      - run: npm ci --ignore-scripts --prefer-offline --no-audit --no-fund",
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
