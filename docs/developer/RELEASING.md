<!-- Defines the maintained release, signing, publication, and rollback contract. -->

# Release Contract

Release execution is separate from normal development and requires explicit user
authority. GitHub-hosted release, publication, and public-verification workflows
are manual. Their existence does not authorize dispatch, signing, upload,
attestation, or publication.

## Mandatory final release phases

Standing rule, effective with v3 and every subsequent release: after feature
engineering and candidate preparation, the final three phases before **any**
release are **Stability, Performance, Security**, in that order. Each is a full,
separately planned and evidenced phase with its own entry criteria, work, defect
resolution and pass decision. This applies to major, minor, patch and prereleases.
A quick check, combined checklist or development checkpoint cannot replace a phase.

### 1. Stability

Entry: engineering is complete and the candidate, advertised platforms and
acceptance matrix are frozen. Run full applicable suites, installed user journeys,
accessibility, persistence, migration, backup, rollback, interrupted-operation and
failure-recovery scenarios, and sustained-use reliability checks. Resolve blocking
defects and accept reproducible candidate-bound evidence before Performance starts.

### 2. Performance

Entry: Stability has passed. Measure startup, interaction and workflow latency,
throughput, CPU, memory, disk, network and model workloads across representative
supported hardware. Run the declared distributions and budgets, including modest
hardware and commercial comparisons. Resolve regressions, recheck stability affected
by optimization changes, and accept measured evidence before Security starts.

### 3. Security

Entry: Stability and Performance pass for the candidate. Complete the final
threat-boundary and adversarial review, current dependency/advisory and secret
checks, abuse/failure cases, privacy and permission verification, and supply-chain
validation. Verify required signatures, notarization, checksums, SBOMs, attestations
and packaged artifacts. Resolve release-blocking findings and accept security
evidence before publication approval.

The release owner records each phase's scope, commands, results, remaining risks,
source revision and tested artifacts. Required skipped, failed or deferred work
leaves its phase incomplete. Existing development-stage deferrals do not waive
these release gates. Any exception requires explicit user approval and is recorded
in the release decision, never in phase evidence, which rejects waivers. Never
infer approval from an earlier deferral.

All three phases must pass for the intended release candidate. Subsequent changes
invalidate affected evidence: repeat the affected phase work and downstream checks
before publication. Signature-only changes require applicable artifact/trust checks,
not automatic reruns of unrelated unchanged behavior. Because the evidence certifies
exact draft digests, any re-signed or rebuilt draft, including a `build-draft`
rerun, needs new evidence; only the affected phase work is repeated, and the
records must still name the new draft. Gate 6/publication follows
these phases; publication itself is a delivery action, not a replacement phase.

Focused development checks continue while engineering is underway. These full
phases run at the end, beginning with the v3 release.

### Certified draft and phase evidence

The phases certify the exact hosted draft binaries that get published:

1. Dispatch `release.yml` from tag `vX.Y.Z` (commit T) with `mode: build-draft`.
   It stages, builds and verifies the draft, and never publishes. Staging refuses a
   tag that already has a published release. Every asset delete or upload runs
   `scripts/release/draft-assets.mjs`, which re-checks by release id that the
   release is still this tag's draft, then deletes by asset id and uploads by release
   id in the same process. Draft verification requires the draft body to equal
   the notes `release-notes.mjs` generates from T, compared after converting CRLF
   and CR to LF and dropping trailing whitespace, so a mismatch fails before the
   phases. The `verify-draft-release` job summary lists the release id, T and
   every draft asset's name and SHA-256.
