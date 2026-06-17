import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkAgentSkills, validateSkillPackage } from "./check-agent-skills.mjs";

function writeSkill(root, name, body = "## Guardrails\n\n- Keep user data private.\n") {
  const dir = join(root, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Use when validating a test skill package.\n---\n\n# ${name}\n\n${body}`,
  );
}

test("repo skills comply with Agent Skills structure", () => {
  assert.deepEqual(checkAgentSkills(), []);
});

test("validator catches directory and frontmatter drift", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-skill-test-"));
  const skillDir = join(root, "skills", "bad_name");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    "---\nname: different-name\ndescription: \n---\n\n# Bad\n",
  );

  const errors = validateSkillPackage(skillDir);

  assert.ok(errors.some((error) => error.includes("name must match parent directory")));
  assert.ok(errors.some((error) => error.includes("description must be 1-1024 characters")));
  assert.ok(errors.some((error) => error.includes("Guardrails")));
});

test("downloadable skills directory requires broad coverage", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-skill-coverage-"));
  mkdirSync(join(root, "skills"), { recursive: true });
  writeSkill(root, "one");

  const errors = checkAgentSkills(root);

  assert.ok(errors.some((error) => error.includes("at least six")));
});
