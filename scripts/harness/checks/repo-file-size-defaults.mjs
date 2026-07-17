export const fileSizeContractPath = "scripts/harness/contracts/file-size.json";
export const fileSizeContractSchema = "jobsentinel.file_size_contract.v3";
export const repositoryStructurePolicyPath = "scripts/harness/contracts/repository-structure.json";
export const requiredBudgetFields = ["max_lines", "max_bytes", "max_line_bytes"];
export const requiredExceptionFields = [
  "owner",
  "reason",
  "approval_date",
  "retirement_condition",
];
export const requiredExclusionFields = ["owner", "reason", "refresh_trigger"];

export const defaultFileSizeContract = {
  schema: fileSizeContractSchema,
  baseline: { measured_on: "fixture", owner: "tests", method: "fixture defaults" },
  coverage: {
    extensions: [".css", ".json", ".mjs", ".rs", ".sh", ".ts", ".tsx", ".yml"],
    filenames: [],
  },
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
      globs: ["src-tauri/**/*.rs", "crates/**/*.rs"],
      max_lines: 500,
      max_bytes: 65536,
      max_line_bytes: 65536,
    },
    {
      id: "maintained-source-fallback",
      globs: ["**/*"],
      max_lines: 500,
      max_bytes: 65536,
      max_line_bytes: 65536,
    },
  ],
  coverage_exclusions: [],
  exceptions: [],
};
