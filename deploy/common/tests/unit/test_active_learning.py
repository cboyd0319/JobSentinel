"""
Tests for Active Learning module.
"""

import time

import numpy as np
import pytest

from domains.ml.active_learning import (
    ActiveLearningManager,
    DiversitySampler,
    QueryStrategy,
    RetrainingTrigger,
    Sample,
    UncertaintySampler,
)


def test_sample_creation():
    """Test Sample dataclass creation."""
    sample = Sample(
        sample_id="test_001",
        text="Job description text",
        embedding=np.random.randn(384),
        predicted_label=1,
        confidence=0.85,
    )

    assert sample.sample_id == "test_001"
    assert sample.text == "Job description text"
    assert sample.embedding.shape == (384,)
    assert sample.predicted_label == 1
    assert sample.confidence == 0.85
    assert not sample.labeled


def test_uncertainty_sampler_least_confident():
    """Test least confident uncertainty scoring."""
    sampler = UncertaintySampler()

    # High confidence (low uncertainty)
    probs_high = np.array([0.9, 0.05, 0.05])
    uncertainty_high = sampler.least_confident(probs_high)
    assert uncertainty_high == pytest.approx(0.1, abs=0.01)

    # Low confidence (high uncertainty)
    probs_low = np.array([0.4, 0.3, 0.3])
    uncertainty_low = sampler.least_confident(probs_low)
    assert uncertainty_low == pytest.approx(0.6, abs=0.01)


def test_uncertainty_sampler_margin():
    """Test margin uncertainty scoring."""
    sampler = UncertaintySampler()

    # Large margin (low uncertainty)
    probs_large = np.array([0.8, 0.15, 0.05])
    uncertainty_large = sampler.margin(probs_large)
    assert uncertainty_large < 0.5

    # Small margin (high uncertainty)
    probs_small = np.array([0.51, 0.49, 0.0])
    uncertainty_small = sampler.margin(probs_small)
    assert uncertainty_small > 0.9


def test_uncertainty_sampler_entropy():
    """Test entropy uncertainty scoring."""
    sampler = UncertaintySampler()

    # Uniform distribution (high entropy/uncertainty)
    probs_uniform = np.array([0.33, 0.33, 0.34])
    entropy_uniform = sampler.entropy(probs_uniform)
    assert entropy_uniform > 0.9

    # Concentrated distribution (low entropy/uncertainty)
    probs_concentrated = np.array([0.95, 0.03, 0.02])
    entropy_concentrated = sampler.entropy(probs_concentrated)
    assert entropy_concentrated < 0.3


def test_diversity_sampler():
    """Test diversity scoring."""
    sampler = DiversitySampler(n_clusters=3)

    # Create sample embeddings
    embeddings = np.random.randn(20, 10)

    # Compute diversity scores
    scores = sampler.compute_diversity_scores(embeddings)

    assert len(scores) == 20
    assert np.all(scores >= 0.0)
    assert np.all(scores <= 1.0)


def test_diversity_sampler_with_labeled():
    """Test diversity scoring with already labeled samples."""
    sampler = DiversitySampler(n_clusters=3)

    embeddings = np.random.randn(20, 10)
    already_labeled = np.zeros(20, dtype=bool)
    already_labeled[:5] = True  # First 5 are labeled

    scores = sampler.compute_diversity_scores(embeddings, already_labeled)

    assert len(scores) == 20
    # Samples far from labeled ones should have higher diversity scores
    assert scores.max() > 0.0


def test_active_learning_manager_initialization():
    """Test ActiveLearningManager initialization."""
    manager = ActiveLearningManager(
        strategy=QueryStrategy.HYBRID,
        batch_size=10,
    )

    assert manager.strategy == QueryStrategy.HYBRID
    assert manager.batch_size == 10
    assert manager.stats["total_queries"] == 0


def test_active_learning_manager_select_uncertainty():
    """Test uncertainty-based sample selection."""
    manager = ActiveLearningManager(strategy=QueryStrategy.UNCERTAINTY)

    # Create candidates with varying confidence
    candidates = [
        Sample(sample_id=f"s{i}", text=f"text {i}", confidence=np.random.uniform(0.5, 1.0))
        for i in range(50)
    ]

    result = manager.select_samples(candidates, num_samples=10)

    assert len(result.selected_samples) == 10
    assert result.strategy == QueryStrategy.UNCERTAINTY

    # Selected samples should have low confidence (high uncertainty)
    avg_confidence = np.mean([s.confidence for s in result.selected_samples])
    overall_avg = np.mean([s.confidence for s in candidates])
    assert avg_confidence <= overall_avg


def test_active_learning_manager_select_diversity():
    """Test diversity-based sample selection."""
    manager = ActiveLearningManager(strategy=QueryStrategy.DIVERSITY)

    # Create candidates with embeddings
    candidates = [
        Sample(
            sample_id=f"s{i}",
            text=f"text {i}",
            embedding=np.random.randn(384),
            confidence=0.8,
        )
        for i in range(50)
    ]

    result = manager.select_samples(candidates, num_samples=10)

    assert len(result.selected_samples) == 10
    assert result.strategy == QueryStrategy.DIVERSITY


def test_active_learning_manager_select_hybrid():
    """Test hybrid sample selection."""
    manager = ActiveLearningManager(strategy=QueryStrategy.HYBRID)

    # Create candidates with both confidence and embeddings
    candidates = [
        Sample(
            sample_id=f"s{i}",
            text=f"text {i}",
            embedding=np.random.randn(384),
            confidence=np.random.uniform(0.5, 1.0),
        )
        for i in range(50)
    ]

    result = manager.select_samples(candidates, num_samples=10)

    assert len(result.selected_samples) == 10
    assert result.strategy == QueryStrategy.HYBRID

    # Verify query scores were computed
    for sample in result.selected_samples:
        assert sample.query_score > 0.0