2. Run Stability, Performance and Security against those draft assets.
3. Commit evidence commit E, descending from T, that adds only
   `docs/releases/vX.Y.Z-final-phases.json` and the phase records and command
   proofs it references in `docs/releases/vX.Y.Z-phases/`:

   ```json
   {
     "schemaVersion": 1,
     "version": "X.Y.Z",
     "sourceRevision": "<T, full commit SHA>",
     "releaseId": 123456789,
     "platforms": ["linux", "macos", "windows"],
     "artifacts": [{ "name": "<draft asset>", "sha256": "<hex>" }],
     "phases": [
       { "phase": "stability", "status": "passed", "startedAt": "<UTC ISO-8601>", "completedAt": "<UTC ISO-8601>", "record": "docs/releases/vX.Y.Z-phases/stability.json" },
       { "phase": "performance", "status": "passed", "startedAt": "...", "completedAt": "...", "record": "..." },
       { "phase": "security", "status": "passed", "startedAt": "...", "completedAt": "...", "record": "..." }
     ]
   }
   ```

   `artifacts` is the draft manifest's list, sorted by name. `platforms` is the
   sorted platform set of the draft's release platform declaration; the publish
   gate and public verification reject any other set. Each record is JSON with
   exactly these fields:

   - `phase`, `"status": "passed"`, `sourceRevision` (T), `releaseId`,
     `platforms` (equal to the evidence `platforms`) and `testedArtifacts` (the
     same list as `artifacts`).
   - `scope`, `results` (text or non-empty list) and `remainingRisks` (list).
   - `commands`: a non-empty list of `command`, `exitCode` and
     `proof: { path, sha256 }` objects. Every `exitCode` is 0. The proof is a
     JSON file directly in the record directory whose SHA-256 at E matches. It
     holds exactly `schemaVersion` 1, `phase`, `sourceRevision` (T), `command`
     (the same text), `platform` (a release platform), `exitCode` 0, non-empty
     `output`, `startedAt` and `completedAt` inside the phase window, and
     `artifacts` (the evidence list). Each release platform needs at least one
     proof per phase.
   - `decision`: `owner`, `rationale` and a UTC ISO-8601 `acceptedAt` no earlier
     than the phase's `completedAt` and no later than the next phase's
     `startedAt`, or E's commit for Security.

   Phases appear in this order and do not overlap. Every timestamp falls after T's
   commit and the newest draft asset upload, and no later than E's commit. A
   `build-draft` rerun therefore invalidates the phases. Duplicate JSON keys and
   unknown fields, including waivers, are rejected. Any other change between T and
   E, including an unreferenced file in the record directory, invalidates the
   evidence.

4. Push E to a branch, because the publish job's full-history checkout of the tag
   finds E only through a pushed ref. Then dispatch `release.yml` from the same
   tag with `mode: publish`, `evidence_ref` E and the same `platform` input as
   the `build-draft` run. The `release` environment applies. The workflow runs the
   scripts with `node`, not `npm run`. `publish-gate.mjs`
   (`release:publish-gate`) checks the evidence, that the tag still resolves to T,
   and that the draft id, platform set, exact asset set and every SHA-256 match
   the evidence. It also re-runs full draft verification, including that body
   check. `confirm-verified-draft.mjs`
   (`release:confirm-draft`) then rechecks the id, tag commit, body and asset list, and
   requires every asset's API content digest, when GitHub reports one, to equal
   the evidence SHA-256. `publish-release.mjs` (`release:publish`) then publishes
   by release id, setting the body to those generated notes and requiring the
   response to carry them, and downloads the public assets anonymously. On any failure once
   the publish request is attempted, including a failed or timed-out request and
   any verification failure, it returns the release to draft by id and fails.
   The re-draft retries network errors, 5xx responses and rate limits for up to
   4 minutes. The gate and confirmation steps have step timeouts. The publish
   step has a 20-minute budget that bounds every request, download and attestation
   call. `release:readiness` keeps the job timeout above the step timeouts, that
   budget, the re-draft window and a margin, so the re-draft runs before the job
   timeout. The release is public during that window, and a failed re-draft is
   reported as such. Runs for one tag never overlap. GitHub keeps only one pending run per concurrency group, so a newer
   dispatch cancels an older run that is still pending.

