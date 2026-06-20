# v2.9.0 Capabilities Verification

Last updated: 2026-06-20.

## Purpose

This ledger verifies the capabilities listed in
[Features And Capabilities](../features/capabilities.md). It is not enough for
the feature docs to exist. Each capability needs fresh automated coverage,
manual or Playwright browser validation where user interaction matters, and a
clear privacy or source-boundary check before v2.9.0 release publication.

## Current Run

| Field | Value |
| ----- | ----- |
| Capabilities doc commit | `ab28be0d` |
| Latest exact full-gate validation commit | `07a03891` |
| Verification state | Capability evidence complete with one dev-server caveat; fresh 2026-06-20 local validation pass complete from `07a03891` |
| Required release position | Do not push, tag, upload, publish, or call v2.9.0 complete until final release gates pass from the exact commit to be pushed or tagged and the user confirms publication |
| Evidence storage | Command logs may live under `<tmp>`; checked-in docs must not include private user data, raw resumes, cookies, tokens, local absolute evidence paths, screenshots with private data, HAR files, browser storage, or session files |

## Required Fresh Gates

These gates passed after the capabilities doc and evidence ledger. If this
ledger or any release-bound file changes again, final release-publication gates
must rerun from the exact commit that will be pushed or tagged before publishing
assets or calling the release ready.

| Gate | State | Evidence |
| ---- | ----- | -------- |
| Harness and release readiness | Complete | `npm run harness:check` passed; `npm run release:readiness -- --version 2.9.0` passed |
| Dependency and action currency | Complete | `npm run release:check-deps` passed exact pins, latest stable direct/override checks, lockfile freshness, and GitHub Action SHA-pin checks |
| Environment readiness | Complete with caveat | `npm run doctor` exited 0; warnings were local Node `26.3.1` vs CI `24.17.0` and local npm `11.16.0` vs package pin `11.17.0` |
| Docs, bloat, security, architecture, tests, and skills sensors | Complete | `npm run lint:docs`; `npm run lint:bloat`; `npm run lint:security`; `npm run lint:external-ai`; `npm run lint:skills`; `npm run lint:tauri-invokes`; `npm run lint:tests`; `npm run test:scripts` passed |
| Frontend unit and integration tests | Complete | `npm run lint` passed; `npm run test:run` passed 187 files and 3261 tests; `npm run build` passed |
| Full browser E2E | Complete with caveat | `npm run test:e2e:all` passed 278 tests; WebKit emitted a repeatable Vite dev-server `Importing a module script failed` warning between passing tests |
| Rust formatting, lint, and backend tests | Complete | `cargo fmt --all -- --check`; `cargo clippy -- -D warnings`; `cargo test --lib` passed 2958 tests with 11 ignored |
| Documentation screenshots | Complete | `npm run docs:screenshots` passed 9 Chromium captures; refreshed `docs/images/hiring-trends.png`; visual inspection found no obvious overlap or blank capture |
| Focused source and restricted-source contracts | Complete | Source, restricted-source UI, LinkedIn boundary, bookmarklet, scraper, integration, scheduler, and live-source checks passed |
| Focused resume and application contracts | Complete | Resume, Application Assist, cover-letter, screening-answer, semantic diagnostics, local resume-corpus smoke, and Qwen3 runtime checks passed |
| Manual capability UI pass | Complete | Manual-style Playwright route probe passed Chromium/WebKit at 1440 x 1000 and 390 x 844: 8 routes each, zero captured console errors, zero page errors, zero horizontal overflow |

## 2026-06-20 Fresh Validation Pass

This pass rechecked the finalized roadmap and capability list without publishing
or uploading any release asset.

