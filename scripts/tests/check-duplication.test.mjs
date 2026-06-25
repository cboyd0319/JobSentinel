import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  checkDuplication,
  measureDuplication,
  significantLines,
} from "../check-duplication.mjs";

function sharedBlock() {
  return Array.from(
    { length: 15 },
    (_, index) => `const value${index} = transform(input${index}) + ${index};`,
  ).join("\n");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dup-"));
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, path, content) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}

test("significantLines drops comments, blanks, and structural punctuation", () => {
  const lines = significantLines(
    ["// a comment", "", "  const x   =  1;", "}", "doThing(x);"].join("\n"),
  );

  assert.deepEqual(
    lines.map((line) => line.norm),
    ["const x = 1;", "doThing(x);"],
  );
});

test("measureDuplication finds an identical block across two files", () => {
  const block = sharedBlock();
  const result = measureDuplication(
    [
      { path: "src/a.ts", text: `export function a() {\n${block}\n  return 1;\n}` },
      { path: "src/b.ts", text: `export function b() {\n${block}\n  return 2;\n}` },
    ],
    15,
  );

  assert.equal(result.duplicatedLines, 30);
  assert.equal(result.cloneRegions, 2);
});

test("measureDuplication reports no duplication for unique code", () => {
  const result = measureDuplication(
    [
      { path: "src/a.ts", text: Array.from({ length: 20 }, (_, i) => `const a${i} = ${i};`).join("\n") },
      { path: "src/b.ts", text: Array.from({ length: 20 }, (_, i) => `const b${i} = ${i * 2};`).join("\n") },
    ],
    15,
  );

  assert.equal(result.duplicatedLines, 0);
  assert.equal(result.cloneRegions, 0);
});

test("checkDuplication fails above baseline and passes at or under it", () => {
  withFixture((root) => {
    const block = sharedBlock();
    write(root, "src/a.ts", `export function a() {\n${block}\n  return 1;\n}`);
    write(root, "src/b.ts", `export function b() {\n${block}\n  return 2;\n}`);

    const contract = {
      schema: "jobsentinel.duplication_contract.v1",
      windowLines: 15,
      include: { dirs: ["src"], extensions: [".ts"] },
      excludePatterns: [],
      baseline: { duplicatedLines: 0, cloneRegions: 0 },
    };
    write(root, "validation/duplication_contract.json", `${JSON.stringify(contract)}\n`);

    const failing = checkDuplication(root);
    assert.equal(failing.length, 1);
    assert.match(failing[0], /duplication increased/);

    contract.baseline.duplicatedLines = 100;
    write(root, "validation/duplication_contract.json", `${JSON.stringify(contract)}\n`);
    assert.deepEqual(checkDuplication(root), []);
  });
});
