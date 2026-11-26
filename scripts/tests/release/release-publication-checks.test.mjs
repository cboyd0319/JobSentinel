// Proves the publication readiness lint rejects bypasses of the verified-draft, id-scoped mutation and timeout rules.
import assert from "node:assert/strict";
import test from "node:test";

import { evaluateReleaseReadinessFromInputs, loadReleaseReadinessInputs } from "../../release/check-release-readiness.mjs";

const inputs = loadReleaseReadinessInputs({ env: {} });
const id = "publication requires final-phase evidence and a verified draft";
const failing = (overrides) => evaluateReleaseReadinessFromInputs({ ...inputs, ...overrides }).criteria.find((item) => item.id === id).ok === false;
const release = (from, to) => {
  assert(inputs.releaseWorkflow.includes(from), from);
  return { releaseWorkflow: inputs.releaseWorkflow.replace(from, to) };
};
const withJob = (job) => release("  release-inputs:\n", `  ${job.trim()}\n\n  release-inputs:\n`);
const gate = '          node scripts/release/publish-gate.mjs "${args[@]}"';
const publish = '          exec node scripts/release/publish-release.mjs "${args[@]}"';
const confirm = '          node scripts/release/confirm-verified-draft.mjs --repo "$GITHUB_REPOSITORY" \\\n';
const stageUpload = '          node scripts/release/draft-assets.mjs upload --repo "$GITHUB_REPOSITORY" \\\n            --release-id "$RELEASE_ID" --tag "$RELEASE_TAG" --tag-commit "$GITHUB_SHA" -- "${assets[@]}"';
const linuxDelete = "          node scripts/release/draft-assets.mjs delete-stale --platform linux";
const windowsCheck = "          if ($LASTEXITCODE -ne 0) { exit 1 }\n";
const gateStep = "      - name: Verify final-phase evidence certifies the draft\n";
const publishStep = "      - name: Publish hosted release\n        shell: bash\n";
const swallow = ["||", "true"].join(" ");

test("the current release workflows pass the publication lint", () => {
  assert.equal(failing({}), false);
});

test("publication lint rejects conditions and failure softening in gate jobs", () => {
  assert(failing(release("    if: needs.release-inputs.outputs.mode == 'publish'", "    if: ${{ always() }}")));
  assert(failing(release("    if: needs.release-inputs.outputs.mode == 'publish'", "    if: needs.release-inputs.outputs.mode == 'publish' || always()")));
  assert(failing(release("  publication:\n", "  publication:\n    if: ${{ github.actor == 'release-bot' }}\n")));
  assert(failing(release("      - name: Publish hosted release\n", "      - name: Publish hosted release\n        if: ${{ !cancelled() }}\n")));
  assert(failing(release("      - name: Verify draft release assets\n", "      - name: Verify draft release assets\n        if: false\n")));
  assert(failing(release("  verify-draft-release:\n", "  verify-draft-release:\n    if: false\n")));
  assert(failing(release(gateStep, `${gateStep}        continue-on-error: true\n`)));
  assert(failing(release(gate, `${gate} ${swallow}`)));
  assert(failing(release(gate, `${gate} || :`)));
  assert(failing(release(gate, `${gate} || echo skipped`)));
  assert(failing(release(gate, `${gate} || exit  0`)));
  assert(failing(release(gate, `          [ -n "$SKIP" ] || ${gate.trim()}`)));
  assert(failing(release("          set -euo pipefail\n\n          args=(\n            --version", "          set +e\n\n          args=(\n            --version")));
  assert(failing(release("          set -euo pipefail\n\n          args=(\n            --version", "          set +o errexit\n\n          args=(\n            --version")));
  assert(failing(release(gate, `${gate}\n          exit 0`)));
  assert(failing(release(publishStep, "      - name: Publish hosted release\n        shell: bash {0}\n")));
  assert(failing(release(publishStep, "      - name: Publish hosted release\n        shell: bash --noprofile --norc {0}\n")));
});

test("publication lint requires gate commands to run on their own lines, in order", () => {
  assert(failing(release(gate, `          # ${gate.trim()}`)));
  assert(failing(release(gate, `          echo ${gate.trim()}`)));
  assert(failing(release(publish, `          true ${publish.trim()}`)));
  assert(failing(release(publish, publish.replace("exec ", ""))), "the publisher must be exec'd so it receives cancellation signals");
  assert(failing(release(publish, `          exec echo ${publish.trim().slice(5)}`)));
  assert.equal(failing(release(gate, `          exec ${gate.trim()}`)), false, "exec is accepted on other gate commands");
  assert(failing(release(confirm, `          : ${confirm.trimStart()}`)));
  assert(failing(release('--asset-digest "$ASSET_DIGEST" --evidence-revision', "--evidence-revision")));
  assert(failing(release('--source-revision "$GITHUB_SHA"', "--source-revision HEAD")));
});

