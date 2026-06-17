import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkAgentSkills, validateSkillPackage } from "./check-agent-skills.mjs";

function writeSkill(
  root,
  name,
  body = [
    "## Inputs",
    "",
    "Use user-provided context.",
    "",
    "## Workflow",
    "",
    "1. Review the request.",
    "",
    "## Output",
    "",
    "Produce the requested artifact.",
    "",
    "## Handoff",
    "",
    "Name the next useful skill.",
    "",
    "## Guardrails",
    "",
    "- Keep user data private.",
    "",
  ].join("\n"),
) {
  const dir = join(root, "skills", name);
  mkdirSync(join(dir, "agents"), { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Use when validating a test skill package.\nlicense: MIT\nmetadata:\n  jobsentinel_version_target: "2.9.0"\n---\n\n# ${name}\n\n${body}`,
  );
  writeFileSync(
    join(dir, "agents", "openai.yaml"),
    `interface:\n  display_name: "Test Skill"\n  short_description: "Validate a test skill package"\n  default_prompt: "Use $${name} to validate a test skill package."\n`,
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
  assert.ok(errors.some((error) => error.includes("license must be MIT")));
  assert.ok(errors.some((error) => error.includes("metadata.jobsentinel_version_target")));
  assert.ok(errors.some((error) => error.includes("Guardrails")));
  assert.ok(errors.some((error) => error.includes("agents/openai.yaml")));
});

test("downloadable skills directory requires broad coverage", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-skill-coverage-"));
  mkdirSync(join(root, "skills"), { recursive: true });
  writeSkill(root, "one");

  const errors = checkAgentSkills(root);

  assert.ok(errors.some((error) => error.includes("at least eight")));
});

test("validator catches missing referenced skill resources", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-skill-reference-"));
  writeSkill(
    root,
    "missing-reference",
    "## Output\n\nUse `assets/missing-template.md`.\n\n## Guardrails\n\n- Keep user data private.\n",
  );

  const errors = validateSkillPackage(join(root, "skills", "missing-reference"));

  assert.ok(errors.some((error) => error.includes("references missing file")));
});

test("validator catches stale OpenAI skill metadata", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-skill-openai-"));
  writeSkill(root, "openai-metadata");
  writeFileSync(
    join(root, "skills", "openai-metadata", "agents", "openai.yaml"),
    'interface:\n  display_name: ""\n  short_description: "Too short"\n  default_prompt: "Use this skill."\n',
  );

  const errors = validateSkillPackage(join(root, "skills", "openai-metadata"));

  assert.ok(errors.some((error) => error.includes("interface.display_name")));
  assert.ok(errors.some((error) => error.includes("interface.short_description")));
  assert.ok(errors.some((error) => error.includes("must mention $openai-metadata")));
});