Cancelling the run sends SIGINT and then SIGTERM only to the step's top process,
and SIGKILL follows about 10 seconds after the first signal. The publish step
therefore runs `exec node scripts/release/publish-release.mjs`, so `node` is that
process. Once the publish request was attempted, it waits up to 3 seconds for an
in-flight publish request, returns the release to draft by id within 7 seconds of
the first signal, retrying transient failures, then fails. Attestation calls run
asynchronously, so a signal is handled while `gh` runs. A SIGKILL, a lost runner or
a failed re-draft can leave the release public. Check the run log, then re-draft it
by id with a token that has push access:

```bash
gh api -X PATCH repos/<owner/repo>/releases/<release id> -F draft=true
```

This cancellation path is proven only by local process tests. Before relying on
it, run a hosted cancel drill on a throwaway tag: publish a throwaway draft,
cancel the run after the publish step starts, and confirm that the release returns
to draft.

E's committer date is chosen by its author, so the "no later than E" bound is
advisory. The server-observed bound is the draft upload time: phases cannot claim
to start before the newest draft asset was uploaded.

Do not enable GitHub immutable releases until the containment trade-off is decided.
Once an immutable release is published, GitHub allows only title, notes, pre-release
and latest changes, so the post-publication re-draft would likely be refused. This
contract does not assume immutable releases.

`npm run release:readiness -- --version vX.Y.Z` validates the evidence at `HEAD`
locally: against the local tag commit when the tag exists, otherwise only its
structure, records and ancestry. It cannot check draft digests offline. Without
`--version` it skips this gate, as the `build-draft` preflight does.

## Preconditions

Before tagging, building release assets, uploading, or publishing:

1. Close or explicitly rescope the active work in `docs/harness/current-status.md` and
   `scripts/harness/state/feature-list.json`.
2. Confirm one source revision and exact `X.Y.Z` version across Cargo, npm,
   Tauri, lockfiles, changelog, and `docs/releases/vX.Y.Z.md`.
3. Obtain explicit authority for every external mutation: tag push, release
   creation, asset deletion, upload, publication, signing, or notarization.
