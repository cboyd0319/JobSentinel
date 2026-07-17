export function normalizeRepoPath(path) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

export function classifyVerificationPath(inputPath) {
  const path = normalizeRepoPath(inputPath);
  const flags = new Set(["harness"]);
  const reasons = [];

  const isDocs = path.endsWith(".md") || path.startsWith("docs/");
  const isScript = path.startsWith("scripts/");
  const isFrontend =
    path.startsWith("src/") || path.startsWith("public/") || path === "index.html" ||
    path === "playwright.config.ts" ||
    path === "package.json" || path === "package-lock.json" ||
    /^(?:eslint|postcss|tailwind|vite|vitest)\.config\./.test(path) ||
    path.startsWith(".storybook/") || path.startsWith("tsconfig");
  const isE2e = path.startsWith("tests/e2e/") || path === "playwright.config.ts" || path.includes("run-playwright");
  const isRust =
    path === "Cargo.toml" || path === "Cargo.lock" || path === "rust-toolchain.toml" ||
    path === "clippy.toml" || path === "deny.toml" || path.startsWith(".cargo/") ||
    path.startsWith("crates/") || path.startsWith("src-tauri/") || path.startsWith(".sqlx/") ||
    path.startsWith("resources/");
  const isDependency = ["package.json", "package-lock.json", ".nvmrc"].includes(path) || /Cargo\.toml$/.test(path);
  const isSecurity =
    path === ".github/CODEOWNERS" || path === ".github/dependabot.yml" ||
    path.startsWith(".github/workflows/") ||
    ["docs/developer/CI_CD.md", "docs/developer/RELEASING.md"].includes(path) ||
    path.startsWith(".husky/") || /(?:security|privacy|credential|secret|auth|token)/i.test(path) ||
    ["PRIVACY.md", "RESPONSIBLE_AI.md", "SECURITY.md", "deny.toml"].includes(path);
  const isSkills = path.startsWith("skills/");
  const isHarness =
    [".gitattributes", "AGENTS.md", "docs/architecture/repository.md", "docs/harness/current-status.md", "scripts/harness/state/feature-list.json", "scripts/harness/contracts/harness.json", "init.sh", "init.ps1", "scripts/harness/contracts/repository-structure.json"].includes(path) ||
    path.startsWith("docs/harness/") || path.startsWith("docs/plans/") ||
    path.startsWith(".github/workflows/") || isScript;

  if (isDocs) flags.add("docs");
  if (isScript) flags.add("scripts");
  if (isFrontend) flags.add("frontend");
  if (isE2e) flags.add("e2e");
  if (isRust) flags.add("rust");
  if (isDependency) flags.add("dependencies");
  if (isSecurity) flags.add("security");
  if (isSkills) flags.add("skills");
  if (isHarness) {
    flags.add("contracts");
    reasons.push("Harness or durable repository contract changed.");
  }

  const knownTopLevel = [
    ".cargo/", ".claude/", ".github/", ".husky/", ".sqlx/", ".storybook/", ".vale/",
    "crates/", "docs/", "public/", "resources/", "scripts/", "skills/", "src/", "src-tauri/", "tests/",
  ].some((prefix) => path.startsWith(prefix));
  const knownRoot = new Set([
    ".claudeignore", ".gitattributes", ".gitignore", ".lintstagedrc.json", ".markdownlint.json",
    ".nvmrc", ".vale.ini", "AGENTS.md", "Cargo.lock", "Cargo.toml", "CHANGELOG.md",
    "CLAUDE.md", "CODE_OF_CONDUCT.md", "LICENSE", "PRIVACY.md",
    "README.md", "RESPONSIBLE_AI.md", "ROADMAP.md", "SECURITY.md", "clippy.toml", "deny.toml",
    "eslint.config.js", "index.html", "init.ps1", "init.sh",
    "package-lock.json", "package.json", "playwright.config.ts", "postcss.config.js",
    "rust-toolchain.toml", "tailwind.config.js", "tsconfig.json", "tsconfig.node.json",
    "vite.config.ts", "vitest.config.ts",
  ]).has(path);
  if (!knownTopLevel && !knownRoot) {
    flags.add("full");
    reasons.push("Path has no verified owner; fail closed with the full lane.");
  }
  return { path, flags: [...flags].sort(), reasons };
}

export function workflowFlags(classifications) {
  const names = ["harness", "frontend", "rust", "security", "skills", "e2e", "full"];
  return Object.fromEntries(names.map((name) => [name, classifications.some((row) => row.flags.includes(name))]));
}
