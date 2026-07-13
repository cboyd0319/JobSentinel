# Optional Local Semantic Matching

JobSentinel has an optional `embedded-ml` Cargo feature for local semantic
matching. It is not required for core workflows, and it is separate from
external AI.

## Status

| Area | Current state |
| ---- | ------------- |
| Feature flag | `embedded-ml` |
| Default app behavior | Disabled unless built with the feature |
| Core workflow dependency | None; deterministic matching remains available |
| Data flow | Resume and job-skill matching runs locally |
| Model governance | `models.lock.toml` pins model identity, revision, hashes, size, license, backend compatibility, instruction profiles, and score thresholds |
| Target embedding profile | `Qwen/Qwen3-Embedding-0.6B` at revision `97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3`, 768-dimensional balanced profile |
| Target reranker profile | `Qwen/Qwen3-Reranker-0.6B` at revision `e61197ed45024b0ed8a2d74b80b4d909f1255473` |
| Current wired runtime | Direct semantic matcher calls prefer the governed Qwen3 embedding plus reranker pair when both models are downloaded and checksum-verified; legacy `sentence-transformers/all-MiniLM-L6-v2` remains the fallback; embedded-ML resume/job scoring uses the hybrid scorer |
| Network behavior | Model download only, when the model is explicitly requested |
| User data sent during model download | None |
| Integrity check | Required SHA-256 checks for every required file in `models.lock.toml` |
| Cache layout | `<app-data>/ml_models/<model-id>/<revision>/<model-lock-hash>/` |
| Runtime stack | Candle, tokenizers, `safetensors`, optional macOS Metal acceleration |
| Hybrid ranking | Typed local scoring core combines dense, BM25, exact skill, required-coverage, seniority, reranker, blocker, and provenance signals |

Focused Qwen3 embedding evidence: on 2026-06-19,
`core::ml::qwen3::tests::qwen3_backend_embeds_with_pinned_downloaded_model`
downloaded the pinned Qwen3 embedding model into an external test cache,
verified checksums, loaded the `qwen3-candle` backend, and returned a
normalized 768-dimensional embedding.

Focused Qwen3 reranker evidence: on 2026-06-19,
`core::ml::qwen3::tests::qwen3_reranker_ranks_direct_evidence_above_near_miss`
downloaded the pinned Qwen3 reranker model into an external test cache,
verified checksums, loaded the `qwen3-reranker-candle` backend, and ranked
direct Kubernetes security evidence above a vocabulary-overlap near miss.

Product integration evidence: the Settings **Local Match Check** panel calls
`get_semantic_matching_diagnostics`. Normal builds report the built-in local
fallback. `embedded-ml` builds report the checked-in Qwen3 model lock, required
file presence, cache readiness, scoring signals, local-only privacy mode, and
quality checks without loading model weights or exposing resume/job text.
Direct semantic matcher calls now use Qwen3 dense retrieval plus bounded Qwen3
reranking when the governed model pair is present, and fall back to MiniLM only
when that pair is unavailable.

Focused hybrid ranking evidence: `core::ml::hybrid` tests prove the ranking
core prefers direct evidence over keyword-only near misses, caps otherwise
strong matches when hard blockers exist, and records dense, BM25, exact skill,
required-coverage, and reranker provenance without raw resume text.
`core::resume::matcher::hybrid_score` wires the hybrid scorer into resume/job
match scores for `embedded-ml` builds while preserving the legacy weighted
formula when local ML is disabled.

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
- Runtime compatibility must validate model id, backend, dimensions, tokenizer,
  pooling, normalization, max tokens, and instruction support before indexing or
  scoring.
- Vector provenance must include model id, repo, revision, backend, dimension,
  instruction profile, chunker version, normalizer version, pooling,
  normalization, and model-lock hash.
- A vector is stale when text, model revision, dimension, instruction profile,
  chunker version, normalizer version, pooling, or normalization changes.
- If exposed in user-facing UI, model download must have clear consent,
  progress, retry, cancel, and plain fallback copy.

Do not confuse this feature with external AI. External AI remains optional,
disabled by default, and routed through
[the privacy-first AI gateway](../architecture/privacy-first-ai-gateway.md).

## Code map

| Path | Purpose |
| ---- | ------- |
| `crates/jobsentinel-core/src/core/ml/mod.rs` | Feature-gated module entry and error types |
| `crates/jobsentinel-core/src/core/ml/contracts.rs` | Typed contracts for role families, generated-advice separation, skill graph relationships, evidence explanations, adversarial posting signals, and modular matching stages |
| `crates/jobsentinel-core/src/core/ml/manifest.rs` | Checked-in model lock parsing and validation |
| `crates/jobsentinel-core/src/core/ml/model.rs` | Thin model management entrypoint |
| `crates/jobsentinel-core/src/core/ml/model/` | Cache verification, download, metadata, loading, device selection, integrity checks, and legacy baseline inference |
| `crates/jobsentinel-core/src/core/ml/qwen3.rs` | Thin Qwen3 module entry |
| `crates/jobsentinel-core/src/core/ml/qwen3/` | Governed Qwen3 embedding, reranker, model, pooling, and tokenization implementation |
| `crates/jobsentinel-core/src/core/ml/runtime.rs` | Backend traits, runtime compatibility, vector provenance, and stale-vector keys |
| `crates/jobsentinel-core/src/core/ml/evaluation.rs` | Evidence labels, hard negatives, feedback, blockers, and future training data contracts |
| `crates/jobsentinel-core/src/core/ml/hybrid.rs` | Deterministic hybrid ranking, blocker caps, and retrieval provenance |
| `crates/jobsentinel-core/src/core/ml/eval_fixtures/seed_v1.json` | Seed labels, hard negatives, and preference pairs for regression tests |
| `crates/jobsentinel-core/src/core/ml/embeddings.rs` | Embedding generation and vector similarity |
| `crates/jobsentinel-core/src/core/ml/matcher.rs` | Semantic skill matching logic |
| `crates/jobsentinel-core/src/core/resume/matcher/hybrid_score.rs` | Resume/job scoring bridge for hybrid matching and legacy fallback |
| `crates/jobsentinel-core/src/core/ml/tests.rs` | Feature-gated tests |
| `src-tauri/src/commands/ml.rs` | Feature-gated Tauri commands |
| `models.lock.toml` | Model supply-chain lockfile |

