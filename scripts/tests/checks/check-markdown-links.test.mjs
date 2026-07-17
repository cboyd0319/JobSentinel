import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { collectMarkdownLinkViolations } from "../../checks/markdown-links.mjs";

function withFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-markdown-links-"));
  try {
    mkdirSync(join(root, "docs", "nested"), { recursive: true });
    writeFileSync(join(root, "README.md"), "# Fixture\n");
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("local Markdown links must resolve from their source document", () => {
  withFixture((root) => {
    writeFileSync(join(root, "docs", "target.md"), "# Target\n");
    writeFileSync(
      join(root, "docs", "nested", "guide.md"),
      [
        "# Guide",
        "",
        "[Valid](../target.md#target)",
        "[External](https://example.com/docs)",
        "[Page anchor](#guide)",
        "[Missing](../missing.md)",
        "",
        "```markdown",
        "[Example only](../example.md)",
        "```",
      ].join("\n"),
    );

    assert.deepEqual(collectMarkdownLinkViolations(root), [
      "docs/nested/guide.md:6 links to missing local target ../missing.md",
    ]);
  });
});

test("reference links and encoded local paths are checked", () => {
  withFixture((root) => {
    writeFileSync(join(root, "docs", "target file.md"), "# Target\n");
    writeFileSync(
      join(root, "docs", "guide.md"),
      [
        "# Guide",
        "",
        "[Valid reference][target]",
        "[Missing reference][missing]",
        "",
        "[target]: target%20file.md",
        "[missing]: absent.md",
      ].join("\n"),
    );

    assert.deepEqual(collectMarkdownLinkViolations(root), [
      "docs/guide.md:7 links to missing local target absent.md",
    ]);
  });
});