def test_active_learning_manager_select_random():
    """Test random sample selection."""
    manager = ActiveLearningManager(strategy=QueryStrategy.RANDOM)

    candidates = [Sample(sample_id=f"s{i}", text=f"text {i}") for i in range(50)]

    result = manager.select_samples(candidates, num_samples=10)

    assert len(result.selected_samples) == 10
    assert result.strategy == QueryStrategy.RANDOM


def test_active_learning_manager_add_labels():
    """Test adding labels to samples."""
    manager = ActiveLearningManager()

    samples = [Sample(sample_id=f"s{i}", text=f"text {i}") for i in range(10)]

    labels = list(range(10))
    manager.add_labels(samples, labels)

    # Verify all samples are labeled
    for sample, label in zip(samples, labels, strict=False):
        assert sample.labeled
        assert sample.label == label

    # Verify stats updated
    assert manager.stats["total_samples_labeled"] == 10


def test_active_learning_manager_add_labels_mismatch():
    """Test that mismatched samples and labels raises error."""
    manager = ActiveLearningManager()

    samples = [Sample(sample_id=f"s{i}", text=f"text {i}") for i in range(10)]
    labels = [0, 1, 2]  # Only 3 labels for 10 samples

    with pytest.raises(ValueError, match="must match"):
        manager.add_labels(samples, labels)


def test_retraining_trigger():
    """Test RetrainingTrigger configuration."""
    trigger = RetrainingTrigger(
        min_new_samples=100,
        max_time_hours=168,
        min_accuracy_drop=0.05,
        force_retrain=False,
    )

    assert trigger.min_new_samples == 100
    assert trigger.max_time_hours == 168
    assert trigger.min_accuracy_drop == 0.05
    assert not trigger.force_retrain


def test_should_retrain_not_enough_samples():
    """Test retraining check with insufficient samples."""
    manager = ActiveLearningManager()

    trigger = RetrainingTrigger(min_new_samples=100)

    # Add only 50 samples
    samples = [Sample(sample_id=f"s{i}", text=f"text {i}") for i in range(50)]
    manager.add_labels(samples, [0] * 50)

    should_retrain = manager.should_retrain(trigger)
    assert not should_retrain


def test_should_retrain_force():
    """Test forced retraining."""
    manager = ActiveLearningManager()

    trigger = RetrainingTrigger(force_retrain=True)

    should_retrain = manager.should_retrain(trigger)
    assert should_retrain


def test_should_retrain_time_exceeded():
    """Test retraining when time limit exceeded."""
    manager = ActiveLearningManager()

    # Set last retrain time to past
    manager.stats["last_retrain_time"] = time.time() - (200 * 3600)  # 200 hours ago

    # Add enough samples
    samples = [Sample(sample_id=f"s{i}", text=f"text {i}") for i in range(150)]
    manager.add_labels(samples, [0] * 150)

    trigger = RetrainingTrigger(
        min_new_samples=100,
        max_time_hours=168,  # 1 week
    )

    should_retrain = manager.should_retrain(trigger)
    assert should_retrain


def test_should_retrain_accuracy_drop():
    """Test retraining when accuracy drops."""
    manager = ActiveLearningManager()

    # Add enough samples
    samples = [Sample(sample_id=f"s{i}", text=f"text {i}") for i in range(150)]
    manager.add_labels(samples, [0] * 150)

    trigger = RetrainingTrigger(min_new_samples=100, min_accuracy_drop=0.05)

    # Simulate accuracy drop
    should_retrain = manager.should_retrain(
        trigger,
        current_accuracy=0.80,
        baseline_accuracy=0.90,  # 10% drop
    )

    assert should_retrain


def test_mark_retrained():
    """Test marking model as retrained."""
    manager = ActiveLearningManager()

    old_time = manager.stats["last_retrain_time"]
    time.sleep(0.1)  # Small delay

    manager.mark_retrained()

    assert manager.stats["last_retrain_time"] > old_time


def test_get_statistics():
    """Test getting statistics."""
    manager = ActiveLearningManager()

    # Perform some operations
    candidates = [Sample(sample_id=f"s{i}", text=f"text {i}", confidence=0.8) for i in range(20)]

    manager.select_samples(candidates, num_samples=5)

    stats = manager.get_statistics()

    assert "total_queries" in stats
    assert "total_samples_labeled" in stats
    assert "by_strategy" in stats
    assert "hours_since_retrain" in stats
    assert stats["total_queries"] == 1


def test_select_samples_empty_candidates():
    """Test selection with no candidates."""
    manager = ActiveLearningManager()

    result = manager.select_samples([], num_samples=10)

    assert len(result.selected_samples) == 0
    assert result.num_candidates == 0


def test_select_samples_all_labeled():
    """Test selection when all candidates are labeled."""
    manager = ActiveLearningManager()

    candidates = [Sample(sample_id=f"s{i}", text=f"text {i}", labeled=True) for i in range(20)]

    result = manager.select_samples(candidates, num_samples=10)

    assert len(result.selected_samples) == 0


def test_query_strategies_enum():
    """Test QueryStrategy enum values."""
    assert QueryStrategy.UNCERTAINTY.value == "uncertainty"
    assert QueryStrategy.MARGIN.value == "margin"
    assert QueryStrategy.ENTROPY.value == "entropy"
    assert QueryStrategy.DIVERSITY.value == "diversity"
    assert QueryStrategy.RANDOM.value == "random"
    assert QueryStrategy.HYBRID.value == "hybrid"
