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
      non_hand_authored_exclusions: [],
      exceptions: [],
    }, null, 2)}\n`,
  );
  writeFixtureFile(
    root,
    "scripts/harness/contracts/file-size.json",
    `${JSON.stringify({
      schema: "jobsentinel.file_size_contract.v3",
      projection_of: "scripts/harness/contracts/repository-structure.json",
      coverage: { extensions: [".rs", ".ts", ".tsx"], filenames: [] },
      scopes: [
        {
          id: "frontend-source",
          globs: ["src/**/*.ts", "src/**/*.tsx"],
          max_lines: 500,
          max_bytes: 65536,
          max_line_bytes: 65536,
        },
        {
          id: "rust-source",
          globs: ["crates/**/*.rs"],
          max_lines: 500,
          max_bytes: 65536,
          max_line_bytes: 65536,
        },
      ],
      coverage_exclusions: [],
      exceptions: [],
    }, null, 2)}\n`,
  );
}
