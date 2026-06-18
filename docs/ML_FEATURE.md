# Optional Local Semantic Matching

JobSentinel has an optional `embedded-ml` Cargo feature for local semantic skill
matching experiments. It is not required for core workflows, and it is separate
from external AI.

## Status

| Area | Current state |
| ---- | ------------- |
| Feature flag | `embedded-ml` |
| Default app behavior | Disabled unless built with the feature |
| Core workflow dependency | None; deterministic matching remains available |
| Data flow | Resume and job-skill matching runs locally |
| Model source | `sentence-transformers/all-MiniLM-L6-v2` files from pinned Hugging Face revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` |
| Network behavior | Model download only, when the model is explicitly requested |
| User data sent during model download | None |
| Integrity check | Required SHA-256 checks for `config.json`, `tokenizer.json`, and `model.safetensors` |
| Runtime stack | Candle, tokenizers, `safetensors`, optional macOS Metal acceleration |

Privacy label: **Local only** for matching. Model download is an explicit
external file fetch and must not send resume text, salary floors, notes,
application history, or job-search records.

## Product contract

- Local semantic matching is assistive and advisory.
- It may help compare a user's skills with visible job requirements.
- It must not replace plain, inspectable match explanations.
- It must not claim to predict hiring outcomes.
- It must fall back to deterministic matching when unavailable.
- Downloaded model files must stay revision-pinned and checksum-verified before
  cache status or loading reports success.
- If exposed in user-facing UI, model download must have clear consent,
  progress, retry, cancel, and plain fallback copy.

Do not confuse this feature with external AI. External AI remains optional,
disabled by default, and routed through
[the privacy-first AI gateway](architecture/privacy-first-ai-gateway.md).

## Code map

| Path | Purpose |
| ---- | ------- |
| `src-tauri/src/core/ml/mod.rs` | Feature-gated module entry and error types |
| `src-tauri/src/core/ml/model.rs` | Model download, cache checks, loading, and inference |
| `src-tauri/src/core/ml/embeddings.rs` | Embedding generation and vector similarity |
| `src-tauri/src/core/ml/matcher.rs` | Semantic skill matching logic |
| `src-tauri/src/core/ml/tests.rs` | Feature-gated tests |
| `src-tauri/src/commands/ml.rs` | Feature-gated Tauri commands |

## Build and test

Build without local ML:

```bash
cd src-tauri
cargo build --release
```

Build with local ML:

```bash
cd src-tauri
cargo build --release --features embedded-ml
```

Run feature-gated tests:

```bash
cd src-tauri
cargo test --features embedded-ml
```

Run ignored tests that require model files:

```bash
cd src-tauri
cargo test --features embedded-ml -- --ignored
```

## Commands

These commands are registered only when the app is built with `embedded-ml`:

| Command | Purpose |
| ------- | ------- |
| `download_ml_model` | Downloads model files into the app data model cache |
| `get_ml_status` | Reports whether model files are available locally |
| `semantic_match_skills` | Compares user skills with job requirements |
| `match_resume_semantic` | Compares stored resume skills with stored job skills |

Developer note: do not expose these commands in user-facing UI without the
product contract above.

## Current matching behavior

The local matcher:

1. Tokenizes visible skill or requirement strings.
2. Generates sentence embeddings with the local model.
3. Compares vectors with cosine similarity.
4. Matches each visible job requirement to the closest user skill.
5. Returns matched skills, unmatched requirements, unused skills, and an
   advisory overall result.

The current similarity threshold is implementation detail. User-facing copy
should describe outcomes as estimates based on visible evidence, not objective
truth.

## Troubleshooting

| Problem | Safe response |
| ------- | ------------- |
| Model download fails | Keep deterministic matching available and let the user retry later. |
| Model checksum fails | Delete or replace the local model cache through a reviewed app flow, then retry the pinned download. |
| Metal acceleration is unavailable | Fall back to CPU inference. |
| Model files are missing | Show local matching fallback and an explicit download action. |
| Matching output looks wrong | Let the user edit skills and visible assumptions before using the result. |

Do not log raw resume text, private notes, salary floors, local file paths, or
application history while debugging local ML.

## References

- [Candle documentation](https://huggingface.co/docs/candle)
- [all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Sentence Transformers](https://www.sbert.net/)
- [BERT paper](https://arxiv.org/abs/1810.04805)
- [Hugging Face Candle](https://github.com/huggingface/candle)
- [Hugging Face Hub client](https://github.com/huggingface/hf-hub)
