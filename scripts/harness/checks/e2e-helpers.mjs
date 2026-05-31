import { listTrackedFiles } from "./repo-artifacts.mjs";
import { importSpecifiers } from "./source-structure.mjs";

export function hasUnreferencedE2eTestHelper(root, path) {
  if (path !== "tests/e2e/playwright/test-helpers.ts") {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) => {
    if (
      trackedPath === path ||
      !trackedPath.startsWith("tests/e2e/playwright/") ||
      !trackedPath.endsWith(".ts")
    ) {
      return false;
    }

    return importSpecifiers(root, trackedPath).some(
      (specifier) => specifier === "./test-helpers" || specifier.endsWith("/test-helpers"),
    );
  });
}
