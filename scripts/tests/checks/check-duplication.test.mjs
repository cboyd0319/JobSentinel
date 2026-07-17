import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  checkDuplication,
  classifyRustSource,
  measureDuplication,
  measureRepoScopes,
  ratchetBaselines,
  significantLines,
} from "../../checks/duplication.mjs";

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

function contractWithScopes(scopes) {
  return {
    schema: "jobsentinel.duplication_contract.v2",
    windowLines: 15,
    scopes,
  };
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
      {
        path: "src/a.ts",
        text: `export function a() {\n${block}\n  return 1;\n}`,
      },
      {
        path: "src/b.ts",
        text: `export function b() {\n${block}\n  return 2;\n}`,
      },
    ],
    15,
  );

  assert.equal(result.duplicatedLines, 30);
  assert.equal(result.cloneRegions, 2);
});

test("measureDuplication reports no duplication for unique code", () => {
  const result = measureDuplication(
    [
      {
        path: "src/a.ts",
        text: Array.from({ length: 20 }, (_, i) => `const a${i} = ${i};`).join(
          "\n",
        ),
      },
      {
        path: "src/b.ts",
        text: Array.from(
          { length: 20 },
          (_, i) => `const b${i} = ${i * 2};`,
        ).join("\n"),
      },
    ],
    15,
  );

  assert.equal(result.duplicatedLines, 0);
  assert.equal(result.cloneRegions, 0);
});

test("independent scopes measure and gate their own files and baselines", () => {
  withFixture((root) => {
    const block = sharedBlock();
    write(root, "src/a.ts", `export function a() {\n${block}\n  return 1;\n}`);
    write(root, "src/b.ts", `export function b() {\n${block}\n  return 2;\n}`);
    write(
      root,
      "crates/example/src/lib.rs",
      `pub fn unique() {\n  consume(1);\n}`,
    );

    const contract = contractWithScopes({
      frontendProduction: {
        include: { dirs: ["src"], extensions: [".ts"] },
        excludePatterns: [],
        classification: "all",
        baseline: { duplicatedLines: 0, cloneRegions: 0 },
      },
      cratesProduction: {
        include: { dirs: ["crates"], extensions: [".rs"] },
        excludePatterns: [],
        classification: "rust-production",
        baseline: { duplicatedLines: 0, cloneRegions: 0 },
      },
    });
    write(
      root,
      "scripts/harness/contracts/duplication.json",
      `${JSON.stringify(contract)}\n`,
    );

    const measured = measureRepoScopes(root, contract);
    assert.equal(measured.frontendProduction.duplicatedLines, 30);
    assert.equal(measured.cratesProduction.duplicatedLines, 0);

    const failing = checkDuplication(root);
    assert.equal(failing.length, 1);
    assert.match(failing[0], /frontendProduction.*duplication increased/);

    contract.scopes.frontendProduction.baseline = {
      duplicatedLines: 30,
      cloneRegions: 2,
    };
    write(
      root,
      "scripts/harness/contracts/duplication.json",
      `${JSON.stringify(contract)}\n`,
    );
    assert.deepEqual(checkDuplication(root), []);
  });
});

test("Rust classification keeps nested test items separate from later production code", () => {
  const source = [
    "pub fn before_tests() -> usize { 1 }",
    "#[cfg(test)]",
    "mod tests {",
    "    fn nested_test_helper() {",
    '        let ordinary = "a closing brace: }";',
    '        let raw = r#"another closing brace: }"#;',
    "        if ordinary.len() > 2 { consume(raw); }",
    "    }",
    "}",
    "pub fn after_tests() -> usize {",
    "    let value = 2;",
    "    value",
    "}",
  ].join("\n");

  const production = classifyRustSource(
    "crates/example/src/lib.rs",
    source,
    "rust-production",
  );
  assert.match(production, /before_tests/);
  assert.doesNotMatch(production, /nested_test_helper/);
  assert.match(production, /after_tests/);

  const tests = classifyRustSource(
    "crates/example/src/lib.rs",
    source,
    "rust-tests",
  );
  assert.doesNotMatch(tests, /before_tests/);
  assert.match(tests, /nested_test_helper/);
  assert.doesNotMatch(tests, /after_tests/);
});

test("Rust classification assigns test-only files entirely to the test scope", () => {
  const source = `fn integration_fixture() {\n${sharedBlock()}\n}`;

  const production = classifyRustSource(
    "crates/example/tests/integration.rs",
    source,
    "rust-production",
  );
  const tests = classifyRustSource(
    "crates/example/tests/integration.rs",
    source,
    "rust-tests",
  );

  assert.equal(significantLines(production).length, 0);
  assert.equal(tests, source);
});

test("ratchetBaselines accepts initial and downward measurements", () => {
  const initial = contractWithScopes({
    newScope: {
      include: { dirs: ["crates"], extensions: [".rs"] },
      excludePatterns: [],
      classification: "rust-tests",
    },
    existingScope: {
      include: { dirs: ["src"], extensions: [".ts"] },
      excludePatterns: [],
      classification: "all",
      baseline: { duplicatedLines: 20, cloneRegions: 4 },
    },
  });

  const updated = ratchetBaselines(
    initial,
    {
      newScope: { duplicatedLines: 12, cloneRegions: 2, regions: [] },
      existingScope: { duplicatedLines: 15, cloneRegions: 3, regions: [] },
    },
    "2026-07-16",
  );

  assert.deepEqual(updated.scopes.newScope.baseline, {
    duplicatedLines: 12,
    cloneRegions: 2,
  });
  assert.deepEqual(updated.scopes.existingScope.baseline, {
    duplicatedLines: 15,
    cloneRegions: 3,
  });
  assert.equal(updated.measuredOn, "2026-07-16");
  assert.equal(initial.scopes.newScope.baseline, undefined);
});

test("ratchetBaselines rejects increases in either baseline metric", () => {
  const contract = contractWithScopes({
    cratesProduction: {
      include: { dirs: ["crates"], extensions: [".rs"] },
      excludePatterns: [],
      classification: "rust-production",
      baseline: { duplicatedLines: 20, cloneRegions: 4 },
    },
  });

  assert.throws(
    () =>
      ratchetBaselines(contract, {
        cratesProduction: { duplicatedLines: 21, cloneRegions: 4, regions: [] },
      }),
    /cannot increase cratesProduction baseline/,
  );
  assert.throws(
    () =>
      ratchetBaselines(contract, {
        cratesProduction: { duplicatedLines: 19, cloneRegions: 5, regions: [] },
      }),
    /cannot increase cratesProduction baseline/,
  );
});
