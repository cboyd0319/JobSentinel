# ML Module

Embedded machine learning for semantic skill matching.

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
- **model.rs** - Model download, loading, BERT architecture
- **embeddings.rs** - Embedding generation, cosine similarity
- **matcher.rs** - Semantic skill matching logic
- **tests.rs** - Unit and integration tests

## Model Architecture

This module implements a simplified BERT-like model (all-MiniLM-L6-v2):

- 6 transformer layers
- 12 attention heads
- 384 hidden dimensions
- Mean pooling over sequence

## Adding New Features

### Adding a New Model

1. Update `MODEL_ID` constant in `model.rs`
2. Adjust `HIDDEN_SIZE`, `NUM_LAYERS`, `NUM_HEADS` as needed
3. Regenerate model artifacts

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

Current: `0.7` (good balance)

## Debugging

Enable tracing:

```rust
RUST_LOG=jobsentinel::core::ml=debug cargo run --features embedded-ml
```

## Binary Size Impact

- **Without ML:** ~8MB
- **With ML:** ~10-13MB
- **Model (runtime):** ~20MB

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
