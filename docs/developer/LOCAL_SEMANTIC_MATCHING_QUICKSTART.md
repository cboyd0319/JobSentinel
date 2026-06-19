# Local ML Quick Start

This quick start is for developers testing the optional `embedded-ml` feature.
Core JobSentinel workflows do not require it.

## Build

```bash
cd src-tauri
cargo build --release --features embedded-ml
```

## Check status

The model is not bundled into normal builds. With `embedded-ml` enabled,
`get_ml_status` reports whether model files are already cached locally.

```typescript
import { invoke } from "@tauri-apps/api/core";

const status = await invoke<{
  is_downloaded: boolean;
  model_size_bytes?: number;
  model_id: string;
  revision: string;
  backend: string;
  manifest_hash: string;
}>("get_ml_status");
```

## Download model files

Only call `download_ml_model` after explicit user or developer action. The
download fetches model files from Hugging Face Hub. It must not include resume
text, salary floors, private notes, application history, or other job-search
records.

The current wired runtime downloads the governed MiniLM baseline from
`models.lock.toml`. Qwen3 embedding and reranker profiles are already pinned in
the same lockfile for the production backend work.

```typescript
await invoke("download_ml_model");
```

## Run local matching

```typescript
const result = await invoke("semantic_match_skills", {
  userSkills: ["customer support", "data entry", "scheduling"],
  jobRequirements: ["client service", "calendar coordination", "spreadsheet work"],
});
```

Treat the result as an estimate. Show visible matched and missing items, let the
user edit their skills, and keep deterministic matching available.

## Test

```bash
cd src-tauri
cargo test --features embedded-ml
```

Ignored integration tests may require downloaded model files:

```bash
cd src-tauri
cargo test --features embedded-ml -- --ignored
```

## User-facing requirements

Before this feature appears in user-facing UI:

- Explain that local semantic matching is optional.
- Ask before downloading model files.
- Show download progress, failure, retry, and cancel states.
- Keep a local deterministic fallback.
- Show model id, revision, approximate size, license, and local-only data flow
  before download.
- Do not send resume text or private job-search records during model download.
- Do not claim that semantic matching predicts hiring outcomes.
- Update [PRIVACY.md](../../PRIVACY.md) if data flow changes.

For details, see [Optional Local Semantic Matching](LOCAL_SEMANTIC_MATCHING.md).
