# Semantic Resume-Job Matching Research

Reviewed on 2026-06-19.

This note distills the current research direction for JobSentinel local
semantic matching. It is candidate-side guidance for helping users understand
fit, gaps, and evidence. It is not an employer-screening model, hiring-outcome
predictor, or demographic inference system.

## Product Direction

JobSentinel should use a multi-stage matching pipeline:

```text
resume and job ingestion
  -> structured extraction
  -> semantic chunking
  -> dense embedding retrieval
  -> BM25 and exact skill retrieval
  -> candidate merge and dedupe
  -> bounded Qwen3 reranking
  -> requirement-level evidence scoring
  -> hard requirement blockers
  -> plain explanation
```

The research-backed architecture is:

- `Qwen/Qwen3-Embedding-0.6B` for dense retrieval.
- BM25 and exact skill matching for lexical and taxonomy evidence.
- `Qwen/Qwen3-Reranker-0.6B` for bounded top-K reranking.
- Evidence classes for requirement-level explanations.
- Hard-negative mining from plausible false positives.
- Lightweight learning-to-rank over explainable features after enough labels
  exist.

Do not collapse this into one opaque percentage. The product value is the
inspectable explanation.

## Research Map

| Research thread | JobSentinel use |
| --- | --- |
| ConFit and ConFit v2 | Dense retrieval, contrastive learning, hard-negative mining, Recall@K and nDCG evaluation |
| ConFit v3 | Reranking, evidence-grounded reasoning, noisy-sample filtering, future reranker tuning |
| PJFNN and APJFNN | Requirement-level and ability-level evidence scoring |
| Sparse interaction and co-teaching work | Feedback labels are noisy and should not be treated as clean truth |
| Career-path-aware person-job fit | Seniority, role trajectory, and stretch-vs-safe recommendation modes |
| Feature-fusion person-job fit | Blend semantic, lexical, skill, salary, location, seniority, and preference features |
| Bias and LLM resume-matching evaluations | Avoid protected proxies and explain through work evidence |

## Evaluation Contract

Before changing matching behavior, add or update labeled eval data for:

- job requirement to resume evidence;
- resume profile to job match;
- skill phrase to resume evidence;
- job title to resume title and seniority;
- gap analysis;
- hard requirement blockers.

Use labels:

```text
0 = no evidence
1 = keyword-only or weak evidence
2 = related but incomplete evidence
3 = strong direct evidence
4 = exceptional evidence with ownership, architecture, leadership, or scale
```

Track at least:

- Recall@10 and Recall@50 for retrieval;
- nDCG@10 for ranking quality;
- MRR where a single best evidence item is expected;
- hard-requirement false positives;
- reranker latency and top-K size;
- retrieval provenance coverage.

Do not assert exact floating-point scores across model backends. Assert
ordering, evidence class, blocker behavior, and score bands.

## Hard Negatives

Hard negatives are high-scoring but wrong or incomplete matches. They are
especially important for resume-job matching because many near misses share
vocabulary.

Example:

```text
Requirement:
  Experience building Kubernetes security detections

Positive:
  Built Kubernetes audit-log detections for suspicious RBAC changes.

Hard negative:
  Deployed applications to Kubernetes using Helm.
```

Mine hard negatives from:

- dense top-K results that the reranker or user marks wrong;
- keyword-only matches that lack concrete evidence;
- required-skill near misses;
- seniority mismatches;
- hard constraints that semantic similarity would otherwise over-credit.

Fine-tune or calibrate the reranker before fine-tuning embeddings. Embedding
fine-tuning is only justified when correct evidence does not appear in top-K
retrieval.

## Evidence And Explanation Rules

Match explanations should name:

- direct strengths;
- weak or partial evidence;
- missing hard requirements;
- hard blockers and why they cap confidence;
- exact resume or job evidence used;
- uncertainty when the source text is thin.

Avoid:

- school prestige as a proxy for skill;
- inferred age, gender, race, ethnicity, religion, disability, or name origin;
- unexplained culture-fit claims;
- career-gap penalties without user-confirmed context;
- unsupported claims that a user is likely to be hired.

## Feedback Learning

User feedback is useful but noisy. A hidden or skipped job may mean poor fit,
wrong location, low salary, already seen, poor timing, or simple fatigue.

Store privacy-preserving feedback features:

- local job and resume ids;
- rank and score bands;
- dense, BM25, skill, reranker, salary, location, and seniority features;
- evidence class;
- user action;
- timestamp.

Do not store raw resumes, notes, provider payloads, browser state, cookies,
tokens, or URLs with secrets in feedback or eval logs.

## Implementation Implications

- Keep `models.lock.toml` as the model supply-chain source of truth.
- Keep model identity separate from backend identity.
- Keep Qwen3 embeddings and reranking behind JobSentinel-owned traits.
- Keep hybrid scoring deterministic and inspectable.
- Add a diagnostics surface before release signoff so users and developers can
  see dense, lexical, skill, reranker, blocker, and evidence-class signals.
- Keep external AI optional and separate from local semantic matching.

## Sources

- [ConFit: Improving Resume-Job Matching using Data Augmentation and Contrastive Learning](https://arxiv.org/abs/2401.16349)
- [ConFit v2: Improving Resume-Job Matching using Hypothetical Resume Embedding and Runner-Up Hard-Negative Mining](https://arxiv.org/abs/2502.12361)
- [ConFit v3: Improving Resume-Job Matching with LLM-based Re-Ranking](https://arxiv.org/abs/2605.09760)
- [Person-Job Fit: Adapting the Right Talent for the Right Job with Joint Representation Learning](https://arxiv.org/abs/1810.04040)
- [Enhancing Person-Job Fit for Talent Recruitment: An Ability-aware Neural Network Approach](https://arxiv.org/abs/1812.08947)
- [Learning to Match Jobs with Resumes from Sparse Interaction Data using Multi-View Co-Teaching Network](https://arxiv.org/abs/2009.13299)
- [Your Career Path Matters in Person-Job Fit](https://ojs.aaai.org/index.php/AAAI/article/view/28685)
- [A Bibliometric Perspective on AI Research for Job-Resume Matching](https://pmc.ncbi.nlm.nih.gov/articles/PMC9550515/)
- [Learning Effective Representations for Person-Job Fit by Feature Fusion](https://arxiv.org/abs/2006.07017)
- [Person-job fit estimation from candidate profile and related recruitment history with co-attention neural networks](https://arxiv.org/abs/2206.09116)
- [Enhancing Online Recruitment with Category-Aware MoE and LLM-based Data Augmentation](https://arxiv.org/abs/2604.21264)
- [Evaluating Bias in LLMs for Job-Resume Matching](https://arxiv.org/html/2503.19182v1)
- [Learning to Retrieve for Job Matching](https://arxiv.org/html/2402.13435v1)
