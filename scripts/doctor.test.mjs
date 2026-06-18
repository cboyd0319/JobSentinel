import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  compareVersions,
  formatDoctorResults,
  parseVersion,
  platformBin,
  runDoctor,
  summarizeDoctorResults,
} from "./doctor.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withDoctorFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-doctor-"));

  try {
    writeFixtureFile(root, ".nvmrc", "24.17.0\n");
    writeFixtureFile(root, "rust-toolchain.toml", 'channel = "1.96.0"\n');
    writeFixtureFile(root, "package.json", '{"packageManager":"npm@11.17.0"}');
    writeFixtureFile(root, "package-lock.json", "{}");
    writeFixtureFile(root, "node_modules/.bin/tauri", "");
    writeFixtureFile(root, "node_modules/@playwright/test/package.json", "{}");
    writeFixtureFile(root, "src-tauri/Cargo.lock", "");
    writeFixtureFile(root, "src-tauri/.sqlx/query.json", "{}");
    writeFixtureFile(root, "src-tauri/.cargo/config.toml", 'SQLX_OFFLINE = "true"');
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function createMockExec(options = {}) {
  const installedPkgConfigPackages = new Set(
    options.installedPkgConfigPackages ?? [
      "webkit2gtk-4.1",
      "gtk+-3.0",
      "ayatana-appindicator3-0.1",
      "librsvg-2.0",
    ],
  );

  return (command, args) => {
    const [firstArg, secondArg] = args;

    if (command === "npm" || command === "npm.cmd") {
      return "10.0.0";
    }

    if (command === "cargo") {
      if (firstArg === "--version") {
        return "cargo 1.96.0";
      }

      if (firstArg === "fmt") {
        return "rustfmt 1.96.0";
      }

      if (firstArg === "clippy") {
        return "clippy 0.1.96";
      }
    }

    if (command === "rustc") {
      return options.rustcOutput ?? "rustc 1.96.0";
    }

    if (command === "pkg-config") {
      if (firstArg === "--version") {
        return "1.9.5";
      }

      if (firstArg === "--exists" && installedPkgConfigPackages.has(secondArg)) {
        return "";
      }

      throw new Error(`missing ${secondArg}`);
    }

    if (command === "patchelf") {
      return "patchelf 0.18.0";
    }

    if (command === "sh" && firstArg === "-c" && secondArg.includes("libfuse.so.2")) {
      if (options.hasLibfuse === false) {
        throw new Error("missing libfuse.so.2");
      }

      return "";
    }

    if (command === process.execPath) {
      if (options.playwrightFails) {
        throw new Error("chromium missing");
      }

      return "";
    }

    throw new Error(`unexpected command: ${command} ${args.join(" ")}`);
  };
}

test("parseVersion reads semver-like command output", () => {
  assert.deepEqual(parseVersion("rustc 1.91.1 (ed61e7d7e 2026-01-17)"), [
    1,
    91,
    1,
  ]);
  assert.deepEqual(parseVersion("v22.21.1"), [22, 21, 1]);
});

test("compareVersions compares major, minor, and patch values", () => {
  assert.equal(compareVersions("20.0.0", "20.0.0"), 0);
  assert.equal(compareVersions("20.1.0", "20.0.9"), 1);
  assert.equal(compareVersions("19.9.9", "20.0.0"), -1);
});

test("platformBin resolves npm command on Windows", () => {
  assert.equal(platformBin("npm", "win32"), "npm.cmd");
  assert.equal(platformBin("cargo", "win32"), "cargo");
  assert.equal(platformBin("npm", "darwin"), "npm");
});

test("summarizeDoctorResults fails only for failures", () => {
  assert.deepEqual(
    summarizeDoctorResults([
      { status: "pass", label: "A", detail: "ok" },
      { status: "warn", label: "B", detail: "check" },
    ]),
    { failureCount: 0, warningCount: 1, exitCode: 0 },
  );

  assert.deepEqual(
    summarizeDoctorResults([{ status: "fail", label: "A", detail: "missing" }]),
    { failureCount: 1, warningCount: 0, exitCode: 1 },
  );
});

test("formatDoctorResults prints actionable status lines", () => {
  const output = formatDoctorResults([
    { status: "pass", label: "Node.js runtime", detail: "v22.21.1" },
    {
      status: "fail",
      label: "npm dependencies",
      detail: "Run node scripts/install-pinned-npm.mjs, then npm ci --ignore-scripts",
    },
  ]);

  assert.match(output, /PASS Node\.js runtime: v22\.21\.1/);
  assert.match(
    output,
    /FAIL npm dependencies: Run node scripts\/install-pinned-npm\.mjs, then npm ci --ignore-scripts/,
  );
  assert.match(output, /Environment not ready: 1 failure\(s\), 0 warning\(s\)\./);
});

test("runDoctor checks Linux Tauri system packages through pkg-config", () => {
  withDoctorFixture((root) => {
    const results = runDoctor({
      root,
      platform: "linux",
      nodeVersion: "v24.17.0",
      execFileSync: createMockExec({
        installedPkgConfigPackages: ["gtk+-3.0", "ayatana-appindicator3-0.1", "librsvg-2.0"],
      }),
    });

    assert.ok(
      results.some(
        (result) =>
          result.status === "fail" &&
          result.label === "Linux WebKitGTK dev package" &&
          result.detail.includes("libwebkit2gtk-4.1-dev"),
      ),
      formatDoctorResults(results),
    );
  });
});

test("runDoctor checks Linux AppImage FUSE compatibility", () => {
  withDoctorFixture((root) => {
    const results = runDoctor({
      root,
      platform: "linux",
      nodeVersion: "v24.17.0",
      execFileSync: createMockExec({ hasLibfuse: false }),
    });

    assert.ok(
      results.some(
        (result) =>
          result.status === "fail" &&
          result.label === "Linux AppImage FUSE compatibility" &&
          result.detail.includes("libfuse2t64"),
      ),
      formatDoctorResults(results),
    );
  });
});

test("runDoctor warns on Playwright readiness by default", () => {
  withDoctorFixture((root) => {
    const results = runDoctor({
      root,
      platform: "darwin",
      nodeVersion: "v24.17.0",
      execFileSync: createMockExec({ playwrightFails: true }),
    });

    assert.ok(
      results.some(
        (result) => result.status === "warn" && result.label === "Playwright Chromium launch",
      ),
      formatDoctorResults(results),
    );
    assert.equal(summarizeDoctorResults(results).exitCode, 0);
  });
});

test("runDoctor can make Playwright readiness a strict E2E gate", () => {
  withDoctorFixture((root) => {
    const results = runDoctor({
      root,
      platform: "darwin",
      nodeVersion: "v24.17.0",
      strictPlaywright: true,
      execFileSync: createMockExec({ playwrightFails: true }),
    });

    assert.ok(
      results.some(
        (result) => result.status === "fail" && result.label === "Playwright Chromium launch",
      ),
      formatDoctorResults(results),
    );
    assert.equal(summarizeDoctorResults(results).exitCode, 1);
  });
});

test("runDoctor warns on toolchain baseline drift", () => {
  withDoctorFixture((root) => {
    const results = runDoctor({
      root,
      platform: "darwin",
      nodeVersion: "v26.3.0",
      execFileSync: createMockExec({ rustcOutput: "rustc 1.97.0-nightly" }),
    });

    assert.ok(
      results.some(
        (result) => result.status === "warn" && result.label === "Node.js release baseline",
      ),
      formatDoctorResults(results),
    );
    assert.ok(
      results.some((result) => result.status === "warn" && result.label === "Rust release baseline"),
      formatDoctorResults(results),
    );
  });
});

test("runDoctor warns when local npm differs from the package-manager pin", () => {
  withDoctorFixture((root) => {
    const results = runDoctor({
      root,
      platform: "darwin",
      nodeVersion: "v24.17.0",
      execFileSync: createMockExec(),
    });

    assert.ok(
      results.some(
        (result) =>
          result.status === "warn" &&
          result.label === "npm package-manager baseline" &&
          result.detail.includes("package.json pins npm 11.17.0"),
      ),
      formatDoctorResults(results),
    );
    assert.equal(summarizeDoctorResults(results).exitCode, 0);
  });
});

test("runDoctor checks local runtime pin files", () => {
  withDoctorFixture((root) => {
    writeFixtureFile(root, ".nvmrc", "26\n");
    writeFixtureFile(root, "rust-toolchain.toml", 'channel = "nightly"\n');

    const results = runDoctor({
      root,
      platform: "darwin",
      nodeVersion: "v24.17.0",
      execFileSync: createMockExec(),
    });

    assert.ok(
      results.some((result) => result.status === "fail" && result.label === "Node version file"),
      formatDoctorResults(results),
    );
    assert.ok(
      results.some((result) => result.status === "fail" && result.label === "Rust toolchain file"),
      formatDoctorResults(results),
    );
  });
});