4. Before publication, complete the three [final release phases](#mandatory-final-release-phases)
   and commit their [evidence](#certified-draft-and-phase-evidence).
5. Use only local or explicitly authorized hosted or native runners. Workflow
   configuration is not evidence; retain the actual run and artifact evidence.

## Signed Update Candidates

`release:sign-update` creates the local updater's installer-adjacent
`.manifest.json` and `.sig` files. It uses the update-candidate signature domain;
pack envelopes are not interchangeable. Provide the exact installer and reviewed
JSON metadata containing `version`, `minimum_source`, `maximum_source` (v3 integer
triplets), `edition`, `compatibility` and all eight `readers` ranges from
`crates/jobsentinel-application/src/update_preflight.rs`. No platform, architecture,
source-version range or data-format floor is inferred from the build host.

```bash
npm run release:sign-update -- \
  --package release-assets/public/installer.pkg --metadata candidate-spec.json \
  --publisher-key-id RELEASE_KEY_ID --expected-public-key-hex PUBLIC_KEY_HEX \
  --key-env AUTHORIZED_UPDATE_SIGNING_KEY
```

The authorized consuming process must receive that environment variable through
approved secret injection; never put a private key in arguments or files. The
producer checks the expected Ed25519 public identity, hashes the installer, and
writes both sidecars exclusively. Existing files and symlinks are refused; failed
pair creation removes only files created by that invocation. The installer stays
unchanged. Metadata is limited to 64 KiB, installers to 512 MiB, and numeric input
to exact safe integers. Supported installer extensions match the local updater:
macOS DMG/PKG, Windows MSI/EXE, Linux DEB/RPM. AppImage is not a local-update input.

Synthetic CLI output is tested through actual Rust preflight, including altered
package, metadata and signature refusal. This establishes format interoperability,
not native installation or release trust. The user approved public update-trust
enrollment first, source freeze second, then building/signing exact unpublished
3.0.0/3.0.1 qualification artifacts before installed R1 journeys. Final full R3
Security remains after R2.
The application registry contains the approved `jobsentinel-update-publisher-v1`
public key. Its private key stays in the concealed “JobSentinel Update Publisher v1”
item in the approved 1Password Private vault, injected only into the signing consumer.
A new file pair does not grant installation authority.

## Signed Pack Releases

Pack signing is local-only. Production private keys stay concealed in the
dedicated 1Password Developer Environment, except the approved Region identity in
the concealed “JobSentinel Region Publisher v1” item in the Private vault. Never copy
private keys into the repository, a command argument, a key file, or a dotenv file. The compiled
public identities and exact authority ceilings in
`crates/jobsentinel-application/src/pack_runtime/trust.rs` are authoritative.

| Pack identity | Publisher key ID | Concealed 1Password variable |
| --- | --- | --- |
| Source | `jobsentinel-source-publisher-v1` | `JOBSENTINEL_SOURCE_PRIVATE_KEY_PKCS8_B64` |
| Skill | `jobsentinel-skill-publisher-v1` | `JOBSENTINEL_SKILL_PRIVATE_KEY_PKCS8_B64` |
| Evaluation | `jobsentinel-evaluation-publisher-v1` | `JOBSENTINEL_EVALUATION_PRIVATE_KEY_PKCS8_B64` |
| Evidence Reviewer | `jobsentinel-evidence-reviewer-publisher-v1` | `JOBSENTINEL_EVIDENCE_REVIEWER_PRIVATE_KEY_PKCS8_B64` |
| Packet Builder | `jobsentinel-packet-builder-publisher-v1` | `JOBSENTINEL_PACKET_BUILDER_PRIVATE_KEY_PKCS8_B64` |

The Region publisher is `jobsentinel-region-publisher-v1`, restricted to static,
LocalOnly Region content with empty capabilities and no external AI. Its approved
public-key enrollment precedes source freeze; exact UK/EU/India starter artifacts
are built and signed from the frozen inputs before positive installed R1 lifecycle
journeys. Final full R3 Security stays after R2. Its vault-item credential is injected
only into a caller-selected `--key-env` variable for `release:sign-pack`; the existing
five identities retain the Environment route below. No secret references belong in
repository records.

Set `JOBSENTINEL_1PASSWORD_ENVIRONMENT_ID` only in the operator's local shell.
Then sign an exact release JSON file with the matching ID, concealed-variable
name, and raw public-key hex from the compiled registry:

```bash
op run --environment "$JOBSENTINEL_1PASSWORD_ENVIRONMENT_ID" -- \
  npm run release:sign-pack -- \
  --release release.json \
  --publisher-key-id jobsentinel-source-publisher-v1 \
  --expected-public-key-hex <approved-raw-public-key-hex> \
  --key-env JOBSENTINEL_SOURCE_PRIVATE_KEY_PKCS8_B64 \
  --out source-release.jspack
```

PowerShell uses the same child-process route with
`--environment $env:JOBSENTINEL_1PASSWORD_ENVIRONMENT_ID`. The signer preserves
the exact UTF-8 release bytes, checks that the concealed private key derives the
approved public key, self-verifies the Ed25519 signature, and exclusively
creates a private-mode output file. It never overwrites an existing envelope.

Rotation always creates a new publisher key ID and receives a separate ceiling
review before registry inclusion. Omitting a publisher from the compiled
registry means revoked: startup reconciliation quarantines its active and
rollback artifacts as `trust_revoked`. Do not delete an old public identity
until the intended revocation or rotation boundary is approved. A signer run
does not install, activate, publish, upload, or otherwise trust the result.

## Local Release Gate

Assign these commands to the full phase plans above and retain their outcomes.
Performance also requires the release's declared benchmarks and resource budgets.
Run from the repository root:

```bash
./init.sh
npm run release:check-version -- vX.Y.Z
npm run release:check-env
npm run release:readiness
npm run release:check-deps
npm run verify:full
npm run lint:sqlx
npm run test:e2e:all
node scripts/dev/run-cargo.mjs clippy --workspace --all-features -- -D warnings
node scripts/dev/run-cargo.mjs test --workspace --all-features
```

Online advisory checks are required when network access is available:

```bash
npm audit --audit-level=moderate
cargo deny check advisories bans licenses sources
```

Record an unavailable host, tool, credential, or network check as a gap. Do not
convert a skipped gate into a pass.

## Native Platform Assets

Build every advertised platform from the same source revision.

### macOS

JobSentinel currently has no Apple Developer Account.
A zero-friction public macOS DMG cannot be produced under that constraint. A
public no-account DMG must be visibly labeled `_no-account_`, use a universal
`x86_64,arm64` binary,
include its `.dmg.sha256`, and include the generated macOS SBOM and manifest. It
is not Developer ID signed, notarized, stapled, or Gatekeeper-ready.

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin
npm run tauri:verify:macos -- \
  --dmg target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg \
  --expected-architectures x86_64,arm64 \
  --expected-bundle-id com.jobsentinel.main \
  --expected-product-name JobSentinel \
  --expected-version X.Y.Z \
  --expected-icon-file icon.icns \
  --expected-minimum-system-version 13.0 \
  --launch-smoke \
  --install-smoke \
  --require-checksum
```

Developer ID mode requires separately authorized signing and notarization
credentials. Keep certificate, password, App Store Connect key, and temporary
keychain material outside the repository. Require Gatekeeper verification before
calling that artifact ready.

Do not publish a Mac package without its checksum.
Do not publish a macOS package as zero-friction or Gatekeeper-ready until
`--require-gatekeeper` passes.

### Windows

Build on Windows 11 or an explicitly selected Windows VM:

```powershell
npm run tauri build
Get-AuthenticodeSignature target/release/bundle/msi/JobSentinel_*.msi
Get-AuthenticodeSignature target/release/bundle/nsis/JobSentinel_*.exe
```

Public Windows MSI and NSIS setup upload is signed with locally supplied Windows
signing secrets or visibly renamed with `_unsigned`. Both paths require matching
SHA-256 sidecars. Signing material must remain outside the repository and must be
removed from temporary stores after verification.

Windows signing secrets stay outside the repository and require explicit use.

### Linux

Build on the supported Linux target:

```bash
APPIMAGE_EXTRACT_AND_RUN=1 npx --no-install tauri build --target x86_64-unknown-linux-gnu
file target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage
dpkg-deb --info target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb
dpkg-deb --contents target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb >/dev/null
```

Public Linux upload is blocked unless the advertised set contains exactly one
non-empty AppImage and one non-empty Debian package, versioned filenames, and
matching SHA-256 sidecars.

## SBOM And Staging

Generate release assets outside tracked source paths:

```bash
npm run release:skills -- --version X.Y.Z --out-dir release-assets/public
npm run release:sbom -- \
  --platform <windows|macos|linux> \
  --version X.Y.Z \
  --out-dir release-assets/public \
  --checksums-out release-assets/attestation-subjects.sha256 \
  --require-artifacts
```

Inspect the exact staged asset list. Reject duplicate installers, stale versions,
missing checksums, mismatched digests, incomplete SBOM manifests, or artifacts
from a different revision.

Upload `JobSentinel-X.Y.Z-agent-skills.tar.gz`,
`JobSentinel-X.Y.Z-agent-skills.zip`, and both `.sha256` sidecars. Upload only
after the local archive verifier passes.

Every release also carries `JobSentinel-X.Y.Z-release-platforms.json` and its
`.sha256`. Release staging writes it from the workflow `platform` input, tag and
tag commit, and records each platform as `hosted` or `local`. `windows-linux`
declares a locally built macOS DMG. Verifiers derive the platform set from this
attested declaration and fail if it is missing, malformed or inconsistent. Local
SBOM manifests record `HEAD` only when the tree has no modified or untracked
files; generate them right after building from a clean checkout of the tag commit.
`release-assets/` is ignored by Git, so staged assets do not dirty the tree.

For `windows-linux`, upload the local macOS assets before the hosted build:

1. Write the same body that hosted staging uses, including the Package Status
   section, with `npm run release:notes -- --version X.Y.Z --out
   release-assets/release-notes.md`. Then create the draft from the tag: `gh
   release create vX.Y.Z --draft --verify-tag --title "JobSentinel X.Y.Z"
   --notes-file release-assets/release-notes.md`. Hosted staging reuses this
   draft without editing its notes.
2. Build and verify the universal DMG from a clean checkout of the tag commit.
   Copy the DMG and its `.dmg.sha256` into `release-assets/public`, then run
   `release:sbom` for `macos` with `--out-dir release-assets/public
   --require-artifacts`. The platform manifest ignores Agent Skills archives and
   platform declarations, so earlier `release:skills` output there is harmless.
3. Export a token with push access as `GH_TOKEN` or `GITHUB_TOKEN`, for example
   `export GH_TOKEN="$(gh auth token)"`, and get the draft id with
   `node scripts/release/stage-target.mjs --require-draft --repo <owner/repo>
   --tag vX.Y.Z`. Then run `node scripts/release/draft-assets.mjs upload --repo
   <owner/repo> --release-id <id> --tag vX.Y.Z --tag-commit <T> -- <files>` for
   the DMG, its `.sha256`, the SBOM and the manifest. It re-checks the draft guard
   and uploads by release id, like the hosted pipeline.
4. Dispatch `release.yml` with `mode: build-draft` and `platform: windows-linux`.

## Publication And Public Verification

Tagging, pushing, creating a GitHub Release, deleting assets, uploading, and
publishing are external mutations and need explicit authority at execution time.
Do not dispatch a workflow as a release shortcut without that authority.

The readiness checks on workflow text are regression guards against accidental
edits, not a security boundary against people who can write to the repository.

Draft verification selects the draft by exact tag through the authenticated asset
API and rejects missing, duplicate, stale or extra assets, checksum or SBOM drift,
invalid Agent Skills archives, and attestations not bound to the tag and T. Any
failure leaves the release in draft.

Manual publication is an exception: it has no `release` environment approval and
no concurrency queue. Use it only with explicit authority for that release. Export
`GITHUB_TOKEN` or `GH_TOKEN` with push access first; the gate downloads draft assets
with it and `release:publish` uses it to publish and, on failure, re-draft. Run the
same gates from a checkout containing E:

```bash
npm run release:publish-gate -- --version vX.Y.Z --evidence-revision <E> \
  --source-revision <T> --repo <owner/repo> --selection <platform input> \
  --require-windows-unsigned-label --github-output gate.out
npm run release:confirm-draft -- --repo <owner/repo> --release-id <id> \
  --tag vX.Y.Z --tag-commit <T> --asset-digest <asset_digest from gate.out> \
  --evidence-revision <E>
npm run release:publish -- --tag vX.Y.Z --expected-version X.Y.Z --release-id <id> \
  --repo <owner/repo> --require-supply-chain --require-windows-unsigned-label \
  --evidence-revision <E>
```

Omit `--require-windows-unsigned-label` only for Authenticode-signed Windows
installers.

The `release: published` trigger of `verify-release-artifacts.yml` does not fire
for releases published with the workflow token, so dispatch that workflow
manually after publication, passing `evidence_ref` E, or verify locally. Asset downloads never send
credentials; a token, when present, is used only for API metadata reads and
attestation lookups. These commands verify v3 and later releases; releases before v3
have no platform declaration and cannot be re-verified with them:

```bash
npm run release:verify:public -- --tag vX.Y.Z
npm run tauri:verify:macos:latest -- --tag vX.Y.Z --no-require-supply-chain
```

Omitting `--platforms` verifies the declared set. A supplied list must match it
exactly.

The no-supply-chain flag is required for locally built assets because they have
no GitHub Actions provenance. Never claim hosted provenance, SLSA attestation,
or GitHub-generated SBOM attestation for local builds.

## Rollback

- Source changes roll back through a reviewed Git revert.
- Published assets are replaced only with explicit authority and the same
  version/revision contract.
- Database migrations never roll back by deleting user data. Use a forward
  repair or a verified backup restore.
- Preserve failed local artifacts outside tracked paths until the failure is
  understood, then remove them before completion.
