#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { get } from "node:https";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");
const squashfsMagic = Buffer.from("hsqs", "ascii");
const tauriAppImageExecutableHashes = new Map([
  ["linuxdeploy-x86_64.AppImage", "eb6fec35c90d4e5a271d00abfc84fdfaf47256d75ab4a66be99fbf05dbf99099"],
  [
    "linuxdeploy-plugin-appimage-x86_64.AppImage",
    "cc1aff3d023ab5228a628a0ad35532d10759e58ced5fcccaccf7a916c0a699e6",
  ],
]);
const tauriAppImageScriptHashes = new Map([
  ["linuxdeploy-plugin-gtk.sh", "cb379f9b0733e9ad9f8bd78f8c2fa038aef2478523bb7d4c8e64ff6a1ea3501a"],
]);
export const tauriAppImageToolDownloads = new Map([
  [
    "linuxdeploy-x86_64.AppImage",
    {
      url: "https://github.com/tauri-apps/binary-releases/releases/download/linuxdeploy/linuxdeploy-x86_64.AppImage",
      sha256: "e762bea85c8eb0d4b3508d46e5c1f037f717d0f9303ae3b4aafc8b04991fa1ef",
    },
  ],
  [
    "linuxdeploy-plugin-appimage-x86_64.AppImage",
    {
      url: "https://github.com/linuxdeploy/linuxdeploy-plugin-appimage/releases/download/continuous/linuxdeploy-plugin-appimage-x86_64.AppImage",
      sha256: "e0129b8070e0c7b37151027e46e9fa44fe97ea29e3692705a2c5cff3771d3121",
    },
  ],
  [
    "linuxdeploy-plugin-gtk.sh",
    {
      url: "https://raw.githubusercontent.com/tauri-apps/linuxdeploy-plugin-gtk/master/linuxdeploy-plugin-gtk.sh",
      sha256: "cb379f9b0733e9ad9f8bd78f8c2fa038aef2478523bb7d4c8e64ff6a1ea3501a",
    },
  ],
]);
const helperDownloadLimitBytes = 50 * 1024 * 1024;

