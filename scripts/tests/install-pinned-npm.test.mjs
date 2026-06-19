import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  installPinnedNpm,
  npmExecutable,
  npmInvocation,
  parsePinnedNpmVersion,
} from "../install-pinned-npm.mjs";

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-pinned-npm-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writePackageJson(root, packageManager = "npm@11.17.0") {
  writeFileSync(join(root, "package.json"), JSON.stringify({ packageManager }), "utf8");
}

test("parsePinnedNpmVersion accepts exact npm package-manager pins", () => {
  assert.equal(parsePinnedNpmVersion('{"packageManager":"npm@11.17.0"}'), "11.17.0");
  assert.equal(parsePinnedNpmVersion('{"packageManager":"npm@^11.17.0"}'), null);
  assert.equal(parsePinnedNpmVersion('{"packageManager":"pnpm@10.0.0"}'), null);
});

test("npmExecutable resolves the Windows npm command", () => {
  assert.equal(npmExecutable("win32"), "npm.cmd");
  assert.equal(npmExecutable("darwin"), "npm");
});

test("npmInvocation routes Windows npm through cmd", () => {
  assert.deepEqual(npmInvocation(["--version"], "darwin"), {
    command: "npm",
    args: ["--version"],
  });
  assert.deepEqual(
    npmInvocation(["--version"], "win32", { ComSpec: "C:\\Windows\\System32\\cmd.exe" }),
    {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd", "--version"],
    },
  );
  assert.deepEqual(npmInvocation(["--version"], "win32", {}), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd", "--version"],
  });
});

test("installPinnedNpm skips install when pinned npm is active", () => {
  withFixture((root) => {
    writePackageJson(root);
    const calls = [];
    const result = installPinnedNpm({
      root,
      platform: "darwin",
      execFileSync: (command, args) => {
        calls.push([command, args]);
        return "11.17.0\n";
      },
    });

    assert.deepEqual(result, {
      changed: false,
      currentVersion: "11.17.0",
      pinnedVersion: "11.17.0",
    });
    assert.deepEqual(calls, [["npm", ["--version"]]]);
  });
});

test("installPinnedNpm uses Windows-safe npm invocation", () => {
  withFixture((root) => {
    writePackageJson(root);
    const calls = [];
    const result = installPinnedNpm({
      root,
      platform: "win32",
      env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
      execFileSync: (command, args) => {
        calls.push([command, args]);
        return "11.17.0\n";
      },
    });

    assert.deepEqual(result, {
      changed: false,
      currentVersion: "11.17.0",
      pinnedVersion: "11.17.0",
    });
    assert.deepEqual(calls, [
      [
        "C:\\Windows\\System32\\cmd.exe",
        ["/d", "/s", "/c", "npm.cmd", "--version"],
      ],
    ]);
  });
});

test("installPinnedNpm installs the exact pinned npm version when needed", () => {
  withFixture((root) => {
    writePackageJson(root);
    const calls = [];
    const result = installPinnedNpm({
      root,
      platform: "darwin",
      execFileSync: (command, args) => {
        calls.push([command, args]);
        return "11.16.0\n";
      },
    });

    assert.deepEqual(result, {
      changed: true,
      currentVersion: "11.16.0",
      pinnedVersion: "11.17.0",
    });
    assert.deepEqual(calls, [
      ["npm", ["--version"]],
      ["npm", ["install", "--global", "npm@11.17.0", "--no-audit", "--no-fund"]],
    ]);
  });
});

test("installPinnedNpm installs pinned npm through cmd on Windows", () => {
  withFixture((root) => {
    writePackageJson(root);
    const calls = [];
    const result = installPinnedNpm({
      root,
      platform: "win32",
      env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
      execFileSync: (command, args) => {
        calls.push([command, args]);
        return calls.length === 1 ? "11.16.0\n" : "";
      },
    });

    assert.deepEqual(result, {
      changed: true,
      currentVersion: "11.16.0",
      pinnedVersion: "11.17.0",
    });
    assert.deepEqual(calls, [
      [
        "C:\\Windows\\System32\\cmd.exe",
        ["/d", "/s", "/c", "npm.cmd", "--version"],
      ],
      [
        "C:\\Windows\\System32\\cmd.exe",
        [
          "/d",
          "/s",
          "/c",
          "npm.cmd",
          "install",
          "--global",
          "npm@11.17.0",
          "--no-audit",
          "--no-fund",
        ],
      ],
    ]);
  });
});

test("installPinnedNpm rejects missing exact package-manager pins", () => {
  withFixture((root) => {
    mkdirSync(root, { recursive: true });
    writePackageJson(root, "npm@^11.17.0");

    assert.throws(
      () =>
        installPinnedNpm({
          root,
          execFileSync: () => "11.17.0\n",
        }),
      /packageManager must be an exact npm@x\.y\.z pin/,
    );
  });
});