| Area | Result |
| ---- | ------ |
| Harness, release readiness, dependency currency, and environment | `npm run harness:check`, `npm run release:readiness -- --version 2.9.0`, `npm run release:check-deps`, `npm run doctor`, `npm run doctor:e2e`, `npm run harness:score`, and `npm run harness:session -- --json` passed. Doctor warnings remain local Node `26.3.1` versus CI `24.17.0`, and local npm `11.16.0` versus package-manager pin `11.17.0`. |
| Docs, bloat, security, repo contracts, and scripts | `npm run lint:docs`, `npm run lint:bloat`, `npm run lint:security`, `npm run lint:external-ai`, `npm run lint:skills`, `npm run lint:tauri-invokes`, `npm run lint:tests`, and `npm run test:scripts` passed. Script tests reported `730` passed. Whitespace and focused docs/harness checks are rerun after this evidence edit. |
| Frontend and web app | `npm run lint`, `npm run test:run`, `npm run build`, `npm run test:e2e:all`, `npm run test:e2e:all:budget`, and `npm run docs:screenshots` passed from `07a03891`. Vitest reported `187` files and `3261` tests. Full E2E reported `278` passed; budgeted E2E reported `278` expected, `0` unexpected, `0` flaky, `0` skipped, and `140145.207ms / 240000ms`. Screenshot refresh passed `9` captures; the only changed screenshot differed by `36` pixels and was restored as nondeterministic capture noise after pixel inspection. |
| Rust backend | `cargo fmt --all -- --check`, `cargo clippy -- -D warnings`, and `cargo test --lib` passed. Rust library tests reported `2958` passed and `11` ignored. |
| Sources and scrapers | Explicit source gates passed: scraper integration `25/25`, pipeline integration `12/12`, API contract `33/33`, scheduler integration `18/19` with `1` documented ignored SQLite-specific test, scraper subset `592/597` with `5` network-only ignored, and live low-volume source probes `14/14`. |
| Private resume corpus and resume surfaces | Aggregate-only private corpus probe scanned `12` files across `3` DOCX, `7` Markdown, and `2` PDF files, parsed `12/12`, ran `36` ATS/readability checks, `12` bullet checks, and `7` synthetic export checks without printing or storing private resume content. |
| Local semantic matching | Embedded-ML semantic diagnostics passed `1` with `2` expected ignored model-download tests, eval fixtures passed `9/9`, contracts passed `6/6`, and ignored Qwen3 runtime checks passed `2/2` for pinned embedding plus reranker behavior. |
| Release packaging support | `npm run release:check-env`, `npm run macos:readiness`, `npm run release:skills -- --out-dir <tmp>`, and `npm run release:sbom -- --platform macos --version 2.9.0 --out-dir <tmp> --checksums-out <tmp>/attestation-subjects.sha256` passed from `07a03891`. Skills packaging produced tar.gz and ZIP archives plus checksums under `<tmp>`. The temporary SBOM reported `1385` packages, `3725` relationships, `4` supporting assets, and `0` installable assets because installer assets were not staged in that temporary directory. |
| macOS desktop package | `JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin` built the universal no-account app and DMG from `07a03891`, ad-hoc signed the app, verified the DMG, and wrote a checksum. `npm run tauri:verify:macos -- --dmg src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.9.0_no-account_universal.dmg --expected-architectures x86_64,arm64 --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 2.9.0 --expected-icon-file icon.icns --expected-minimum-system-version 13.0 --launch-smoke --install-smoke --require-checksum` passed with checksum `809429e769e0364daa89cf428510eec60d4af7a50a16a47ed408e0fc8fc01e71`, metadata, universal architecture, signature, visible-window launch, install smoke, and private local-data permission checks. Optional Gatekeeper rejection remains expected for the no-account build. |

## Capability Coverage Matrix

| Capability | State | Evidence |
| ---------- | ----- | -------- |
| Setup and saved searches | Complete | App shell/setup/settings E2E, settings unit tests, route probe, harness checks |
| Job discovery and source checks | Complete | Source taxonomy tests, source-health UI tests, scraper contracts, live-source probes |
| Company careers discovery | Complete | Job-source discovery taxonomy tests and API-source contract tests |
| Restricted-source Workbench | Complete | LinkedIn Workbench UI/unit tests, `cargo test --lib linkedin`, and boundary tests verify acknowledgement, local ledger actions, and no stored auth material |
| Browser Import | Complete | Browser Import button script tests, bookmarklet tests, source-link import tests, and restricted-source UI tests verify one-use import and reviewed local save paths |
| Dashboard and job cards | Complete | Full E2E, focused UI tests, screenshots, route probe, job-card fit/risk/pay coverage |
| Fit review | Complete | Smart scoring, synonym, resume skill sorting, semantic diagnostics, and focused resume/application UI tests |
| Ghost-job and posting-risk review | Complete | Posting-risk logic, source-health contracts, job-card UI, and scraper source-history coverage |
| Hiring trends | Complete | Screenshot capture, market intelligence mocks, route probe, docs screenshot visual check |
| Pay protection | Complete | Salary/pay UI, offer/pay review skill package, focused E2E, and route probe |
| Resume library | Complete | Resume UI tests, backend resume tests, local resume-corpus aggregate smoke, and route probe |
| Resume Match | Complete | Resume parser/matcher tests, ATS/readability checks, semantic matching diagnostics tests, and Qwen3 runtime checks |
| Resume Builder | Complete | Builder validation, preview, export, JSON Resume compatibility, full E2E, screenshots |
| JSON Resume import and export | Complete | Builder/export unit tests, resume builder E2E export path, and JSON Resume feature docs/harness checks |
| Application Assist | Complete | Application Assist E2E, profile/screening-answer tests, Application Preview provenance tests, manual final-submit boundary tests |
| Application tracking | Complete | Application tracking E2E, route probe, tracker status tests, reminder and scheduler integration tests |
| Notifications | Complete | Notification settings, saved-secret boundaries, external destination validation, and secret/security sensors |
| Safe support and backups | Complete | Safe support report handlers, privacy sensors, backup/support docs, and security checks |
| Saved secrets | Complete | Credential-service/keyring tests, passive Settings no-prompt coverage, support-report redaction and secret scans |
| External AI gateway | Complete | `npm run lint:external-ai`, provider Settings tests, gateway transport tests, request-review UI tests, and metadata-only request history coverage |
| Local semantic matching | Complete | `models.lock.toml` governance, embedded-ML semantic/eval/contract tests, Qwen3 downloaded-runtime ignored tests, deterministic fallback checks |
| Agent Skills | Complete | `npm run lint:skills` and release-skill packaging contracts; release readiness verifies tar.gz and ZIP publication rules |