function parseArgs(argv) {
  const args = {
    root: defaultRoot,
    target: "x86_64-unknown-linux-gnu",
    help: false,
    skipTauriBuild: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--root") {
      args.root = resolve(argv[++index]);
    } else if (arg === "--target") {
      args.target = argv[++index];
    } else if (arg === "--skip-tauri-build") {
      args.skipTauriBuild = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/build-linux-appimage.mjs [options]

Build the Linux Tauri packages, then recover AppImage packaging with a
linuxdeploy fallback when Tauri leaves a valid AppDir but linuxdeploy exits on
duplicate root desktop/icon entries.

Options:
  --target <triple>       Linux target triple. Default: x86_64-unknown-linux-gnu
  --root <path>           Repository root. Default: current script parent
  --skip-tauri-build      Package an existing AppDir without running Tauri
  -h, --help              Show this help text
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }

  return result;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function verifySha256(path, expectedHash, label = basename(path)) {
  const actualHash = sha256File(path);
  if (actualHash !== expectedHash) {
    throw new Error(
      `${label} SHA-256 mismatch: expected ${expectedHash}, got ${actualHash}`,
    );
  }
}

export function resolveTauriBundlerCache(root, env = process.env) {
  return env.TAURI_BUNDLER_CACHE_DIR ?? join(root, "src-tauri", "target", ".tauri");
}

export function expectedAppImageName(productName, version, target) {
  if (target !== "x86_64-unknown-linux-gnu") {
    throw new Error(`Unsupported Linux AppImage target: ${target}`);
  }
  return `${productName}_${version}_amd64.AppImage`;
}

export function findSquashfsOffsets(buffer) {
  const offsets = [];
  let offset = buffer.indexOf(squashfsMagic);
  while (offset !== -1) {
    offsets.push(offset);
    offset = buffer.indexOf(squashfsMagic, offset + 1);
  }
  return offsets;
}

export function removeRootAppDirDuplicates(appDir) {
  const removed = [];
  for (const entry of readdirSync(appDir)) {
    if (entry === ".DirIcon" || entry.endsWith(".desktop")) {
      rmSync(join(appDir, entry), { force: true });
      removed.push(entry);
    }
  }
  return removed;
}

function downloadHttpsBuffer(url, redirectsRemaining = 5) {
  return new Promise((resolveDownload, rejectDownload) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      rejectDownload(new Error(`Refusing non-HTTPS helper URL: ${url}`));
      return;
    }

    const request = get(
      parsed,
      { headers: { "User-Agent": "JobSentinel-release-build" } },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          if (redirectsRemaining === 0) {
            rejectDownload(new Error(`Too many redirects downloading ${url}`));
            return;
          }
          downloadHttpsBuffer(new URL(location, url).toString(), redirectsRemaining - 1)
            .then(resolveDownload, rejectDownload);
          return;
        }

        if (status !== 200) {
          response.resume();
          rejectDownload(new Error(`Downloading ${url} failed with HTTP ${status}`));
          return;
        }

        const chunks = [];
        let bytes = 0;
        response.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > helperDownloadLimitBytes) {
            request.destroy(new Error(`Downloading ${url} exceeded ${helperDownloadLimitBytes} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolveDownload(Buffer.concat(chunks)));
      },
    );

    request.on("error", rejectDownload);
  });
}

async function downloadVerifiedTool(name, destination) {
  const download = tauriAppImageToolDownloads.get(name);
  if (!download) {
    throw new Error(`No pinned download source for missing AppImage helper: ${name}`);
  }

  console.log(`Downloading pinned AppImage helper: ${name}`);
  const temporaryPath = `${destination}.${process.pid}.tmp`;
  rmSync(temporaryPath, { force: true });
  writeFileSync(temporaryPath, await downloadHttpsBuffer(download.url));
  verifySha256(temporaryPath, download.sha256, `${name} download`);
  chmodSync(temporaryPath, 0o755);
  moveAcrossDevices(temporaryPath, destination);
}

export async function ensureCachedTool(cacheDir, name, options = {}) {
  const download = tauriAppImageToolDownloads.get(name);
  if (!download) {
    throw new Error(`No pinned download source for AppImage helper: ${name}`);
  }

  const downloadTool = options.downloadTool ?? downloadVerifiedTool;
  const path = join(cacheDir, name);
  mkdirSync(cacheDir, { recursive: true });

  if (existsSync(path)) {
    try {
      verifySha256(path, download.sha256, `${name} cache`);
      chmodSync(path, 0o755);
      return path;
    } catch {
      console.warn(`Cached AppImage helper failed hash verification; re-downloading ${name}.`);
      rmSync(path, { force: true });
    }
  }

  await downloadTool(name, path);
  verifySha256(path, download.sha256, `${name} cache`);
  chmodSync(path, 0o755);
  return path;
}

function extractAppImage(appImagePath, destination) {
  if (existsSync(join(destination, "AppRun"))) {
    return;
  }

  const offsets = findSquashfsOffsets(readFileSync(appImagePath));
  let lastError = "";

  for (const offset of offsets) {
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(destination, { recursive: true });
    const result = run("unsquashfs", ["-q", "-o", String(offset), "-d", destination, appImagePath], {
      allowFailure: true,
      stdio: "pipe",
    });

    if (result.status === 0 && existsSync(join(destination, "AppRun"))) {
      return;
    }

    lastError = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
  }

  throw new Error(
    `Unable to extract ${appImagePath} with unsquashfs${lastError ? `: ${lastError}` : ""}`,
  );
}

async function ensureToolLinks(cacheDir, workDir) {
  const linuxdeploy = await ensureCachedTool(cacheDir, "linuxdeploy-x86_64.AppImage");
  const appimagePlugin = await ensureCachedTool(cacheDir, "linuxdeploy-plugin-appimage-x86_64.AppImage");
  const gtkPlugin = await ensureCachedTool(cacheDir, "linuxdeploy-plugin-gtk.sh");

  verifySha256(gtkPlugin, tauriAppImageScriptHashes.get(basename(gtkPlugin)), basename(gtkPlugin));

  const linuxdeployExtract = join(workDir, "linuxdeploy-x86_64.AppImage.extract");
  extractAppImage(linuxdeploy, linuxdeployExtract);
  verifySha256(
    join(linuxdeployExtract, "AppRun"),
    tauriAppImageExecutableHashes.get(basename(linuxdeploy)),
    "linuxdeploy AppRun",
  );

  const binDir = join(workDir, "bin");
  mkdirSync(binDir, { recursive: true });
  symlinkSync(join(linuxdeployExtract, "AppRun"), join(binDir, "linuxdeploy"));
  symlinkSync(realpathSync(gtkPlugin), join(binDir, "linuxdeploy-plugin-gtk.sh"));

  const pluginExtract = join(workDir, "linuxdeploy-plugin-appimage-x86_64.AppImage.extract");
  extractAppImage(appimagePlugin, pluginExtract);
  verifySha256(
    join(pluginExtract, "AppRun"),
    tauriAppImageExecutableHashes.get(basename(appimagePlugin)),
    "linuxdeploy-plugin-appimage AppRun",
  );
  symlinkSync(join(pluginExtract, "AppRun"), join(binDir, "linuxdeploy-plugin-appimage"));

  return binDir;
}

function writeSha256(path) {
  const hash = sha256File(path);
  writeFileSync(`${path}.sha256`, `${hash}  ${basename(path)}\n`, "utf8");
  return hash;
}

function moveAcrossDevices(source, destination) {
  try {
    renameSync(source, destination);
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }
    copyFileSync(source, destination);
    rmSync(source, { force: true });
  }
}

function cleanAppImages(appimageDir) {
  if (!existsSync(appimageDir)) {
    return;
  }
  for (const entry of readdirSync(appimageDir)) {
    if (entry.endsWith(".AppImage") || entry.endsWith(".AppImage.sha256")) {
      rmSync(join(appimageDir, entry), { force: true });
    }
  }
}

async function fallbackBundle({ root, target, productName, version, cacheDir }) {
  const appimageDir = join(root, "src-tauri", "target", target, "release", "bundle", "appimage");
  const appDir = join(appimageDir, `${productName}.AppDir`);
  if (!existsSync(appDir)) {
    throw new Error(`Tauri AppImage AppDir was not created: ${appDir}`);
  }

  const removed = removeRootAppDirDuplicates(appDir);
  if (removed.length > 0) {
    console.log(`Removed duplicate AppDir root entries: ${removed.join(", ")}`);
  }

  const workDir = mkdtempSync(join(tmpdir(), "jobsentinel-linuxdeploy-"));
  const binDir = await ensureToolLinks(cacheDir, workDir);
  const env = {
    ...process.env,
    APPIMAGE_EXTRACT_AND_RUN: "1",
    PATH: `${binDir}:${process.env.PATH ?? ""}`,
  };

  const result = run(
    "linuxdeploy",
    ["--verbosity", "1", "--appdir", appDir, "--plugin", "gtk", "--output", "appimage"],
    {
      cwd: workDir,
      env,
      allowFailure: true,
    },
  );

  if (result.status !== 0) {
    throw new Error(`fallback linuxdeploy AppImage packaging exited with ${result.status}`);
  }

  const generated = readdirSync(workDir).filter((entry) => entry.endsWith(".AppImage"));
  if (generated.length !== 1) {
    throw new Error(`Expected exactly one fallback AppImage, found ${generated.length}`);
  }

  cleanAppImages(appimageDir);
  const destination = join(appimageDir, expectedAppImageName(productName, version, target));
  moveAcrossDevices(join(workDir, generated[0]), destination);
  chmodSync(destination, 0o755);
  const digest = writeSha256(destination);
  console.log(`Fallback AppImage created: ${destination}`);
  console.log(`Fallback AppImage SHA-256: ${digest}`);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const root = args.root;
  const config = readJson(join(root, "src-tauri", "tauri.conf.json"));
  const productName = config.productName;
  const version = config.version;
  const appimageDir = join(root, "src-tauri", "target", args.target, "release", "bundle", "appimage");
  const cacheDir = resolveTauriBundlerCache(root);

  if (!productName || !version) {
    throw new Error("src-tauri/tauri.conf.json must include productName and version");
  }

  if (!args.skipTauriBuild) {
    rmSync(appimageDir, { recursive: true, force: true });
    mkdirSync(cacheDir, { recursive: true });
    const result = run("npx", ["--no-install", "tauri", "build", "--target", args.target], {
      cwd: root,
      env: {
        ...process.env,
        APPIMAGE_EXTRACT_AND_RUN: "1",
        TAURI_BUNDLER_CACHE_DIR: cacheDir,
      },
      allowFailure: true,
    });

    if (result.status === 0) {
      console.log("Tauri AppImage build completed without fallback.");
      return;
    }

    console.log(`Tauri AppImage build exited with ${result.status}; trying fallback packaging.`);
  }

  await fallbackBundle({ root, target: args.target, productName, version, cacheDir });
}

if (process.argv[1] === scriptPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
