# Embedded ML Feature

**Status:** Optional feature (enabled with `embedded-ml` flag)
**Version:** 2.7+
**Model:** all-MiniLM-L6-v2 (quantized, ~20MB)

## Overview

JobSentinel's embedded ML feature provides semantic skill matching using on-device inference with the Candle
framework. This enhances the resume matcher by understanding semantic similarity between skills, not just exact
keyword matches.

## Features

- **Semantic skill matching** - Matches "Machine Learning" with "ML experience" automatically
- **On-device inference** - All processing happens locally, no cloud API required
- **Metal acceleration** - Uses Apple Metal GPU on macOS for fast inference
- **Tiny binary size** - Only adds ~2-5MB to binary size
- **Lazy loading** - Model downloads on first use (~20MB)
- **Graceful fallback** - If disabled or model unavailable, falls back to keyword matching

## Architecture

```text
src-tauri/src/core/ml/
├── mod.rs          # Module entry, feature flag
├── model.rs        # Model download, loading, inference
├── embeddings.rs   # Embedding generation
├── matcher.rs      # Semantic skill matching
└── tests.rs        # Unit and integration tests
```

## Building

### With ML support (default build)

```bash
cd src-tauri
cargo build --release --features embedded-ml
```

### Without ML support (smaller binary)

```bash
cd src-tauri
cargo build --release
```

## Usage

### Download Model (First Use)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Download model from HuggingFace Hub
await invoke('download_ml_model');
```

### Check ML Status

```typescript
const status = await invoke('get_ml_status');
console.log(status.is_downloaded); // true/false
console.log(status.model_size_bytes); // Size in bytes
```

### Semantic Skill Matching

```typescript
const result = await invoke('semantic_match_skills', {
  userSkills: ['Python programming', 'Machine Learning'],
  jobRequirements: ['Python', 'ML experience', 'Java'],
});

console.log(result.overall_score); // 0.0-1.0
console.log(result.matched_skills); // [{ job_skill, user_skill, similarity }]
console.log(result.unmatched_requirements); // ['Java']
```

### Enhanced Resume Matching

```typescript
const result = await invoke('match_resume_semantic', {
  resumeId: 1,
  jobHash: 'job-hash-123',
});

console.log(result.overall_score);
console.log(result.matched_skills);
```

## Model Details

### all-MiniLM-L6-v2

- **Type:** Sentence transformer (BERT-based)
- **Parameters:** ~22M (quantized)
- **Embedding dimension:** 384
- **Max sequence length:** 128 tokens
- **Performance:** ~10-20ms per sentence (Metal), ~50-100ms (CPU)
- **Source:** [HuggingFace Hub](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

### Download Process

1. Model files downloaded to `{app_data_dir}/ml_models/`
2. Files cached for reuse
3. Lazy loading - only downloads when first needed
4. Total download size: ~20MB

## Implementation Details

### Semantic Matching Algorithm

1. **Tokenize** user skills and job requirements
2. **Generate embeddings** using all-MiniLM-L6-v2
3. **Normalize** embeddings to unit length
4. **Compute similarity** using cosine similarity
5. **Match** each job requirement to best user skill (threshold: 0.7)
6. **Score** based on coverage (70%) and average similarity (30%)

### Similarity Threshold

- **0.7+** - Skills match semantically
- **0.5-0.7** - Potentially related
- **< 0.5** - Not considered a match

### Performance

- **Batch processing** - Processes multiple skills in parallel
- **Metal acceleration** - ~5x faster on Apple Silicon
- **Memory usage** - ~50MB for model + ~10MB per batch
- **Cold start** - ~500ms (model loading)
- **Warm inference** - ~10-20ms per sentence

## API Reference

### Tauri Commands

#### `download_ml_model()`

Downloads the ML model from HuggingFace Hub.

**Returns:** `Result<string, string>`

#### `get_ml_status()`

Gets current model status.

**Returns:** `Result<ModelStatus, string>`

```typescript
interface ModelStatus {
  is_downloaded: boolean;
  model_path: string;
  model_size_bytes?: number;
}
```

#### `semantic_match_skills(user_skills, job_requirements)`

Matches user skills against job requirements semantically.

**Parameters:**

- `user_skills: string[]` - List of user skills
- `job_requirements: string[]` - List of job requirements

**Returns:** `Result<SemanticMatchResult, string>`

```typescript
interface SemanticMatchResult {
  overall_score: number; // 0.0-1.0
  matched_skills: SkillMatch[];
  unmatched_requirements: string[];
  unused_skills: string[];
}

interface SkillMatch {
  job_skill: string;
  user_skill: string;
  similarity: number; // 0.0-1.0
}
```

#### `match_resume_semantic(resume_id, job_hash)`

Enhanced resume matching with semantic understanding.

**Parameters:**

- `resume_id: number` - Resume ID
- `job_hash: string` - Job hash

**Returns:** `Result<SemanticMatchResult, string>`

## Testing

### Unit Tests (No Model Required)

```bash
cargo test --features embedded-ml
```

### Integration Tests (Requires Model)

```bash
# Download model first
cargo run --features embedded-ml --example download_model

# Run integration tests
cargo test --features embedded-ml -- --ignored
```

### Test Coverage

- Model download and caching
- Embedding normalization
- Cosine similarity calculation
- Semantic skill matching
- Batch processing
- Error handling

## Troubleshooting

### Model Download Fails

**Error:** "Failed to download model"

**Solutions:**

1. Check internet connection
2. Verify HuggingFace Hub is accessible
3. Check disk space (~50MB required)
4. Retry download

### Metal Initialization Fails (macOS)

**Error:** "Metal not available"

**Fallback:** Automatically falls back to CPU inference

**Impact:** ~5x slower inference, still functional

### Out of Memory

**Error:** "Failed to allocate memory"

**Solutions:**

1. Reduce batch size (process fewer skills at once)
2. Close other applications
3. Disable ML feature and use keyword matching

### Model Not Found

**Error:** "Model not downloaded"

**Solution:** Call `download_ml_model()` first

## Benchmarks

Tested on M1 MacBook Pro (16GB RAM):

| Operation | Metal | CPU | Notes |
|-----------|-------|-----|-------|
| Model loading | 450ms | 480ms | One-time cost |
| Single embedding | 12ms | 65ms | Per skill |
| Batch (10 skills) | 18ms | 95ms | Amortized |
| Full match (20 skills) | 35ms | 180ms | End-to-end |

## Future Enhancements

- [ ] Support for additional models (larger, more accurate)
- [ ] Fine-tuning on job-specific data
- [ ] Skill clustering and visualization
- [ ] Multi-language support
- [ ] Resume content understanding (not just skills)
- [ ] Contextual skill importance weighting

## License Compliance

### all-MiniLM-L6-v2

- **License:** Apache 2.0
- **Source:** HuggingFace Transformers
- **Attribution:** sentence-transformers team

### Candle

- **License:** Apache 2.0 / MIT
- **Source:** [huggingface/candle](https://github.com/huggingface/candle)

### HuggingFace Hub

- **License:** Apache 2.0
- **Source:** [huggingface/hf-hub](https://github.com/huggingface/hf-hub)

All licenses are compatible with JobSentinel's MIT license.

## References

- [Candle Documentation](https://huggingface.co/docs/candle)
- [all-MiniLM-L6-v2 Model Card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Sentence Transformers](https://www.sbert.net/)
- [BERT Paper](https://arxiv.org/abs/1810.04805)