## Source Access Matrix

| Source class | State | Evidence |
| ------------ | ----- | -------- |
| Official hiring APIs and feeds | Complete | Greenhouse, Lever, RemoteOK, USAJobs skip path, API contracts, scraper integration, pipeline integration |
| Public job boards and aggregators | Complete | WeWorkRemotely, BuiltIn, BuiltIn remote, Dice, SimplyHired, Glassdoor warning path, source UI tests, live probes |
| Employer career pages | Complete | Source taxonomy and reviewed employer-page routing checks cover native support, Browser Import fallback, pasted link, and manual entry |
| Reviewed ATS families | Complete | ATS taxonomy, source registry, source labels, API contract tests, and discovery classification checks |
| Native source-adapter contracts from API research | Complete | Workday CXS, Phenom widget, Radancy/TalentBrew, Oracle Fusion/Taleo, and long-tail ATS fixture/parser contracts are covered by API/source tests |
| Restricted authenticated sources | Complete | LinkedIn-compatible warning, Workbench, bookmarklet, visible import, and no-session-capture boundaries covered by focused UI and Rust tests |
| Search-link destinations | Complete | Deep-link, source-label, restricted-domain warning, and Browser Import fallback tests passed |

## Boundary Matrix

| Boundary | State | Evidence |
| -------- | ----- | -------- |
| Local-first default | Complete | Harness, privacy labels, UI tests, backend tests, and route probe work without hosted account, telemetry, cloud sync, or external AI |
| External AI optional | Complete | Gateway lint and tests verify disabled-by-default setup, preview/edit/cancel/approve, redaction, and backend validation |
| No final application submit | Complete | Application Assist and Application Preview tests verify manual final submission and visible prep only |
| No deceptive resume tactics | Complete | Resume review guard tests flag fabrication-like, hidden text, invisible text, and prompt-injection-like content |
| No restricted-source session capture | Complete | LinkedIn/browser import tests and manual testing used no cookies, tokens, auth headers, browser storage, HAR, trace, video, private screenshots, or session artifacts |
| No platform-control bypass | Complete | Source and automation boundaries reject hidden background access, human-check bypass, proxy/stealth adoption, unbounded scraping, unsafe destinations, and final submit actions |
| Broad audience usability | Complete | Resume/source taxonomies, UI copy, E2E routes, docs, and skill packages cover non-engineering and non-technical user flows |
| Windows 11+, macOS, Linux posture | Complete with external gaps | Platform-neutral tests passed; release readiness covers Windows, macOS no-account, and Linux assets; Apple Developer ID/notarization and Windows signing remain external publication gaps |

## Manual Validation Evidence

- Desktop viewport: 1440 x 1000 route probe passed in Chromium and WebKit.
- Mobile viewport: 390 x 844 route probe passed in Chromium and WebKit.
- Probe covered App shell, Dashboard, Applications, Resumes, Salary,
  Hiring Trends, Application Assist, Resume Builder, and Resume Match.
- Probe captured zero browser console errors, zero page errors, and zero
  horizontal overflow across every route and viewport.
- Full E2E passed 278 Chromium/WebKit tests across setup, dashboard, settings,
  applications, resumes, salary, trends, application assist, resume builder,
  resume match, keyboard navigation, responsive app shell, modals, toasts,
  empty states, and error-path coverage.
- Documentation screenshots passed 9 Chromium captures. One Hiring Trends image
  differed by 36 pixels from the checked-in version and was restored as
  nondeterministic capture noise after ImageMagick pixel inspection.

## Caveats

- Full E2E emitted a repeatable WebKit/Vite dev-server warning:
  `TypeError: Importing a module script failed`. It occurred between passing
  tests, not as a Playwright assertion failure. The separate route probe
  captured zero browser console errors and zero page errors. Treat this as a
  dev-server warning to keep watching, not as a product failure.
- If this ledger changes again before publication, final release-publication
  gates must rerun from the exact commit that will be pushed or tagged.

## Closure Rules

This capability ledger is closed for capability evidence when:

1. The ledger, active status docs, and refreshed screenshot are committed.
2. Docs, bloat, harness, and whitespace checks pass after the evidence edit.
3. Generated artifacts are removed from the repo worktree.

This ledger is not a release-publication approval. Publishing still requires
fresh final gates from the exact commit to be pushed or tagged and explicit
user confirmation.
