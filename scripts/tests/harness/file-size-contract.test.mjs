import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  clearFileSizeContractCache,
  collectRepositoryFileSizeReviewCandidates,
  collectRepositoryFileSizeViolations,
} from "../../harness/checks/repo-file-size.mjs";

function writeFixture(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function policy(extra = {}) {
  return {
    schema_version: 1,
    source_limits: {
      counting: "physical_lines_including_blank_and_comment_lines",
      review_lines: 300,
      hard_lines: 500,
      review_bytes: 32768,
      hard_bytes: 65536,
    },
    included_extensions: [".ts"],
    file_size: {
      scopes: [{ id: "source", globs: ["src/**"] }],
    },
    structure: {},
    non_hand_authored_exclusions: [],
    exceptions: [],
    ...extra,
  };
}

function withFixture(callback, policyOverrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-file-size-"));
  try {
    writeFixture(root, "scripts/harness/contracts/repository-structure.json", `${JSON.stringify(policy(policyOverrides), null, 2)}\n`);
    callback(root);
  } finally {
    clearFileSizeContractCache();
    rmSync(root, { recursive: true, force: true });
  }
}

function scan(root, files) {
  return collectRepositoryFileSizeViolations(root, {
    execFileSync: () => `${files.join("\0")}\0`,
  });
}

test("a governed source below both canonical thresholds passes", () => {
  withFixture((root) => {
    writeFixture(root, "src/small.ts", "export const value = 1;\n");
    assert.deepEqual(scan(root, ["src/small.ts"]), []);
  });
});

test("a governed source outside declared scopes fails closed", () => {
  withFixture((root) => {
    writeFixture(root, "other/unowned.ts", "export {};\n");
    assert.deepEqual(scan(root, ["other/unowned.ts"]), [
      "classify source or configuration in scripts/harness/contracts/repository-structure.json: other/unowned.ts",
    ]);
  });
});

test("the canonical 500 physical-line hard ceiling is enforced", () => {
  withFixture((root) => {
    writeFixture(root, "src/large.ts", "x\n".repeat(501));
    assert.match(scan(root, ["src/large.ts"]).join("\n"), /has 501 lines; temporary maximum is 500/);
  });
});

test("physical-line enforcement is identical for CRLF input", () => {
  withFixture((root) => {
    writeFixture(root, "src/crlf.ts", "x\r\n".repeat(501));
    assert.match(scan(root, ["src/crlf.ts"]).join("\n"), /has 501 lines; temporary maximum is 500/);
  });
});

test("the canonical 65536-byte hard ceiling is enforced", () => {
  withFixture((root) => {
    writeFixture(root, "src/wide.ts", "x".repeat(65537));
    assert.match(scan(root, ["src/wide.ts"]).join("\n"), /has 65537 bytes; temporary maximum is 65536/);
  });
});

test("an exact complete temporary exception ratchets but does not waive growth", () => {
  const source = "x\n".repeat(501);
  const exception = {
    path: "src/legacy.ts",
    affected_rules: ["hard_lines"],
    owner: "tests",
    reason: "Measured legacy source awaiting cohesive split.",
    max_lines: 501,
    max_bytes: Buffer.byteLength(source),
    approval_date: "2026-07-14",
    retirement_condition: "Split below both hard ceilings.",
  };
  withFixture((root) => {
    writeFixture(root, "src/legacy.ts", source);
    assert.deepEqual(scan(root, ["src/legacy.ts"]), []);
    writeFixture(root, "src/legacy.ts", `${source}x\n`);
    assert.match(scan(root, ["src/legacy.ts"]).join("\n"), /temporary maximum is 501/);
  }, { exceptions: [exception] });
});

test("exceptions reject globs and missing canonical fields", () => {
  withFixture((root) => {
    assert.match(scan(root, []).join("\n"), /source-limit exception must use an exact path/);
    assert.match(scan(root, []).join("\n"), /approval_date is required/);
  }, {
    exceptions: [{
      path: "src/*.ts",
      affected_rules: ["hard_lines"],
      owner: "tests",
      reason: "invalid fixture",
      max_lines: 501,
      max_bytes: 1000,
      retirement_condition: "remove",
    }],
  });
});

test("exact generated exclusions require category, owner, reason, and refresh trigger", () => {
  withFixture((root) => {
    writeFixture(root, "generated/output.ts", "x\n".repeat(700));
    assert.deepEqual(scan(root, ["generated/output.ts"]), []);
  }, {
    non_hand_authored_exclusions: [{
      path: "generated",
      category: "generated",
      owner: "tests",
      reason: "Fixture output is generated.",
      refresh_trigger: "Regenerate when the fixture source changes.",
    }],
  });
});

test("generated exclusions without refresh triggers fail closed", () => {
  withFixture((root) => {
    assert.match(scan(root, []).join("\n"), /refresh_trigger is required/);
  }, {
    non_hand_authored_exclusions: [{
      path: "generated",
      category: "generated",
      owner: "tests",
      reason: "Fixture output is generated.",
    }],
  });
});

test("review candidates include either canonical review threshold", () => {
  withFixture((root) => {
    writeFixture(root, "src/review.ts", "x\n".repeat(301));
    assert.deepEqual(collectRepositoryFileSizeReviewCandidates(root, {
      execFileSync: () => "src/review.ts\0",
    }), ["src/review.ts"]);
  });
});

test("review candidates can be scoped to changed files", () => {
  withFixture((root) => {
    writeFixture(root, "src/changed.ts", "x\n".repeat(301));
    writeFixture(root, "src/unchanged.ts", "x\n".repeat(301));
    assert.deepEqual(collectRepositoryFileSizeReviewCandidates(root, {
      paths: ["src/changed.ts"],
      execFileSync: () => "src/changed.ts\0src/unchanged.ts\0",
    }), ["src/changed.ts"]);
  });
});

test("governed scans reject an intermediate junction or symlink escaping the repository", () => {
  withFixture((root) => {
    const outside = mkdtempSync(join(tmpdir(), "jobsentinel-file-size-outside-"));
    try {
      writeFixture(outside, "escape.ts", "export {};\n");
      symlinkSync(outside, join(root, "src"), process.platform === "win32" ? "junction" : "dir");
      assert.match(scan(root, ["src/escape.ts"]).join("\n"), /resolves outside the repository/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
