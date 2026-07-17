import assert from "node:assert/strict";
import test from "node:test";
import { hasTechnicalFirstUserCopy } from "../../harness/checks/product-copy.mjs";
import {
  createFixtureRunner,
  writeFixtureFile,
} from "../lib/filesystem-fixture.mjs";

const withFixture = createFixtureRunner(
  "jobsentinel-product-copy-support-docs-",
);

test("product copy rejects technical issue-template support wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/bug_report.yml",
      [
        "In JobSentinel, click Settings, then Copy Debug Report.",
        "label: Debug Information",
        "description: Paste the ANONYMIZED debug report from JobSentinel.",
        "label: Steps to reproduce",
        "When I clicked X, I expected Y but got Z instead",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/scraper_issue.yml",
      [
        "name: Scraper Issue",
        "label: Affected Scraper",
        "description: Which job board scraper is affected?",
        "label: Scraper Health Dashboard Output",
        "label: Job source health details",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/bug_report.yml"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        ".github/ISSUE_TEMPLATE/scraper_issue.yml",
      ),
      true,
    );
  });
});

test("product copy rejects non-advisory resume and pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/resume/matcher.rs",
      "Recommendation: Strong match. Apply immediately.\nStudy the missing skills.\nConsider upskilling.\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-documents/src/ats_analyzer.rs",
      'improved.push_str(" (add specific metrics)");\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/salary/analyzer.rs",
      "Excellent offer! Accept or negotiate equity.\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/migrations/00000000000000_initial_schema.sql",
      "I was hoping for a compensation package. Make this an easy decision. I would love to have more skin in the game.\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, "crates/jobsentinel-storage/src/resume/matcher.rs"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "crates/jobsentinel-documents/src/ats_analyzer.rs",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "crates/jobsentinel-storage/src/salary/analyzer.rs"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "crates/jobsentinel-storage/migrations/00000000000000_initial_schema.sql",
      ),
      true,
    );
  });
});
