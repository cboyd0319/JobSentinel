// Checks that release publication cannot bypass draft verification, phase evidence or the build/publish split.
import { spawnSync } from "node:child_process";

import { workflowJobBlock } from "../lib/workflow-text.mjs";
import { checkFinalPhaseEvidence } from "./final-phase-evidence.mjs";
import { hasAll } from "./macos-readiness-text.mjs";
import { hasOrderedSnippets } from "./macos-readiness-workflow.mjs";
import { publishVerifyBudgetMs, redraftWindowMs } from "./publish-release.mjs";

const publishCondition = "    if: needs.release-inputs.outputs.mode == 'publish'";
const publishStepName = "- name: Publish hosted release";
/** Slack beyond the publish budget and the retried re-draft window, for process start and the last PATCH. */
const timeoutSlackMinutes = 1;
/** Ways a shell step can survive a failed command. Applied to gate jobs and every mutating step. */
const softeningPatterns = [
  /continue-on-error/,
  /always\(\)/,
  /failure\(\)/,
  /cancelled\(\)/,
  /\|\|\s*(?:true|:|echo)\b|\|\|\s*:/,
  /set\s+\+e/,
  /set\s+\+o/,
  /exit 0/,
  /\]\s*\|\|/,
  /^\s*shell: (?!(?:bash|pwsh)\s*$)/m,
];
/** Only staging creates a release; every other release or API mutation goes through draft-assets.mjs by id. */
const forbiddenMutations = [/\bgh release (?!create\b)/, /\bgh api\b/];
const createMutation = /gh release create\b/;
const draftAssets = "node scripts/release/draft-assets.mjs";
const publishCommands = /\bscripts\/release\/publish-release\.mjs\b|\brelease:publish(?![\w:-])/;
const installCommands = /\bnpm\b|\bnpx\b|\byarn\b|\bpnpm\b|\bcorepack\b/;
const installFreeAction = /^actions\/(?:checkout|setup-node)@[0-9a-f]{40}$/;
const releaseCallers = ["release-publish.yml", "release-verify-draft.yml"];

function occurrences(text, pattern) {
  return (String(text).match(new RegExp(pattern, "g")) ?? []).length;
}

