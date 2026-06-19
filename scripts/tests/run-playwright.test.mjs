import assert from "node:assert/strict";
import test from "node:test";
import { createPlaywrightEnv, mergeNodeOptions } from "../run-playwright.mjs";

test("mergeNodeOptions suppresses only known upstream Node warnings", () => {
  assert.equal(mergeNodeOptions(""), "--disable-warning=DEP0205");
});

test("mergeNodeOptions preserves existing options without duplicating warning flags", () => {
  assert.equal(
    mergeNodeOptions("--trace-warnings --disable-warning=DEP0205"),
    "--trace-warnings --disable-warning=DEP0205",
  );
});

test("createPlaywrightEnv removes NO_COLOR for Playwright child processes", () => {
  const env = createPlaywrightEnv({
    NO_COLOR: "1",
    NODE_OPTIONS: "--trace-warnings",
    PATH: "/usr/bin",
  });

  assert.equal(env.NO_COLOR, undefined);
  assert.equal(env.NODE_OPTIONS, "--trace-warnings --disable-warning=DEP0205");
  assert.equal(env.PATH, "/usr/bin");
});

test("createPlaywrightEnv keeps FORCE_COLOR when present", () => {
  const env = createPlaywrightEnv({
    FORCE_COLOR: "1",
  });

  assert.equal(env.FORCE_COLOR, "1");
  assert.equal(env.NODE_OPTIONS, "--disable-warning=DEP0205");
});
