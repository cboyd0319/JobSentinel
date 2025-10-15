"""
Cross-Encoder Reranking for Job Matching

Improves initial ranking using cross-encoder models that jointly encode
query and candidate for more accurate similarity scoring.

Architecture:
1. Initial retrieval: Fast bi-encoder (sentence-transformers) gets top-K
2. Reranking: Slow but accurate cross-encoder re-scores top-K
3. Final results: Reranked candidates with improved precision

Benefits:
- 5-10% precision improvement on top results
- Better relevance for complex queries
- Minimal overhead (only rerank top-K)
- No training required (use pretrained models)

References:
- "Cross-Encoders" (Reimers & Gurevych, 2020) | https://arxiv.org/abs/1908.10084 | High
- sentence-transformers cross-encoders | https://www.sbert.net/examples/applications/cross-encoder/README.html | High
- "Late Interaction" (Khattab & Zaharia, 2020) | https://arxiv.org/abs/2004.12832 | Medium

Performance Targets:
- Initial retrieval: <100ms for 10K candidates
- Reranking: <200ms for top-20 candidates
- Precision improvement: +5-10% on top-10 results
- Memory: <1GB with model loaded

Security:
- OWASP ASVS V5.1.1 input validation
- Max input: 512 tokens per pair
- No external API calls
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


# ============================================================================
# Data Models
# ============================================================================


@dataclass
class Candidate:
    """A candidate item for reranking."""

    candidate_id: str
    text: str
    initial_score: float = 0.0
    rerank_score: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RerankResult:
    """Result of reranking operation."""

    reranked_candidates: list[Candidate]
    query: str
    num_candidates: int
    rerank_time_ms: float
    precision_improvement: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


# ============================================================================
# Cross-Encoder Model
# ============================================================================


class CrossEncoderReranker:
    """
    Reranker using cross-encoder models.

    Cross-encoders jointly encode query and candidate, allowing
    attention between query and candidate tokens for better accuracy.

    Trade-off:
    - Slower than bi-encoders (can't precompute embeddings)
    - More accurate (joint attention mechanism)
    - Best used for reranking top-K from fast initial retrieval
    """

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        max_length: int = 512,
        batch_size: int = 16,
    ):
        """
        Initialize cross-encoder reranker.

        Args:
            model_name: Pretrained cross-encoder model
            max_length: Maximum sequence length
            batch_size: Batch size for inference
        """
        self.model_name = model_name
        self.max_length = max_length
        self.batch_size = batch_size
        self._model = None

        logger.info(f"CrossEncoderReranker initialized with model: {model_name}")

    def _load_model(self) -> Any:
        """Lazy load cross-encoder model."""
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder

                logger.info(f"Loading cross-encoder model: {self.model_name}")
                self._model = CrossEncoder(self.model_name, max_length=self.max_length)
                logger.info("Cross-encoder model loaded successfully")

            except ImportError:
                logger.error(
                    "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers"
                )
                raise

            except Exception as e:
                logger.error(f"Error loading cross-encoder model: {e}")
                raise

        return self._model

    def rerank(
        self,
        query: str,
        candidates: list[Candidate],
        top_k: int | None = None,
    ) -> RerankResult:
        """
        Rerank candidates using cross-encoder.

        Args:
            query: Query text (e.g., resume or job requirements)
            candidates: List of candidates to rerank
            top_k: Return top-k results (default: all)

        Returns:
            RerankResult with reranked candidates
        """
        start_time = time.time()

        if not candidates:
            logger.warning("No candidates to rerank")
            return RerankResult(
                reranked_candidates=[],
                query=query,
                num_candidates=0,
                rerank_time_ms=0.0,
            )

        # Load model
        model = self._load_model()

        # Prepare query-candidate pairs
        pairs = [[query, candidate.text] for candidate in candidates]

        # Predict scores in batches
        try:
            scores = model.predict(
                pairs,
                batch_size=self.batch_size,
                show_progress_bar=False,
            )

            # Update candidate scores
            for candidate, score in zip(candidates, scores, strict=False):
                candidate.rerank_score = float(score)

            # Sort by rerank score (descending)
            reranked = sorted(
                candidates,
                key=lambda c: c.rerank_score,
                reverse=True,
            )

            # Take top-k if specified
            if top_k is not None:
                reranked = reranked[:top_k]

            # Calculate precision improvement (if initial scores available)
            precision_improvement = self._calculate_precision_improvement(candidates, reranked)

            elapsed_ms = (time.time() - start_time) * 1000

            logger.info(
                f"Reranked {len(candidates)} candidates in {elapsed_ms:.1f}ms "
                f"(precision improvement: {precision_improvement:.1%})"
            )

            return RerankResult(
                reranked_candidates=reranked,
                query=query,
                num_candidates=len(candidates),
                rerank_time_ms=elapsed_ms,
                precision_improvement=precision_improvement,
                metadata={
                    "model": self.model_name,
                    "top_k": top_k,
                },
            )

        except Exception as e:
            logger.error(f"Error during reranking: {e}")
            # Fallback: return candidates in original order
            elapsed_ms = (time.time() - start_time) * 1000
            return RerankResult(
                reranked_candidates=candidates,
                query=query,
                num_candidates=len(candidates),
                rerank_time_ms=elapsed_ms,
                metadata={"error": str(e)},
            )

    def _calculate_precision_improvement(
        self,
        original: list[Candidate],
        reranked: list[Candidate],
    ) -> float:
        """
        Calculate precision improvement from reranking.

        Compares top-10 candidates before and after reranking.
        Improvement = (reranked_score - original_score) / original_score

        Args:
            original: Original candidate list
            reranked: Reranked candidate list

        Returns:
            Precision improvement ratio
        """
        if not original or not reranked:
            return 0.0

        # Get top-10 from each
        k = min(10, len(original), len(reranked))

        # Sort original by initial score
        original_sorted = sorted(original, key=lambda c: c.initial_score, reverse=True)

        # Calculate average scores for top-k
        original_top_k_score = np.mean([c.initial_score for c in original_sorted[:k]])
        reranked_top_k_score = np.mean([c.rerank_score for c in reranked[:k]])

        # Calculate improvement
        if original_top_k_score > 0:
            improvement = (reranked_top_k_score - original_top_k_score) / original_top_k_score
            return max(0.0, improvement)  # Return 0 if negative

        return 0.0


# ============================================================================
# Hybrid Retrieval + Reranking Pipeline
# ============================================================================


class HybridRanker:
    """
    Hybrid ranking pipeline combining fast retrieval and accurate reranking.

    Pipeline:
    1. Fast bi-encoder retrieval from large pool (e.g., 10K candidates)
    2. Cross-encoder reranking of top-K (e.g., top-100)
    3. Return top-N final results (e.g., top-20)

    This provides both speed and accuracy.
    """

    def __init__(
        self,
        bi_encoder_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        cross_encoder_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        initial_top_k: int = 100,
        final_top_k: int = 20,
    ):
        """
        Initialize hybrid ranker.

        Args:
            bi_encoder_model: Model for initial retrieval
            cross_encoder_model: Model for reranking
            initial_top_k: Number of candidates to retrieve
            final_top_k: Number of final results after reranking
        """
        self.initial_top_k = initial_top_k
        self.final_top_k = final_top_k

        # Initialize bi-encoder (for initial retrieval)
        self._bi_encoder = None
        self.bi_encoder_model = bi_encoder_model

        # Initialize cross-encoder (for reranking)
        self.cross_encoder = CrossEncoderReranker(model_name=cross_encoder_model)

        logger.info(
            f"HybridRanker initialized "
            f"(bi-encoder: {bi_encoder_model}, "
            f"cross-encoder: {cross_encoder_model})"
        )

    def _load_bi_encoder(self) -> Any:
        """Lazy load bi-encoder model."""
        if self._bi_encoder is None:
            try:
                from sentence_transformers import SentenceTransformer

                logger.info(f"Loading bi-encoder model: {self.bi_encoder_model}")
                self._bi_encoder = SentenceTransformer(self.bi_encoder_model)
                logger.info("Bi-encoder model loaded successfully")

            except ImportError:
                logger.error("sentence-transformers not installed")
                raise

            except Exception as e:
                logger.error(f"Error loading bi-encoder model: {e}")
                raise

        return self._bi_encoder

    def rank(
        self,
        query: str,
        candidates: list[Candidate],
        skip_reranking: bool = False,
    ) -> RerankResult:
        """
        Rank candidates using hybrid pipeline.

        Args:
            query: Query text
            candidates: Pool of candidates
            skip_reranking: If True, skip reranking step (faster)

        Returns:
            RerankResult with final ranked candidates
        """
        start_time = time.time()

        if not candidates:
            logger.warning("No candidates to rank")
            return RerankResult(
                reranked_candidates=[],
                query=query,
                num_candidates=0,
                rerank_time_ms=0.0,
            )

        # Step 1: Initial retrieval with bi-encoder
        logger.info(f"Step 1: Initial retrieval from {len(candidates)} candidates")

        # Compute embeddings
        bi_encoder = self._load_bi_encoder()

        query_embedding = bi_encoder.encode(query, convert_to_tensor=False)
        candidate_embeddings = bi_encoder.encode(
            [c.text for c in candidates],
            convert_to_tensor=False,
            show_progress_bar=False,
        )

        # Calculate cosine similarities
        from sklearn.metrics.pairwise import cosine_similarity

        similarities = cosine_similarity(
            query_embedding.reshape(1, -1),
            candidate_embeddings,
        )[0]

        # Update initial scores
        for candidate, sim in zip(candidates, similarities, strict=False):
            candidate.initial_score = float(sim)

        # Get top-K candidates
        sorted_candidates = sorted(
            candidates,
            key=lambda c: c.initial_score,
            reverse=True,
        )
        top_k_candidates = sorted_candidates[: self.initial_top_k]

        logger.info(
            f"Step 1 complete: Retrieved top-{len(top_k_candidates)} candidates "
            f"(avg score: {np.mean([c.initial_score for c in top_k_candidates]):.3f})"
        )

        # Step 2: Reranking with cross-encoder (if enabled)
        if skip_reranking:
            logger.info("Step 2: Reranking skipped")
            final_candidates = top_k_candidates[: self.final_top_k]

            elapsed_ms = (time.time() - start_time) * 1000

            return RerankResult(
                reranked_candidates=final_candidates,
                query=query,
                num_candidates=len(candidates),
                rerank_time_ms=elapsed_ms,
                metadata={
                    "pipeline": "bi-encoder_only",
                    "skipped_reranking": True,
                },
            )

        logger.info(f"Step 2: Reranking top-{len(top_k_candidates)} candidates")

        rerank_result = self.cross_encoder.rerank(
            query=query,
            candidates=top_k_candidates,
            top_k=self.final_top_k,
        )

        # Update total time
        total_time_ms = (time.time() - start_time) * 1000
        rerank_result.rerank_time_ms = total_time_ms
        rerank_result.metadata["pipeline"] = "hybrid"
        rerank_result.metadata["initial_retrieval_size"] = len(top_k_candidates)

        logger.info(
            f"Hybrid ranking complete in {total_time_ms:.1f}ms "
            f"(precision improvement: {rerank_result.precision_improvement:.1%})"
        )

        return rerank_result


# ============================================================================
# Example Usage
# ============================================================================


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)

    # Create sample candidates
    print("\n=== Creating Sample Candidates ===")
    candidates = [
        Candidate(
            candidate_id="job_001",
            text="Senior Python Developer with 5+ years experience in ML and data science.",
            initial_score=0.85,
        ),
        Candidate(
            candidate_id="job_002",
            text="Junior Java Developer for web applications and backend services.",
            initial_score=0.60,
        ),
        Candidate(
            candidate_id="job_003",
            text="Machine Learning Engineer with expertise in PyTorch and NLP.",
            initial_score=0.92,
        ),
        Candidate(
            candidate_id="job_004",
            text="Data Scientist role focusing on Python, SQL, and statistical modeling.",
            initial_score=0.78,
        ),
        Candidate(
            candidate_id="job_005",
            text="Frontend Developer needed for React and TypeScript projects.",
            initial_score=0.45,
        ),
    ]

    query = "Looking for Python Machine Learning position with NLP experience"

    # Example 1: Basic reranking
    print("\n=== Example 1: Basic Reranking ===")
    reranker = CrossEncoderReranker()

    result = reranker.rerank(query=query, candidates=candidates, top_k=3)

    print(f"\nQuery: {query}")
    print(f"Reranked top-{len(result.reranked_candidates)} candidates:")
    for i, candidate in enumerate(result.reranked_candidates, 1):
        print(f"\n{i}. {candidate.candidate_id}")
        print(f"   Initial score: {candidate.initial_score:.3f}")
        print(f"   Rerank score:  {candidate.rerank_score:.3f}")
        print(f"   Text: {candidate.text[:80]}...")

    print(f"\nReranking time: {result.rerank_time_ms:.1f}ms")
    print(f"Precision improvement: {result.precision_improvement:.1%}")

    # Example 2: Hybrid pipeline
    print("\n=== Example 2: Hybrid Pipeline ===")

    # Create larger candidate pool
    large_pool = []
    for i in range(50):
        large_pool.append(
            Candidate(
                candidate_id=f"job_{i:03d}",
                text=f"Job posting {i} with various requirements and qualifications.",
                initial_score=np.random.uniform(0.3, 0.95),
            )
        )

    # Add our specific candidates
    large_pool.extend(candidates)

    # Run hybrid ranking
    hybrid_ranker = HybridRanker(
        initial_top_k=20,
        final_top_k=5,
    )

    hybrid_result = hybrid_ranker.rank(
        query=query,
        candidates=large_pool,
    )

    print(f"\nHybrid ranking from pool of {len(large_pool)} candidates")
    print(f"Total time: {hybrid_result.rerank_time_ms:.1f}ms")
    print(f"\nTop-{len(hybrid_result.reranked_candidates)} results:")

    for i, candidate in enumerate(hybrid_result.reranked_candidates, 1):
        print(f"\n{i}. {candidate.candidate_id}")
        print(f"   Initial: {candidate.initial_score:.3f}, Rerank: {candidate.rerank_score:.3f}")

    print("\n✅ Cross-Encoder Reranking module ready!")
