<!-- Maps the optional local-AI crate to governed model owners and reproducible developer checks. -->

# Local AI crate

This crate owns optional governed local matching. The canonical behavior and
setup guide is [Local semantic matching](../../../docs/developer/LOCAL_SEMANTIC_MATCHING.md);
[models.lock.toml](../models.lock.toml) owns model identities, revisions, hashes,
required file sizes, licenses, backends and thresholds. Do not duplicate those
values as constants or unqualified performance claims.

## Owners

- `lib.rs`: public facade and feature gates.
- `manifest.rs`: model-lock parsing and validation.
- `model.rs` and `model/`: verified cache, download, device and loading lifecycle.
- `qwen3.rs` and `qwen3/`: pinned embedding and reranker implementation.
- `runtime.rs`: compatibility and vector provenance.
- `evaluation.rs`: evidence and evaluation contracts.
- `hybrid.rs`: hybrid ranking and blocker rules.
- `embeddings.rs`, `matcher.rs` and `matcher/`: local embedding and skill matching.

Core workflows remain model-free. Model files are not bundled or downloaded
silently. Governed Qwen3 is the optional stronger path; verified MiniLM is a legacy
fallback. Missing or invalid models retain deterministic matching. Downloads use
reviewed public model artifacts and must not carry private job-search records.

## Commands

Run from the repository root:

```bash
node scripts/dev/run-cargo.mjs build --locked -p jobsentinel --release --features embedded-ml
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-local-ai --features embedded-ml
```

Select a focused test filter for ordinary development. Ignored tests can download
large models or require specific hardware; choose one explicitly rather than
running all ignored workspace tests.

## Performance and recovery

Model/device selection and batch limits belong to the current implementation and
model contract. Record measured latency, memory and artifact size for the exact
revision and workload; fixed historical estimates are not current guarantees.
Do not change numeric limits or model identities to make a check pass.

Use the model diagnostics, retry/cancel and reviewed cache-removal paths for
missing or invalid artifacts. Do not bypass checksums, increase timeouts blindly
or modify constants as a substitute for diagnosing the first failure.

## Licensing

The crate uses the workspace license in the root Cargo manifest. Third-party
libraries and downloaded models retain their own licenses; model licenses are
recorded in the model lock and do not replace JobSentinel's project license.
