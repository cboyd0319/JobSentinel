# ML Module

Embedded machine learning for local semantic matching.

## Quick Start

```bash
# Build with ML support
cd src-tauri
cargo build --release --features embedded-ml

# Run tests
cargo test --features embedded-ml

# Run integration tests (requires model download)
cargo test --features embedded-ml -- --ignored
```

## Module Structure

- **mod.rs** - Module entry, feature flags, error types
- **manifest.rs** - Model lock parsing and validation
- **model.rs** - Model download, cache verification, metadata, loading, and legacy baseline inference
- **qwen3.rs** - Governed Qwen3 text embedding backend using verified cache files
- **runtime.rs** - Backend traits, compatibility checks, vector provenance, and stale-vector keys
- **evaluation.rs** - Evidence labels, hard-negative, feedback, and training data contracts
- **eval_fixtures/seed_v1.json** - Seed eval labels, hard negatives, and preference pairs
- **embeddings.rs** - Embedding generation, cosine similarity
- **matcher.rs** - Semantic skill matching logic
- **tests.rs** - Unit and integration tests

## Model Governance

Model artifacts are governed by `<repo-root>/models.lock.toml`. The lockfile
owns model id, kind, repo, revision, file hashes, sizes, license, backend
compatibility, tokenizer family, pooling, normalization, dimensions,
instruction profiles, and score thresholds.

The production direction is:

- `qwen3-embedding-0.6b`: default embedding profile at 768 dimensions through
  the `qwen3-candle` backend.
- `qwen3-reranker-0.6b`: default bounded top-K reranker profile.
- `all-minilm-l6-v2-baseline`: current wired legacy runtime until the Qwen3
  backend is fully implemented and validated.

The cache path includes model id, revision, and model-lock hash:

```text
<app-data>/ml_models/<model-id>/<revision>/<model-lock-hash>/
```

Do not add model identity, revisions, hashes, or scoring semantics as scattered
Rust constants. Add them to `models.lock.toml`, then update tests.

## Current Runtime

The current wired runtime implements a simplified BERT-like MiniLM baseline:

- 6 transformer layers
- 12 attention heads
- 384 hidden dimensions
- Mean pooling over sequence

Model downloads are pinned to Hugging Face revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. `config.json`,
`tokenizer.json`, and `model.safetensors` must match `models.lock.toml` before
the cache is treated as downloaded or loaded.

The Qwen3 backend must validate runtime compatibility before indexing or
scoring:

- model id and revision
- backend kind
- embedding dimension
- tokenizer hash and family
- max token limit
- instruction profile
- pooling and normalization

Focused live validation passed on 2026-06-19 with
`core::ml::qwen3::tests::qwen3_backend_embeds_with_pinned_downloaded_model`.
The ignored test downloads the pinned model into an explicit external cache,
verifies the model lock hashes, loads the backend, and checks a normalized
768-dimensional output.

## Adding New Features

### Adding a New Model

1. Add a `[[models]]` entry to `models.lock.toml`.
2. Use a full upstream commit SHA, not a branch or tag.
3. Record every required file, SHA-256 hash, size, license, backend
   compatibility, dimensions, tokenizer family, pooling, normalization, and
   instruction support.
4. Add or update backend compatibility tests.
5. Add eval fixtures before changing scoring behavior.

### Custom Matching Logic

Modify `matcher.rs`:

```rust
impl SemanticMatcher {
    pub fn custom_match(&self, ...) -> Result<...> {
        // Your logic here
    }
}
```

### Performance Tuning

**Batch Size**

- Larger batches = better throughput
- Smaller batches = lower memory

**Similarity Threshold**

- Higher = stricter matching (fewer false positives)
- Lower = looser matching (more false positives)

Current legacy matcher threshold: `0.7`.

Do not compare raw reranker scores across query kinds. Use query-specific
thresholds from `models.lock.toml`.

## Evaluation Path

Improve local matching in this order:

1. Build labeled eval sets for requirement-to-resume evidence, resume-to-job
   fit, skill evidence, title/seniority, and gap analysis.
2. Mine hard negatives from false positives.
3. Fine-tune the reranker first when labels justify it.
4. Fine-tune embeddings only if retrieval recall is poor.
5. Add a lightweight learning-to-rank layer over explainable features.
6. Consider contextual bandits only after real feedback volume exists.

Avoid RL-style optimization until the product has enough feedback and a clear
sequential decision objective.

The seed fixture covers all core eval tasks and is loaded by unit tests. It is
not a training dataset by itself; it is a schema and regression anchor for
future scoring, hard-negative mining, and reranker fine-tuning work.

## Debugging

Enable tracing:

```rust
RUST_LOG=jobsentinel::core::ml=debug cargo run --features embedded-ml
```

## Binary Size Impact

- **Without ML:** ~8MB
- **With ML:** ~10-13MB
- **Current model (runtime):** ~90MB
- **Target Qwen3 embedding model:** ~1.1GB
- **Target Qwen3 reranker model:** ~1.1GB

The binary size increase is minimal because:

1. Candle uses `safetensors` (efficient binary format)
2. No heavy dependencies (pure Rust)
3. Model loaded at runtime, not embedded

## Performance Optimization

### Metal Acceleration (macOS)

```rust
let device = ModelManager::get_device()?; // Automatically uses Metal if available
```

### CPU Optimization

The model is already optimized for CPU:

- f32 precision (SIMD-friendly)
- Batch processing
- Efficient matrix operations

## Common Issues

### Compilation Errors

**Issue:** `candle-core` not found

**Fix:** Enable feature flag:

```bash
cargo build --features embedded-ml
```

### Model Download Hangs

**Issue:** Network timeout

**Fix:** Increase timeout in `hf-hub` config

### Out of Memory

**Issue:** Large batch processing

**Fix:** Reduce batch size in `embeddings.rs`:

```rust
const MAX_BATCH_SIZE: usize = 32; // Adjust as needed
```

## Contributing

When adding features:

1. Add tests to `tests.rs`
2. Update documentation in this README
3. Run clippy: `cargo clippy --features embedded-ml`
4. Format: `cargo fmt`

## License

Apache 2.0 (matches Candle and HuggingFace Hub)
