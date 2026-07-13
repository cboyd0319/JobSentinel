import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  developerLayoutDocGlyphPaths,
  maintainedDocGlyphPaths,
} from "./docs-drift-constants.mjs";

export function hasStaleGettingStartedToolingDocs(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /cargo install tauri-cli@2\.1/.test(text) ||
    /\*\*Tauri 2\.1\*\*/.test(text) ||
    /# Frontend tests\s+npm test\b/.test(text) ||
    /# Lint Rust code\s+cargo clippy\s*(?:\n|$)/.test(text)
  );
}

export function hasStalePlatformVersionTags(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  return /\b(?:Windows|macos|linux)\*\*:\s+[^.\n]*specific features\s+\(v\d+\.\d+\+?\)/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStalePlatformDataPathDocs(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  return /(?:Application Support|\.local\/share)\/com\.jobsentinel\.app/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleMacosDeveloperDocs(root, path) {
  if (path !== "docs/developer/MACOS_DEVELOPMENT.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /JobSentinel_1\.0\.0_aarch64\.dmg|[✅❌⚠️⏳🔐📄📝🟢🟡🔴📊📧📈📉🎯🚀💡🔍⭐🔄📋]/u.test(
    text,
  );
}

export function hasMacosVerificationClaimWithoutEvidence(root, path) {
  if (path !== "docs/developer/MACOS_DEVELOPMENT.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*Status:\*\*[^.\n]*verified/i.test(text) &&
    !/\*\*Evidence:\*\*\s+See\s+\[Current macOS Readiness\]\(#current-macos-readiness\)/i.test(
      text,
    )
  );
}

export function hasStaleTestingReleaseScopedNote(root, path) {
  if (path !== "docs/developer/TESTING.md") {
    return false;
  }

  return /\bAs of v\d+\.\d+(?:\.\d+)?\b/i.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleSqliteConfigurationDoc(root, path) {
  if (path !== "docs/developer/sqlite-configuration.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\p{Extended_Pictographic}/u.test(text) ||
    /SQLite Maximum Protection & Performance Configuration/.test(text) ||
    /\*\*(?:Status|Last Reviewed):\*\*/.test(text) ||
    /Status:\*\* ✅ Fully Implemented/.test(text) ||
    /cache_size`\s*\|\s*\*\*-64000\*\*/.test(text) ||
    /Cache size set \(`PRAGMA cache_size` returns -64000\)/.test(text) ||
    /Cloud backup sync \(optional S3\/GCS upload\)/.test(text) ||
    /Estimated Performance Gain:\*\* 200-300%/.test(text)
  );
}

export function hasUnlinkedLinuxBuildGuide(root, path) {
  if (path !== "docs/developer/LINUX_BUILD.md") {
    return false;
  }

  const docsHubPath = join(root, "docs/README.md");
  return (
    !existsSync(docsHubPath) ||
    !readFileSync(docsHubPath, "utf8").includes("(developer/LINUX_BUILD.md)")
  );
}

export function hasStaleLinuxBuildWorkflowTriggerDoc(root, path) {
  if (path !== "docs/developer/LINUX_BUILD.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Push to `main` branch|Pull requests to `main`/.test(text) ||
    !/workflow_dispatch/.test(text)
  );
}

export function hasUnindexedReleaseNote(root, path) {
  if (
    !path.startsWith("docs/releases/") ||
    !path.endsWith(".md") ||
    path === "docs/releases/README.md"
  ) {
    return false;
  }

  const indexPath = join(root, "docs/releases/README.md");
  const releaseFileName = path.slice("docs/releases/".length);
  return (
    !existsSync(indexPath) ||
    !readFileSync(indexPath, "utf8").includes(`](${releaseFileName})`)
  );
}

export function hasBookmarkletDocStatusEmojiMarkers(root, path) {
  if (path !== "docs/features/browser-import.md") {
    return false;
  }

  return /[✓✗]/u.test(readFileSync(join(root, path), "utf8"));
}

export function hasMaintainedDocGlyphMarkers(root, path) {
  if (!maintainedDocGlyphPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasDeveloperLayoutDocGlyphMarkers(root, path) {
  if (!developerLayoutDocGlyphPaths.has(path)) {
    return false;
  }

  return /[\u{2192}\u{2500}\u{2502}\u{2514}\u{251c}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}