test("publication lint allows one local publisher, run only by the publication job", () => {
  assert(failing(release("  publish-release:\n", "  publish-again:\n    uses: ./.github/workflows/release-publish.yml\n\n  publish-release:\n")));
  assert(failing(release("  publish-release:\n", '  publish-again:\n    uses: "./.github/workflows/release-publish.yml"\n\n  publish-release:\n')));
  assert(failing(release("  publish-release:\n", "  publish-remote:\n    uses: someone/fork/.github/workflows/release-publish.yml@main\n\n  publish-release:\n")));
  assert(failing(release("  verify-draft-release:\n", "  verify-again:\n    uses: ./.github/workflows/release-verify-draft.yml\n\n  verify-draft-release:\n")));
  assert(failing(release("    uses: ./.github/workflows/release-publish.yml\n", "    uses: ./.github/workflows/release-publish-unchecked.yml\n")));
  for (const command of ["node scripts/release/publish-release.mjs --release-id 1", "npm run release:publish -- --release-id 1"]) {
    assert(failing(withJob(`sneaky-publish:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: ${command}`)), command);
  }
  assert(failing(release('run: node scripts/release/stage-target.mjs --repo "$GITHUB_REPOSITORY"', 'run: true --repo "$GITHUB_REPOSITORY"')));
  assert(failing(release('if [ "$STAGE_STATE" = "draft" ]; then', 'if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then')));
  assert(failing(release("  cancel-in-progress: false\n", "  cancel-in-progress: true\n")));
});

test("publication lint rejects gh release and gh api mutations in any spelling", () => {
  for (const command of [
    "gh api --method PATCH repos/o/r/releases/1 -F draft=false",
    "gh api -X DELETE repos/o/r/releases/1",
    'gh api -X "$M" repos/o/r/releases/1',
    'gh release delete "$RELEASE_TAG" -y',
    'gh release edit "$RELEASE_TAG" --draft',
    'gh  release edit "$RELEASE_TAG" --draft',
    'gh release upload "$RELEASE_TAG" extra.bin --clobber',
    'gh release delete-asset "$RELEASE_TAG" extra.bin -y',
  ]) {
    assert(failing(withJob(`sneaky:\n    runs-on: ubuntu-24.04\n    env:\n      M: patch\n    steps:\n      - run: ${command}`)), command);
  }
});

test("publication lint requires every asset mutation to run through the id-scoped script, unsoftened", () => {
  assert(failing(release(stageUpload, "          true")));
  assert(failing(release(linuxDelete, `          echo ${linuxDelete.trim()}`)));
  assert(failing(release("      - name: Remove old Linux release assets\n", "      - name: Remove old Linux release assets\n        continue-on-error: true\n")));
  assert(failing(release(stageUpload, `${stageUpload} ${swallow}`)));
  assert(failing(release(windowsCheck, "")));
});

test("publication lint keeps the gate jobs install-free", () => {
  for (const install of ["npm ci", "npm add left-pad", "npm exec some-tool", "npx some-tool", "yarn install", "pnpm install", "corepack enable"]) {
    assert(failing(release(gateStep, `      - name: Install\n        run: ${install}\n\n${gateStep}`)), install);
  }
  const action = `      - name: Third-party action\n        uses: someone/action@${"a".repeat(40)}\n\n`;
  assert(failing(release(gateStep, `${action}${gateStep}`)));
  assert(failing(release("      - name: Verify draft release assets\n", `${action}      - name: Verify draft release assets\n`)));
  const setupNode = "        timeout-minutes: 5\n        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020";
  assert(failing(release(setupNode, "        timeout-minutes: 5\n        uses: actions/setup-node@v7")));
});

test("publication lint keeps the job timeout above every step cap plus the publish budget", () => {
  assert(failing(release("    timeout-minutes: 60\n    environment:\n      name: release\n", "    timeout-minutes: 5\n    environment:\n      name: release\n")));
  assert(failing(release(`${gateStep}        id: publish_gate\n        timeout-minutes: 20\n`, `${gateStep}        id: publish_gate\n        timeout-minutes: 40\n`)));
  assert(failing(release(`${gateStep}        id: publish_gate\n        timeout-minutes: 20\n`, `${gateStep}        id: publish_gate\n`)));
  assert(failing(release("      - name: Confirm the verified draft is unchanged\n        timeout-minutes: 5\n", "      - name: Confirm the verified draft is unchanged\n")));
  assert(failing(release(publishStep, "      - name: Publish hosted release\n        timeout-minutes: 20\n        shell: bash\n")));
});

test("publication lint checks the public verifier workflow and release docs", () => {
  assert(failing({ verifyWorkflow: inputs.verifyWorkflow.replace('--github-output "$GITHUB_OUTPUT"', "") }));
  assert(failing({ verifyWorkflow: `${inputs.verifyWorkflow}\nplatforms="\${DISPATCH_PLATFORMS:-windows,macos,linux}"\n` }));
  assert(failing({ releaseDocs: inputs.releaseDocs.replace("docs/releases/vX.Y.Z-final-phases.json", "") }));
});
