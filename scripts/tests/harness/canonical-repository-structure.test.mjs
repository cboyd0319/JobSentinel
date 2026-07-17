import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { collectCanonicalRepositoryStructureViolations } from "../../harness/checks/canonical-repository-structure.mjs";

function write(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function basePolicy(overrides = {}) {
  const structure = {
    allowed_source_roots: ["src"],
    allowed_configuration_roots: ["docs", "scripts/harness/contracts"],
    allowed_root_source_files: [],
    allowed_root_configuration_files: ["package.json"],
    allowed_root_files: ["package.json"],
    allowed_standalone_source_files: [],
    allowed_top_level_directories: ["docs", "scripts", "src"],
    units: [{ id: "web", root: "src", manifest: "package.json", public_entrypoint: "src/main.ts", kind: "deployable" }],
    architecture_check: "npm run lint:architecture",
    source_limit_check: "npm run lint:file-size",
    full_graph_check: "npm run verify:full",
    ...overrides.structure,
  };
  return {
    schema_version: 1,
    scale_assumption: { lines: 2000000, files: 50000 },
    source_limits: { review_lines: 300, hard_lines: 500, review_bytes: 32768, hard_bytes: 65536 },
    included_extensions: [".json", ".ts"],
    file_size: { scopes: [{ id: "source", globs: ["**/*"] }] },
    non_hand_authored_exclusions: [],
    exceptions: [],
    ...overrides,
    structure,
  };
}

function withFixture(callback, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-structure-"));
  try {
    write(root, "docs/architecture/repository.md", "# Repository Architecture\n");
    write(root, "package.json", "{}\n");
    write(root, "src/main.ts", "export {};\n");
    write(root, "scripts/harness/contracts/architecture.json", '{"architecture_doc":"docs/architecture/repository.md"}\n');
    write(root, "scripts/harness/contracts/repository-structure.json", `${JSON.stringify(basePolicy(overrides), null, 2)}\n`);
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function check(root, extraFiles = []) {
  const files = [
    "docs/architecture/repository.md",
    "package.json",
    "scripts/harness/contracts/repository-structure.json",
    "src/main.ts",
    "scripts/harness/contracts/architecture.json",
    ...extraFiles,
  ];
  return collectCanonicalRepositoryStructureViolations(root, {
    execFileSync: () => `${files.join("\0")}\0`,
  });
}

test("canonical repository structure accepts declared roots, units, and entrypoints", () => {
  withFixture((root) => assert.deepEqual(check(root), []));
});

test("canonical repository structure ignores paths deleted from the working tree", () => {
  withFixture((root) => assert.deepEqual(check(root, ["removed.ts"]), []));
});

test("canonical repository structure rejects an unclassified root file", () => {
  withFixture((root) => {
    write(root, "rogue.txt", "unowned\n");
    assert.match(check(root, ["rogue.txt"]).join("\n"), /classify root file/);
  });
});

test("canonical repository structure rejects source outside approved roots", () => {
  withFixture((root) => {
    write(root, "rogue.ts", "export {};\n");
    assert.match(check(root, ["rogue.ts"]).join("\n"), /move hand-authored source into an approved source root/);
  });
});

test("canonical repository structure classifies governed C# as source", () => {
  withFixture((root) => {
    const policy = basePolicy({ included_extensions: [".cs", ".json", ".ts"] });
    write(root, "docs/rogue.cs", "public class Rogue {}\n");
    write(root, "scripts/harness/contracts/repository-structure.json", `${JSON.stringify(policy, null, 2)}\n`);
    assert.match(check(root, ["docs/rogue.cs"]).join("\n"), /move hand-authored source into an approved source root/);
  });
});

test("canonical repository structure rejects missing unit manifests", () => {
  withFixture((root) => {
    const policy = basePolicy({ structure: {
      units: [
        { id: "one", root: "src", manifest: "missing.json", public_entrypoint: "src/main.ts", kind: "reusable" },
        { id: "two", root: "src", manifest: "package.json", public_entrypoint: "src/main.ts", kind: "reusable" },
      ],
    } });
    write(root, "scripts/harness/contracts/repository-structure.json", `${JSON.stringify(policy, null, 2)}\n`);
    const violations = check(root).join("\n");
    assert.match(violations, /manifest does not exist/);
  });
});

test("generated content cannot be excluded inside a hand-authored source root", () => {
  withFixture((root) => {
    const policy = basePolicy({
      non_hand_authored_exclusions: [{ path: "src/generated", category: "generated", owner: "tests", reason: "fixture" }],
    });
    write(root, "src/generated/output.ts", "export {};\n");
    write(root, "scripts/harness/contracts/repository-structure.json", `${JSON.stringify(policy, null, 2)}\n`);
    assert.match(check(root, ["src/generated/output.ts"]).join("\n"), /outside hand-authored source roots/);
  });
});

test("TypeScript project graph owns every configuration surface and uses build mode", () => {
  withFixture((root) => {
    write(root, "playwright.config.ts", "export default {};\n");
    write(root, "vite.config.ts", "export default {};\n");
    write(root, "tsconfig.json", '{"references":[{"path":"./tsconfig.node.json"}]}\n');
    write(root, "tsconfig.node.json", '{"compilerOptions":{"composite":true,"declaration":true,"emitDeclarationOnly":true,"outDir":"./node_modules/.cache/node"},"include":["vite.config.ts"]}\n');
    write(root, "package.json", '{"scripts":{"typecheck":"tsc --noEmit"}}\n');
    const violations = check(root, ["playwright.config.ts", "vite.config.ts", "tsconfig.json", "tsconfig.node.json"]).join("\n");
    assert.match(violations, /typecheck must use tsc --build/);
    assert.match(violations, /must own TypeScript configuration surface playwright\.config\.ts/);
  });
});

test("repository structure rejects junctions or symlinks escaping the root", () => {
  withFixture((root) => {
    const outside = mkdtempSync(join(tmpdir(), "jobsentinel-structure-outside-"));
    try {
      write(outside, "escape.ts", "export {};\n");
      symlinkSync(outside, join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
      assert.match(check(root, ["linked/escape.ts"]).join("\n"), /resolve outside the repository/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

test("repository structure rejects case collisions and Windows-reserved paths", () => {
  withFixture((root) => {
    write(root, "src/Case.ts", "export {};\n");
    write(root, "src/case.ts", "export {};\n");
    write(root, "src/CON.ts", "export {};\n");
    const violations = check(root, ["src/Case.ts", "src/case.ts", "src/CON.ts"]).join("\n");
    assert.match(violations, /collide on case-insensitive or Unicode-normalizing filesystems/);
    assert.match(violations, /not portable to Windows and macOS: src\/CON\.ts/);
  });
});
