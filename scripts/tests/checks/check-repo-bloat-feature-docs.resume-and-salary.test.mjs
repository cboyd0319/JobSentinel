import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}
function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-feature-docs-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("checkRepoBloat rejects synonym and remote preference doc drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/synonym-matching.md",
      [
        '- ✅ "py" matches "py script"',
        '- "Kuberntes" → "Kubernetes"',
        'The system comes with synonym groups for common tech terms:',
        '- "Python developer needed"',
        '"title_allowlist": ["Senior Engineer"]',
        "### Custom Synonyms (v2.1+)",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/remote-preference-scoring.md",
      [
        "| Hybrid | 0.5 | ⚠ Prefer remote-only |",
        "- All preference × job type combinations",
        "**Module:** `crates/jobsentinel-application/src/scoring/remote.rs`",
        "### User Preference Modes",
        "### Graduated Scoring Matrix",
        "### Scoring Weight",
        "| Job Type | Score | Meaning |",
        "Potential improvements for v2.0+:",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/synonym-matching.md",
        "docs/features/remote-preference-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/synonym-matching.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/remote-preference-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Hiring Trends doc glyph markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4c8);
    const moneyIcon = String.fromCodePoint(0x1f4b0);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      [
        `## ${chartIcon} Overview`,
        `- **${moneyIcon} Salary Trends** - Monitor salary changes`,
        "┌──────────────┐",
        "│ Dashboard    │",
        "└──────────────┘",
        "Trend → Dashboard",
        "Company ▲",
        "pub fn severity_emoji(&self) -> &str;",
        "pub fn sentiment_emoji(&self) -> &str;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/hiring-trends.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace Hiring Trends doc glyph/stale indicator markers: docs/features/hiring-trends.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Hiring Trends doc shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      [
        "## Technical Documentation",
        "## Real-Time Analytics & Trend Visualization",
        "data-driven career decisions with comprehensive market insights",
        "## Architecture",
        "### Database Schema",
        "## Usage Guide",
        "## API Reference",
        "## Implementation Status",
        "### Phase 2: Enhanced Analytics Planned",
        "### Phase 3: Advanced Visualization Complete",
        "- [ ] Machine learning trend prediction",
        "## Scheduled Jobs",
        "### Daily Analysis (Recommended: 2 AM)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/hiring-trends.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync Hiring Trends docs with local evidence guidance: docs/features/hiring-trends.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Resume Matcher and Salary AI feature doc emoji markers", () => {
  withGitFixture((root) => {
    const targetIcon = String.fromCodePoint(0x1f3af);
    const chartIcon = String.fromCodePoint(0x1f4ca);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [`## ${targetIcon} Overview`, `- **${chartIcon} Gap Analysis**`, "✓ Matching Skills", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      [
        `## ${targetIcon} Overview`,
        `- **${chartIcon} Salary Benchmarks**`,
        "job_hash (FK → jobs)",
        "├── placeholders",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/resume-matcher.md", "docs/features/pay-protection.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/pay-protection.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Resume Matcher doc UI shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [
        "# AI Resume-Job Matcher",
        "## Intelligent Resume Analysis & Job Compatibility Scoring",
        "Stop manually comparing job requirements and let JobSentinel do the matching work.",
        "## Architecture",
        "### Database Schema",
        "## Usage Guide",
        "## Matching Algorithm",
        "### Future Enhancements",
        "- [ ] A/B Testing",
        "- [ ] Resume Optimization - Suggest keywords to add",
        "## API Reference",
        "## Implementation Status",
        "keyword match against job description",
        "Keyword-based skill extraction",
        "// src/pages/ResumeManager.tsx",
        "const filteredSkills = match.matching_skills.filter(skill => skill.category === selectedCategory);",
        "return <ResumeMatchScoreBreakdown skillsScore={match.skills_score} />;",
        "return <span>{skill.name} {skill.confidence} {skill.years_experience}</span>;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/resume-matcher.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync resume matcher docs with live Resume page shape: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing Resume Matcher AI labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "- AI Resume-Job Matcher: PDF parsing, skill extraction, matching",
        "### AI Resume-Job Matcher (Working)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["#### `core/resume/`", "", "**Purpose**: AI Resume-Job Matcher", ""].join("\n"),
    );
    writeFixtureFile(root, "docs/features/resume-matcher.md", "# Resume Matcher\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/ROADMAP.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/resume-matcher.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace confusing Resume Matcher AI label: docs/ROADMAP.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace confusing Resume Matcher AI label: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace confusing Resume Matcher AI label: docs/features/resume-matcher.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing Salary AI labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", "- Salary AI with negotiation insights\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["#### `core/salary/`", "", "**Purpose**: Salary AI", ""].join("\n"),
    );
    writeFixtureFile(root, "docs/features/pay-protection.md", "# Salary AI\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/README.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/pay-protection.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "docs/README.md",
      "docs/developer/ARCHITECTURE.md",
      "docs/features/pay-protection.md",
    ]) {
      assert.ok(
        violations.includes(`replace confusing Salary AI label: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects stale Salary AI future UI claim", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      ["### Phase 2-4: Future", "", "- [ ] UI components", ""].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/pay-protection.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale Salary AI future UI claim: docs/features/pay-protection.md"),
      violations.join("\n"),
    );
  });
});