/** Drops whole-line comments, collapses whitespace after indentation and unquotes `uses:` so variants match. */
function normalized(text) {
  return String(text ?? "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .map((line) => line.replace(/(\S)[ \t]+/g, "$1 ").trimEnd())
    .join("\n")
    .replace(/(uses: )["']([^"'\n]+)["']/g, "$1$2");
}

/** True when `command` starts its own line, optionally after `exec` (no `echo`, `:` or `true` prefix), within `text`. */
function runsCommand(text, command) {
  return new RegExp(`^\\s*(?:exec )?${command.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?:\\s|$)`, "m").test(text);
}

function softened(text) {
  return softeningPatterns.some((pattern) => pattern.test(text));
}

function workflowSteps(text) {
  return text.split(/\n(?=[ \t]+- [a-z][a-z0-9_-]*:)/);
}

/** Install-free jobs run only pinned first-party checkout and setup-node actions and no package manager. */
function installFree(job) {
  const actions = [...job.matchAll(/^\s*(?:- )?uses: (\S+)/gm)].map((match) => match[1]);
  return !installCommands.test(job) && actions.every((action) => installFreeAction.test(action));
}

/**
 * The publication job outlives its work: every step but the self-budgeted publish step declares a cap, and the job
 * timeout covers those caps, the publish budget, the retried re-draft window and slack, so re-drafting always runs.
 */
function publicationTimeoutsContainPublish(publishJob) {
  const [header, ...steps] = workflowSteps(publishJob);
  const jobMinutes = Number(header.match(/^ {4}timeout-minutes: (\d+)$/m)?.[1]);
  const caps = steps.map((step) => Number(step.match(/^ {8}timeout-minutes: (\d+)$/m)?.[1]));
  const publishIndex = steps.findIndex((step) => step.trimStart().startsWith(publishStepName));
  if (publishIndex < 0 || !Number.isNaN(caps[publishIndex])) return false;
  const stepCaps = caps.filter((_, index) => index !== publishIndex);
  if (stepCaps.some((cap) => !Number.isInteger(cap) || cap <= 0)) return false;
  const publishMinutes = Math.ceil((publishVerifyBudgetMs + redraftWindowMs) / 60_000) + timeoutSlackMinutes;
  const required = stepCaps.reduce((sum, cap) => sum + cap, 0) + publishMinutes;
  return Number.isInteger(jobMinutes) && jobMinutes >= required;
}

/**
 * No step edits, deletes or patches a release through gh, and no step calls gh api. Asset uploads and deletes run
 * only through draft-assets.mjs, which re-checks the draft guard by id in the same process, in unsoftened steps; a
 * PowerShell caller checks $LASTEXITCODE. Release creation happens only in staging when stage-target found none.
 */
function releaseMutationsAreDraftGuarded(text) {
  if (forbiddenMutations.some((pattern) => pattern.test(text))) return false;
  const uploads = occurrences(text, `${draftAssets} upload --repo`);
  if (uploads !== 4 || !["linux", "macos", "windows"].every((platform) => text.includes(`${draftAssets} delete-stale --platform ${platform} `))) {
    return false;
  }
  return workflowSteps(text).every((step) => {
    if (createMutation.test(step)) {
      return step.includes("- name: Create staged release") && step.indexOf('[ "$STAGE_STATE" = "none" ]') < step.search(createMutation);
    }
    if (!step.includes(draftAssets)) return true;
    if (softened(step) || !runsCommand(step, draftAssets)) return false;
    return !/shell: pwsh/.test(step) || /--tag-commit \$env:GITHUB_SHA\n\s*if \(\$LASTEXITCODE -ne 0\) \{ exit 1 \}/.test(step);
  });
}

/**
 * Publication runs only in publish mode, under a tag-keyed queue, after the evidence gate, then the full
 * unchanged-draft confirmation, then the script that publishes by id and re-drafts on any later failure.
 * Only the publication job may run the publisher, and it must `exec` it: the runner signals only the step's top
 * process on cancellation, so a child node would never get to re-draft. The draft-verification path has no conditions; it runs in
 * build-draft mode through its needs. These are regression guards against accidental edits, not a boundary
 * against repository writers.
 */
export function publicationRequiresVerifiedDraft(releaseWorkflow, verifyWorkflow) {
  const text = normalized(releaseWorkflow);
  const verifyCaller = workflowJobBlock(text, "verify-draft-release");
  const verifyJob = workflowJobBlock(text, "draft-verification");
  const publishCaller = workflowJobBlock(text, "publish-release");
  const publishJob = workflowJobBlock(text, "publication");
  const jobs = [verifyCaller, verifyJob, publishCaller, publishJob];
  return (
    jobs.every(Boolean) &&
    !jobs.some(softened) &&
    releaseMutationsAreDraftGuarded(text) &&
    publicationTimeoutsContainPublish(publishJob) &&
    !publishCommands.test(text.replace(publishJob, "")) &&
    releaseCallers.every(
      (file) =>
        occurrences(text, `uses:\\s*\\./\\.github/workflows/${file.replace(".", "\\.")}`) === 1 &&
        !new RegExp(`uses:\\s*[\\w.-]+/[\\w.-]+/\\.github/workflows/${file.replace(".", "\\.")}@`).test(text),
    ) &&
    !/draft=false|\bPATCH\b/.test(text) &&
    hasAll(text, ["concurrency:", "group: release-${{ github.ref }}", "cancel-in-progress: false"]) &&
    hasOrderedSnippets(text, [
      "- name: Refuse to re-draft a published release",
      "node scripts/release/stage-target.mjs",
      "- name: Create staged release",
      'if [ "$STAGE_STATE" = "draft" ]; then',
      "node scripts/release/stage-target.mjs --require-draft",
    ]) &&
    (publishCaller.match(/\bif:/g) ?? []).length === 1 &&
    publishCaller.includes(`${publishCondition}\n`) &&
    publishCaller.includes("uses: ./.github/workflows/release-publish.yml") &&
    !/\bif:/.test(publishJob + verifyCaller + verifyJob) &&
    hasAll(publishJob, [
      "name: release",
      "fetch-depth: 0",
      '--evidence-revision "$EVIDENCE_REF"',
      '--source-revision "$GITHUB_SHA"',
      '--tag-commit "$GITHUB_SHA"',
      '--asset-digest "$ASSET_DIGEST"',
      '--release-id "$RELEASE_ID"',
    ]) &&
    installFree(publishJob) &&
    installFree(verifyJob) &&
    ["node scripts/release/publish-gate.mjs", "node scripts/release/confirm-verified-draft.mjs", "node scripts/release/publish-release.mjs"].every(
      (command) => runsCommand(publishJob, command),
    ) &&
    /^\s*exec node scripts\/release\/publish-release\.mjs /m.test(publishJob) &&
    hasOrderedSnippets(publishJob, [
      "node scripts/release/publish-gate.mjs",
      "node scripts/release/confirm-verified-draft.mjs",
      "node scripts/release/publish-release.mjs",
    ]) &&
    hasAll(verifyCaller, ["- build-release", "uses: ./.github/workflows/release-verify-draft.yml"]) &&
    runsCommand(verifyJob, "node scripts/release/verify-public-release-assets.mjs") &&
    hasAll(verifyJob, ["--draft", '--selection "$RELEASE_SELECTION"', '--expected-revision "$GITHUB_SHA"', "--draft-manifest"]) &&
    !/gh api|gh release|draft=false/.test(verifyCaller + verifyJob) &&
    hasAll(verifyWorkflow, ['--github-output "$GITHUB_OUTPUT"', "needs.verify-public-release-assets.outputs.macos_source"]) &&
    !verifyWorkflow.includes("windows,macos,linux}")
  );
}

/**
 * Local evidence gate for `release:readiness --version`. Evidence is read from HEAD (commit E). When tag vX.Y.Z
 * exists locally, sourceRevision must equal its commit; otherwise only structure, records and ancestry are checked.
 * Draft asset digests need the hosted draft and are checked only by `release:publish-gate`.
 */
export function localFinalPhaseEvidence({ root, version }) {
  const tag = `v${version}`;
  const tagged = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`], { cwd: root, encoding: "utf8" });
  const sourceRevision = tagged.status === 0 ? tagged.stdout.trim() : undefined;
  const scope = sourceRevision ? `against local tag ${tag} (${sourceRevision})` : `without local tag ${tag}`;
  try {
    checkFinalPhaseEvidence({ root, version, evidenceRevision: "HEAD", sourceRevision });
    return { ok: true, detail: `Final-phase evidence at HEAD is valid ${scope}; draft digests are checked by release:publish-gate.` };
  } catch (error) {
    return { ok: false, detail: `Final-phase evidence at HEAD ${scope}: ${error instanceof Error ? error.message : String(error)}` };
  }
}
