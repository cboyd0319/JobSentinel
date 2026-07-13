import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-feature-status-docs-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale application tracking doc claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      [
        "## 🎨 UI Integration (Future)",
        "**Never lose track of a job application again.**",
        "a Trello board for your job search",
        "JobSentinel's Application Tracking System provides comprehensive pipeline management",
        "The ATS module has been refactored into 5 focused submodules",
        "- Technical Interview",
        "| `technical_interview` | Technical assessment |",
        "### Phase 2 (Future)",
        "### Phase 3 (Advanced)",
        "- [ ] Machine Learning",
        "- [ ] A/B Testing",
        "## API Reference",
        "## Implementation Status",
        "// src/pages/ApplicationTracker.tsx",
        "const kanban = await invoke<ApplicationsByStatus>('get_applications_by_status');",
        "- [ ] Tauri commands",
        "- [ ] UI components (Kanban board)",
        "**Next Feature:** UI Connections & Polish (v1.4 E4)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/application-tracking.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale application tracking doc claims: docs/features/application-tracking.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing application tracking ATS labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/README.md",
      [
        "- Application Tracking System (ATS) with Kanban board",
        "| Application Tracking | Working | [ATS](features/application-tracking.md) |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace confusing application tracking ATS label: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale smart scoring salary marker claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "Predicted salaries are marked with a 🤖 icon.",
        "**Implementation Status:** ✅ Complete (All features implemented)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale smart-scoring salary marker claim: docs/features/smart-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects smart scoring doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        'Title: "Senior Backend Engineer" → Matches "Backend Developer" → 100%',
        "├─ Skills (40%): 64%",
        "  ✓ React (boosted keyword found)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace smart scoring doc glyph markers: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notifications doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        '2. Click "Create New App" → "From Scratch"',
        "crates/jobsentinel-core/src/core/notify/",
        "├── mod.rs",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/notifications.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace notifications doc glyph markers: docs/features/notifications.md"),
      violations.join("\n"),
    );
  });
});
