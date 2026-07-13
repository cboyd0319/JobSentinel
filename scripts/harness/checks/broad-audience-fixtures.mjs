import { readFileSync } from "node:fs";
import { join } from "node:path";
import { broadAudienceExamplePaths } from "./broad-audience-fixture-paths.mjs";
import { hasBroadAudienceProfileExampleDrift } from "./broad-audience-profile-examples.mjs";
import { hasBroadAudienceSourceExampleDrift } from "./broad-audience-source-examples.mjs";

export { hasSalaryAudienceExampleDrift } from "./broad-audience-salary-examples.mjs";

export function hasEngineerFirstAudienceExamples(root, path) {
  if (!broadAudienceExamplePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    hasBroadAudienceProfileExampleDrift(path, text) ||
    hasBroadAudienceSourceExampleDrift(root, path, text)
  );
}
