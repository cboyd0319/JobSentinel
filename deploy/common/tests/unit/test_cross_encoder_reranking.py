"""
Tests for Cross-Encoder Reranking module.
"""

import pytest

pytest.importorskip("torch")
pytest.importorskip("numpy")

import numpy as np

from domains.ml.cross_encoder_reranking import (
    Candidate,
    CrossEncoderReranker,
    HybridRanker,
)


def test_candidate_creation():
    """Test Candidate dataclass creation."""
    candidate = Candidate(
        candidate_id="job_001",
        text="Senior Python Developer position",
        initial_score=0.85,
    )

    assert candidate.candidate_id == "job_001"
    assert candidate.text == "Senior Python Developer position"
    assert candidate.initial_score == 0.85
    assert candidate.rerank_score == 0.0


def test_cross_encoder_reranker_initialization():
    """Test CrossEncoderReranker initialization."""
    reranker = CrossEncoderReranker(
        model_name="cross-encoder/ms-marco-MiniLM-L-6-v2",
        max_length=512,
        batch_size=16,
    )

    assert reranker.model_name == "cross-encoder/ms-marco-MiniLM-L-6-v2"
    assert reranker.max_length == 512
    assert reranker.batch_size == 16
    assert reranker._model is None  # Lazy loading


def test_cross_encoder_reranker_empty_candidates():
    """Test reranking with no candidates."""
    reranker = CrossEncoderReranker()

    result = reranker.rerank(
        query="Python Machine Learning position",
        candidates=[],
    )

    assert len(result.reranked_candidates) == 0
    assert result.num_candidates == 0


def test_cross_encoder_reranker_basic():
    """Test basic reranking functionality."""
    reranker = CrossEncoderReranker()

    candidates = [
        Candidate(
            candidate_id="job_001",
            text="Senior Python Developer with ML experience",
            initial_score=0.75,
        ),
        Candidate(
            candidate_id="job_002",
            text="Java Backend Engineer position",
            initial_score=0.60,
        ),
        Candidate(
            candidate_id="job_003",
            text="Machine Learning Engineer with Python skills",
            initial_score=0.80,
        ),
    ]

    query = "Looking for Python ML engineer role"

    result = reranker.rerank(query=query, candidates=candidates, top_k=2)

    # Should return top 2
    assert len(result.reranked_candidates) == 2
    assert result.num_candidates == 3
    assert result.query == query

    # All candidates should have rerank scores
    for candidate in result.reranked_candidates:
        assert candidate.rerank_score != 0.0


def test_cross_encoder_reranker_top_k():
    """Test top_k parameter."""
    reranker = CrossEncoderReranker()

    candidates = [
        Candidate(f"job_{i:03d}", f"Job description {i}", initial_score=np.random.rand())
        for i in range(20)
    ]

    query = "Test query"

    # Get top 5
    result = reranker.rerank(query=query, candidates=candidates, top_k=5)

    assert len(result.reranked_candidates) == 5


def test_cross_encoder_reranker_all_candidates():
    """Test reranking all candidates when top_k is None."""
    reranker = CrossEncoderReranker()

    candidates = [
        Candidate(f"job_{i:03d}", f"Job description {i}", initial_score=np.random.rand())
        for i in range(10)
    ]

    query = "Test query"

    result = reranker.rerank(query=query, candidates=candidates, top_k=None)

    # Should return all candidates
    assert len(result.reranked_candidates) == 10


def test_cross_encoder_precision_improvement():
    """Test precision improvement calculation."""
    reranker = CrossEncoderReranker()

    # Create candidates with initial scores
    candidates = [
        Candidate("job_001", "Great match", initial_score=0.9),
        Candidate("job_002", "Poor match", initial_score=0.3),
        Candidate("job_003", "Good match", initial_score=0.7),
    ]

    # Manually set rerank scores (simulating reranking)
    for i, candidate in enumerate(candidates):
        candidate.rerank_score = 1.0 - i * 0.3  # Descending scores

    # Calculate improvement
    reranked = sorted(candidates, key=lambda c: c.rerank_score, reverse=True)
    improvement = reranker._calculate_precision_improvement(candidates, reranked)

    # Should be non-negative
    assert improvement >= 0.0


def test_hybrid_ranker_initialization():
    """Test HybridRanker initialization."""
    ranker = HybridRanker(
        bi_encoder_model="sentence-transformers/all-MiniLM-L6-v2",
        cross_encoder_model="cross-encoder/ms-marco-MiniLM-L-6-v2",
        initial_top_k=100,
        final_top_k=20,
    )

    assert ranker.initial_top_k == 100
    assert ranker.final_top_k == 20
    assert ranker._bi_encoder is None  # Lazy loading
    assert ranker.cross_encoder is not None