## Model Direction

The production direction is:

1. Qwen3 embedding retrieval through a JobSentinel-owned model layer.
2. Hybrid scoring with dense retrieval, exact skill taxonomy hits, and BM25.
3. Qwen3 reranking only for bounded top-K candidates.
4. Evidence labels, blockers, and plain explanations instead of unsupported
   fit percentages.
5. Deterministic fallback when local ML is unavailable.

The current Qwen3 embedding backend is `qwen3-candle`, and the bounded reranker
backend is `qwen3-reranker-candle`. Both use JobSentinel's verified cache.
FastEmbed may still be considered as a backend implementation later, but
JobSentinel owns model identity, revisions, cache integrity, runtime
compatibility, vector provenance, thresholds, and scoring semantics. Do not let
a convenience downloader decide production model bytes.

## Evaluation And Improvement

The highest-ROI quality path is supervised ranking work, not reinforcement
learning. Capture and evaluate in this order:

1. Domain eval set with labels: no evidence, keyword-only, related incomplete,
   strong direct evidence, and exceptional ownership.
2. Hard negatives mined from plausible false positives.
3. Qwen3 reranker fine-tuning when labels are sufficient.
4. Embedding fine-tuning only if dense retrieval fails to bring correct
   candidates into top-K.
5. A lightweight learning-to-rank layer over explainable features.
6. Contextual bandit personalization only after real feedback volume exists.

The checked-in seed eval fixture is intentionally small. It proves schema,
coverage, hard-negative shape, role-family expansion, skill-graph confusables,
fairness counterfactuals, self-preference checks, adversarial postings, and
generated-advice separation before scoring changes. Production-quality
evaluation still needs larger reviewed sets for:

- job requirement to resume evidence
- resume profile to job match
- skill phrase to resume evidence
- job title to resume title and seniority
- gap analysis

The current repo-native eval pack is
`crates/jobsentinel-core/src/core/ml/eval_fixtures/seed_v1.json`, backed by typed contracts
and unit tests. If JobSentinel adds a standalone CLI later, the command surface
should map to retrieval, reranker, fairness, self-preference, and explanation
evals without changing the underlying fixture schema.

The research-backed evaluation contract is summarized in
[Semantic resume-job matching](../research/semantic-resume-job-matching.md).

Feedback records must be training-friendly and privacy-preserving. Store hashes,
local ids, ranks, scores, evidence classes, and user actions. Do not store raw
resume text, notes, URLs with tokens, browser state, or provider payloads in
diagnostic or training logs.

Preferred improvement path:

1. Improve labels and eval coverage.
2. Mine hard negatives from false positives.
3. Fine-tune the Qwen3 reranker first.
4. Fine-tune Qwen3 embeddings only if retrieval recall stays poor.
5. Add preference learning or a lightweight learning-to-rank layer.
6. Consider bandit-style personalization much later, after enough user
   feedback exists.

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

This diagnostics command is always registered:

| Command | Purpose |
| ------- | ------- |
| `get_semantic_matching_diagnostics` | Reports local matching mode, Qwen3 model-lock metadata when available, local cache readiness, scoring signals, and privacy-safe quality checks |

These commands are registered only when the app is built with `embedded-ml`:

| Command | Purpose |
| ------- | ------- |
| `download_ml_model` | Downloads model files into the app data model cache |
| `get_ml_status` | Reports model id, revision, backend, model-lock hash, and whether files are available locally |
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
| Runtime dimension differs from vector index | Refuse to use the stale index and rebuild vectors after user-visible setup. |
| Instruction profile changes | Mark existing vectors stale and rebuild before using semantic scores. |
| Reranker is unavailable | Use dense retrieval, exact skill matching, BM25, and mark output as not reranked. |
| Metal acceleration is unavailable | Fall back to CPU inference. |
| Model files are missing | Show local matching fallback and an explicit download action. |
| Matching output looks wrong | Let the user edit skills and visible assumptions before using the result. |

Do not log raw resume text, private notes, salary floors, local file paths, or
application history while debugging local ML.

## References

- [Candle documentation](https://huggingface.co/docs/candle)
- [Qwen3 Embedding model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- [Qwen3 Reranker model card](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B)
- [all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Sentence Transformers](https://www.sbert.net/)
- [BERT paper](https://arxiv.org/abs/1810.04805)
- [Semantic resume-job matching research](../research/semantic-resume-job-matching.md)
- [Hugging Face Candle](https://github.com/huggingface/candle)
- [Hugging Face Hub client](https://github.com/huggingface/hf-hub)
