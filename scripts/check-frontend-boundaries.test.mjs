import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkFrontendBoundaries } from "./check-frontend-boundaries.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-frontend-boundaries-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkFrontendBoundaries rejects dynamic Tailwind class construction", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/DynamicCategory.tsx",
      `
export function DynamicCategory({ color }: { color: string }) {
  return <button className={\`bg-\${color}-600 text-white\`}>Category</button>;
}
`,
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/components/DynamicCategory.tsx constructs Tailwind class names with interpolation",
        ),
      ),
      violations.join("\n"),
    );
  });
});