def test_hybrid_ranker_empty_candidates():
    """Test hybrid ranking with no candidates."""
    ranker = HybridRanker()

    result = ranker.rank(
        query="Test query",
        candidates=[],
    )

    assert len(result.reranked_candidates) == 0


def test_hybrid_ranker_basic():
    """Test basic hybrid ranking."""
    ranker = HybridRanker(initial_top_k=10, final_top_k=5)

    # Create pool of candidates
    candidates = [
        Candidate(f"job_{i:03d}", f"Job description {i} with various skills") for i in range(30)
    ]

    query = "Python developer position"

    result = ranker.rank(query=query, candidates=candidates)

    # Should return final_top_k results
    assert len(result.reranked_candidates) <= 5
    # num_candidates reflects the candidates that went through reranking (initial_top_k)
    assert result.num_candidates == 10  # initial_top_k

    # All returned candidates should have both initial and rerank scores
    for candidate in result.reranked_candidates:
        assert candidate.initial_score != 0.0
        assert candidate.rerank_score != 0.0


def test_hybrid_ranker_skip_reranking():
    """Test hybrid ranking with reranking skipped."""
    ranker = HybridRanker(initial_top_k=10, final_top_k=5)

    candidates = [Candidate(f"job_{i:03d}", f"Job description {i}") for i in range(30)]

    query = "Test query"

    result = ranker.rank(query=query, candidates=candidates, skip_reranking=True)

    # Should still return results
    assert len(result.reranked_candidates) <= 5

    # Should have metadata indicating reranking was skipped
    assert "skipped_reranking" in result.metadata
    assert result.metadata["skipped_reranking"] is True


def test_hybrid_ranker_metadata():
    """Test that hybrid ranker includes metadata."""
    ranker = HybridRanker()

    candidates = [Candidate(f"job_{i:03d}", f"Job description {i}") for i in range(20)]

    query = "Test query"

    result = ranker.rank(query=query, candidates=candidates)

    # Check metadata
    assert "pipeline" in result.metadata
    assert result.metadata["pipeline"] in ["hybrid", "bi-encoder_only"]


def test_candidate_scoring():
    """Test that candidates get scored correctly."""
    reranker = CrossEncoderReranker()

    candidates = [
        Candidate("job_001", "Python ML engineer", initial_score=0.8),
        Candidate("job_002", "Java developer", initial_score=0.6),
    ]

    query = "Python machine learning"

    result = reranker.rerank(query=query, candidates=candidates)

    # All candidates should have rerank scores assigned
    for candidate in result.reranked_candidates:
        assert hasattr(candidate, "rerank_score")
        assert isinstance(candidate.rerank_score, float)


def test_rerank_result_structure():
    """Test RerankResult structure."""
    reranker = CrossEncoderReranker()

    candidates = [Candidate(f"job_{i}", f"Description {i}") for i in range(5)]
    query = "Test query"

    result = reranker.rerank(query=query, candidates=candidates)

    # Verify result structure
    assert hasattr(result, "reranked_candidates")
    assert hasattr(result, "query")
    assert hasattr(result, "num_candidates")
    assert hasattr(result, "rerank_time_ms")
    assert hasattr(result, "precision_improvement")
    assert hasattr(result, "metadata")

    assert isinstance(result.reranked_candidates, list)
    assert isinstance(result.query, str)
    assert isinstance(result.num_candidates, int)
    assert isinstance(result.rerank_time_ms, float)
    assert isinstance(result.precision_improvement, float)
    assert isinstance(result.metadata, dict)


def test_cross_encoder_model_caching():
    """Test that model is cached after first load."""
    reranker = CrossEncoderReranker()

    candidates = [Candidate("job_001", "Test job")]
    query = "Test"

    # First call - loads model
    reranker.rerank(query=query, candidates=candidates)
    assert reranker._model is not None

    # Second call - should use cached model
    model_ref = reranker._model
    reranker.rerank(query=query, candidates=candidates)
    assert reranker._model is model_ref  # Same object


def test_hybrid_ranker_model_caching():
    """Test that both models are cached in hybrid ranker."""
    ranker = HybridRanker()

    candidates = [Candidate(f"job_{i}", f"Description {i}") for i in range(10)]
    query = "Test query"

    # First call - loads models
    ranker.rank(query=query, candidates=candidates)

    assert ranker._bi_encoder is not None
    assert ranker.cross_encoder._model is not None

    # Verify models are cached
    bi_ref = ranker._bi_encoder
    cross_ref = ranker.cross_encoder._model

    # Second call
    ranker.rank(query=query, candidates=candidates)

    assert ranker._bi_encoder is bi_ref
    assert ranker.cross_encoder._model is cross_ref
