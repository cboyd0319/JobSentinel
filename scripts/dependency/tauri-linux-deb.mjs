import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const tauriConfigPath = "src-tauri/tauri.conf.json";
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function collectTauriLinuxDebDependencyViolations(root = defaultRoot) {
  const configPath = join(root, tauriConfigPath);
  if (!existsSync(configPath)) {
    return [];
  }

  let tauriConfig;
  try {
    tauriConfig = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return [`${tauriConfigPath} must be valid JSON for Linux Debian dependency checks`];
  }

  const dependencies = tauriConfig?.bundle?.linux?.deb?.depends;
  if (!Array.isArray(dependencies)) {
    return [];
  }

  const violations = [];
  if (dependencies.some((dependency) => String(dependency).startsWith("libwebkit2gtk-4.0"))) {
    violations.push(
      `${tauriConfigPath} must not declare Tauri v1 WebKitGTK runtime dependencies; use libwebkit2gtk-4.1-0 for Tauri v2 Debian packages`,
    );
  }

  if (!dependencies.includes("libwebkit2gtk-4.1-0")) {
    violations.push(
      `${tauriConfigPath} Debian dependencies must include libwebkit2gtk-4.1-0 for Tauri v2 Linux packages`,
    );
  }

  return violations;
}
