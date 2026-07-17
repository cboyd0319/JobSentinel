import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

export function oversizedLine(path) {
  return `split oversized source: ${path} has 501 lines; temporary maximum is 500`;
}

export function writeCanonicalFileSizePolicy(root) {
  writeFixtureFile(
    root,
    "scripts/harness/contracts/repository-structure.json",
    `${JSON.stringify({
      schema_version: 1,
      source_limits: {
        review_lines: 300,
        hard_lines: 500,
        review_bytes: 32768,
        hard_bytes: 65536,
      },
      included_extensions: [".rs", ".ts", ".tsx"],
      file_size: {
        scopes: [
          {
            id: "frontend-source",
            globs: ["src/**/*.ts", "src/**/*.tsx"],
          },
          {
            id: "rust-source",
            globs: ["crates/**/*.rs"],
          },
        ],
      },
      non_hand_authored_exclusions: [],
      exceptions: [],
    }, null, 2)}\n`,
  );
}
