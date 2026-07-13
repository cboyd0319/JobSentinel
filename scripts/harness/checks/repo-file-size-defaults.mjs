export const fileSizeContractPath = "validation/file_size_contract.json";
export const fileSizeContractSchema = "jobsentinel.file_size_contract.v1";
export const requiredExceptionFields = ["owner", "reason", "follow_up_trigger"];

export const defaultFileSizeContract = {
  schema: fileSizeContractSchema,
  scopes: [
    {
      id: "frontend-source",
      globs: ["src/**/*.ts", "src/**/*.tsx"],
      exclude_globs: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/mocks/**",
        "src/shared/*Taxonomy.ts",
        "src/shared/*Taxonomy.json",
        "src/shared/*Entries.ts",
      ],
      max_lines: 500,
    },
    {
      id: "shared-taxonomies",
      globs: [
        "src/shared/*Taxonomy.ts",
        "src/shared/*Taxonomy.json",
        "src/shared/*Entries.ts",
      ],
      max_lines: 2000,
    },
    {
      id: "frontend-tests-and-mocks",
      globs: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/mocks/**/*.ts"],
      max_lines: 800,
    },
    {
      id: "rust-source",
      globs: ["src-tauri/src/**/*.rs", "crates/**/*.rs"],
      exclude_globs: [
        "src-tauri/src/**/*test*.rs",
        "src-tauri/src/**/tests.rs",
        "src-tauri/src/**/tests/**/*.rs",
        "src-tauri/src/**/*tests/**/*.rs",
        "crates/**/*test*.rs",
        "crates/**/tests.rs",
        "crates/**/tests/**/*.rs",
        "crates/**/*tests/**/*.rs",
      ],
      max_lines: 500,
    },
    {
      id: "rust-tests",
      globs: [
        "src-tauri/src/**/*test*.rs",
        "src-tauri/src/**/tests.rs",
        "src-tauri/src/**/tests/**/*.rs",
        "src-tauri/src/**/*tests/**/*.rs",
        "src-tauri/tests/**/*.rs",
        "crates/**/*test*.rs",
        "crates/**/tests.rs",
        "crates/**/tests/**/*.rs",
        "crates/**/*tests/**/*.rs",
        "crates/*/tests/**/*.rs",
      ],
      max_lines: 800,
    },
    {
      id: "cross-runtime-resources",
      globs: ["resources/**/*.json"],
      max_lines: 2000,
    },
    {
      id: "scripts",
      globs: ["scripts/**/*.mjs"],
      exclude_globs: ["scripts/tests/**"],
      max_lines: 500,
    },
    {
      id: "script-tests",
      globs: ["scripts/tests/**/*.mjs"],
      max_lines: 800,
    },
    {
      id: "docs",
      globs: ["*.md", "docs/**/*.md"],
      max_lines: 700,
    },
  ],
  ignore_globs: [
    ".git/**",
    "node_modules/**",
    "target/**",
    "crates/**/target/**",
    "package-lock.json",
    "Cargo.lock",
    "src-tauri/gen/**",
    "docs/plans/archive/**",
  ],
  exceptions: [],
};
