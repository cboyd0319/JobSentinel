import assert from "node:assert/strict";
import test from "node:test";
import {
  compareVersions,
  formatDoctorResults,
  parseVersion,
  platformBin,
  summarizeDoctorResults,
} from "./doctor.mjs";

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
    { status: "fail", label: "npm dependencies", detail: "Run npm ci" },
  ]);

  assert.match(output, /PASS Node\.js runtime: v22\.21\.1/);
  assert.match(output, /FAIL npm dependencies: Run npm ci/);
  assert.match(output, /Environment not ready: 1 failure\(s\), 0 warning\(s\)\./);
});
