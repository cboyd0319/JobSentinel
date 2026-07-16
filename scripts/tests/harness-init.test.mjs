import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { initializationSteps, npmCommand, parseInitArgs, runInitialization } from "../harness-init.mjs";

test("native init arguments keep mutation explicit", () => {
  assert.deepEqual(parseInitArgs([]), { install: true, offline: false, runStart: false });
  assert.deepEqual(parseInitArgs(["--skip-install"]), { install: false, offline: false, runStart: false });
  assert.deepEqual(parseInitArgs(["--offline"]), { install: true, offline: true, runStart: false });
  assert.deepEqual(parseInitArgs(["--run-start"]), { install: true, offline: false, runStart: true });
  assert.throws(() => parseInitArgs(["--unknown"]), /Unknown option/);
});

test("initializer synchronizes only project dependencies and runs baseline checks", () => {
  const steps = initializationSteps({ install: true, platform: "linux" });
  assert.deepEqual(steps[0], { command: "npm", args: ["--version"] });
  assert.deepEqual(steps[1], { command: process.execPath, args: ["scripts/doctor.mjs", "--preflight"] });
  assert.deepEqual(steps[2], {
    command: "npm",
    args: ["ci", "--ignore-scripts", "--prefer-offline", "--no-audit", "--no-fund"],
  });
  assert.deepEqual(steps.slice(3).map((step) => step.args.join(" ")), [
    "scripts/doctor.mjs",
    "run harness:check",
    "run test:smoke",
  ]);
  assert.equal(steps.flatMap((step) => step.args).includes("--global"), false);
});

test("PowerShell uses the Windows npm executable and skip-install is read-only", () => {
  assert.equal(npmCommand("win32"), "npm.cmd");
  assert.equal(initializationSteps({ install: false, platform: "win32" }).some((step) => step.args.includes("ci")), false);
});

test("offline initialization prohibits npm network fallback", () => {
  assert.deepEqual(initializationSteps({ install: true, offline: true, platform: "darwin" })[2].args, [
    "ci", "--ignore-scripts", "--offline", "--no-audit", "--no-fund",
  ]);
});

test("clean and warm initialization are repeatable from a path with spaces", () => {
  const root = mkdtempSync(join(tmpdir(), "Job Sentinel init "));
  try {
    writeFileSync(join(root, "package.json"), '{"name":"jobsentinel"}\n');
    mkdirSync(join(root, "scripts"));
    const calls = [];
    const options = {
      env: {},
      log() {},
      platform: "darwin",
      spawnSync(command, args, runOptions) {
        calls.push({ command, args, cwd: runOptions.cwd, shell: runOptions.shell });
        return { status: 0 };
      },
      stdio: "ignore",
    };
    runInitialization(root, options);
    runInitialization(root, options);
    assert.equal(calls.length, 12);
    assert.ok(calls.every((call) => call.cwd === root && call.shell === false));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing prerequisites fail with exact remediation", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-init-missing-"));
  try {
    writeFileSync(join(root, "package.json"), '{"name":"jobsentinel"}\n');
    assert.throws(() => runInitialization(root, {
      env: {},
      log() {},
      spawnSync: () => ({ error: new Error("ENOENT"), status: null }),
      stdio: "ignore",
    }), /unavailable or could not start.*Install the repository-owned prerequisite/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
