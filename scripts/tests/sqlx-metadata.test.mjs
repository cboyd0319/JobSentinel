import assert from "node:assert/strict";
import test from "node:test";

import { reportsUnusedSqlxMetadata } from "../checks/sqlx-metadata.mjs";

test("SQLx metadata check detects stale query files", () => {
  assert.equal(
    reportsUnusedSqlxMetadata(
      "warning: potentially unused queries found in .sqlx; you may want to re-run sqlx prepare",
    ),
    true,
  );
});

test("SQLx metadata check accepts current query files", () => {
  assert.equal(
    reportsUnusedSqlxMetadata("SQLx offline metadata is current"),
    false,
  );
});
