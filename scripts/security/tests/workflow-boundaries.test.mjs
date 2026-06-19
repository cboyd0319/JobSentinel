import assert from "node:assert/strict";
import test from "node:test";

import { checkWorkflowRunExpressionBoundary } from "../workflow-boundaries.mjs";

test("workflow run boundary rejects GitHub event expressions inside shell", () => {
  const workflow = [
    "permissions: {}",
    "jobs:",
    "  changes:",
    "    steps:",
    "      - run: |",
    "          event=\"${{ github.event_name }}\"",
    "          git diff --name-only \"${{ github.event.before }}\" \"$GITHUB_SHA\"",
  ].join("\n");

  assert.deepEqual(
    checkWorkflowRunExpressionBoundary(".github/workflows/ci.yml", workflow),
    [
      ".github/workflows/ci.yml:6 workflow run scripts must pass GitHub event data and workflow inputs through env variables",
      ".github/workflows/ci.yml:7 workflow run scripts must pass GitHub event data and workflow inputs through env variables",
    ],
  );
});

test("workflow run boundary allows env handoff and unrelated expressions", () => {
  const workflow = [
    "jobs:",
    "  build:",
    "    steps:",
    "      - env:",
    "          EVENT_NAME: ${{ github.event_name }}",
    "          PLATFORM: ${{ inputs.platform }}",
    "        run: |",
    "          event=\"${EVENT_NAME:-}\"",
    "          npx --no-install tauri build --target ${{ matrix.target }}",
  ].join("\n");

  assert.deepEqual(
    checkWorkflowRunExpressionBoundary(".github/workflows/release.yml", workflow),
    [],
  );
});
