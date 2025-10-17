"""Comprehensive tests for domains/ml/confidence_scorer.py.

Tests cover:
- ConfidenceLevel enum: all values and properties
- PredictionType enum: all values and properties
- ConfidenceFactors: initialization, validation, auto-clipping
- ConfidenceScore: properties, to_dict(), is_reliable
- ConfidenceCalculator: initialization, confidence calculation, calibration
- BatchConfidenceScorer: batch scoring, statistics
- Helper functions: create_confidence_factors_from_dict
- Edge cases: boundary values, empty data, invalid inputs
"""

from __future__ import annotations

import pytest

from domains.ml.confidence_scorer import (
    BatchConfidenceScorer,
    ConfidenceCalculator,
    ConfidenceFactors,
    ConfidenceLevel,
    ConfidenceScore,
    PredictionType,
    create_confidence_factors_from_dict,
)


# ============================================================================
# ConfidenceLevel Enum Tests
# ============================================================================


def test_confidence_level_enum_has_all_levels():
    """ConfidenceLevel enum defines all expected levels."""
    assert ConfidenceLevel.VERY_HIGH.value == "very_high"
    assert ConfidenceLevel.HIGH.value == "high"
    assert ConfidenceLevel.MEDIUM.value == "medium"
    assert ConfidenceLevel.LOW.value == "low"
    assert ConfidenceLevel.VERY_LOW.value == "very_low"


def test_confidence_level_enum_count():
    """ConfidenceLevel has exactly 5 levels."""
    assert len(ConfidenceLevel) == 5


@pytest.mark.parametrize(
    "level",
    [ConfidenceLevel.VERY_HIGH, ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM,
     ConfidenceLevel.LOW, ConfidenceLevel.VERY_LOW],
    ids=["very_high", "high", "medium", "low", "very_low"],
)
def test_confidence_level_is_string_enum(level: ConfidenceLevel):
    """ConfidenceLevel members are string instances."""
    assert isinstance(level.value, str)


# ============================================================================
# PredictionType Enum Tests
# ============================================================================


def test_prediction_type_enum_has_all_types():
    """PredictionType enum defines all expected types."""
    assert PredictionType.CLASSIFICATION.value == "classification"
    assert PredictionType.REGRESSION.value == "regression"
    assert PredictionType.RANKING.value == "ranking"
    assert PredictionType.DETECTION.value == "detection"


def test_prediction_type_enum_count():
    """PredictionType has exactly 4 types."""
    assert len(PredictionType) == 4


# ============================================================================
# ConfidenceFactors Tests
# ============================================================================


def test_confidence_factors_initializes_with_defaults():
    """ConfidenceFactors initializes with default values."""
    factors = ConfidenceFactors()
    
    assert factors.model_confidence == 0.0
    assert factors.data_quality == 1.0
    assert factors.sample_size == 1.0
    assert factors.feature_coverage == 1.0
    assert factors.prediction_stability == 1.0
    assert factors.domain_match == 1.0


def test_confidence_factors_stores_custom_values():
    """ConfidenceFactors stores provided custom values."""
    factors = ConfidenceFactors(
        model_confidence=0.85,
        data_quality=0.90,
        sample_size=0.75,
        feature_coverage=0.80,
        prediction_stability=0.88,
        domain_match=0.92,
    )
    
    assert factors.model_confidence == 0.85
    assert factors.data_quality == 0.90
    assert factors.sample_size == 0.75
    assert factors.feature_coverage == 0.80
    assert factors.prediction_stability == 0.88
    assert factors.domain_match == 0.92


def test_confidence_factors_clips_values_above_one():
    """ConfidenceFactors clips values above 1.0."""
    factors = ConfidenceFactors(
        model_confidence=1.5,
        data_quality=2.0,
    )
    
    assert factors.model_confidence == 1.0
    assert factors.data_quality == 1.0


def test_confidence_factors_clips_values_below_zero():
    """ConfidenceFactors clips values below 0.0."""
    factors = ConfidenceFactors(
        model_confidence=-0.5,
        data_quality=-1.0,
    )
    
    assert factors.model_confidence == 0.0
    assert factors.data_quality == 0.0


def test_confidence_factors_clips_multiple_out_of_range_values():
    """ConfidenceFactors clips multiple out-of-range values."""
    factors = ConfidenceFactors(
        model_confidence=1.5,
        data_quality=-0.3,
        sample_size=2.0,
        feature_coverage=-0.1,
    )
    
    assert factors.model_confidence == 1.0
    assert factors.data_quality == 0.0
    assert factors.sample_size == 1.0
    assert factors.feature_coverage == 0.0


@pytest.mark.parametrize(
    "value",
    [0.0, 0.25, 0.5, 0.75, 1.0],
    ids=["zero", "quarter", "half", "three_quarters", "one"],
)
def test_confidence_factors_accepts_valid_range(value: float):
    """ConfidenceFactors accepts values in valid range [0, 1]."""
    factors = ConfidenceFactors(
        model_confidence=value,
        data_quality=value,
        sample_size=value,
    )
    
    assert factors.model_confidence == value
    assert factors.data_quality == value
    assert factors.sample_size == value


# ============================================================================
# ConfidenceScore Tests
# ============================================================================


def test_confidence_score_initializes_with_required_fields():
    """ConfidenceScore initializes with required fields."""
    factors = ConfidenceFactors(model_confidence=0.8)
    score = ConfidenceScore(
        prediction="test",
        confidence=0.85,
        confidence_level=ConfidenceLevel.HIGH,
        factors=factors,
    )
    
    assert score.prediction == "test"
    assert score.confidence == 0.85
    assert score.confidence_level == ConfidenceLevel.HIGH
    assert score.factors == factors
    assert score.explanation == ""
    assert score.uncertainty == 0.0
    assert score.threshold_met is True
    assert score.metadata == {}


def test_confidence_score_stores_all_fields():
    """ConfidenceScore stores all provided fields."""
    factors = ConfidenceFactors(model_confidence=0.9)
    metadata = {"test": "value"}
    score = ConfidenceScore(
        prediction=42,
        confidence=0.92,
        confidence_level=ConfidenceLevel.VERY_HIGH,
        factors=factors,
        explanation="High confidence prediction",
        uncertainty=0.08,
        threshold_met=True,
        metadata=metadata,
    )
    
    assert score.prediction == 42
    assert score.confidence == 0.92
    assert score.confidence_level == ConfidenceLevel.VERY_HIGH
    assert score.explanation == "High confidence prediction"
    assert score.uncertainty == 0.08
    assert score.threshold_met is True
    assert score.metadata == metadata


def test_confidence_score_is_reliable_when_high():
    """ConfidenceScore.is_reliable returns True for confidence >= 0.75."""
    factors = ConfidenceFactors()
    score = ConfidenceScore(
        prediction="test",
        confidence=0.75,
        confidence_level=ConfidenceLevel.HIGH,
        factors=factors,
    )
    
    assert score.is_reliable is True


def test_confidence_score_is_not_reliable_when_low():
    """ConfidenceScore.is_reliable returns False for confidence < 0.75."""
    factors = ConfidenceFactors()
    score = ConfidenceScore(
        prediction="test",
        confidence=0.74,
        confidence_level=ConfidenceLevel.MEDIUM,
        factors=factors,
    )
    
    assert score.is_reliable is False


@pytest.mark.parametrize(
    "confidence,expected",
    [(0.74, False), (0.75, True), (0.80, True), (0.90, True), (1.0, True)],
    ids=["just_below", "exact_threshold", "above", "high", "perfect"],
)
def test_confidence_score_is_reliable_boundary(confidence: float, expected: bool):
    """ConfidenceScore.is_reliable handles boundary cases correctly."""
    factors = ConfidenceFactors()
    score = ConfidenceScore(
        prediction="test",
        confidence=confidence,
        confidence_level=ConfidenceLevel.MEDIUM,
        factors=factors,
    )
    
    assert score.is_reliable is expected


def test_confidence_score_to_dict_contains_all_fields():
    """ConfidenceScore.to_dict() includes all expected fields."""
    factors = ConfidenceFactors(
        model_confidence=0.85,
        data_quality=0.90,
        sample_size=0.80,
    )
    score = ConfidenceScore(
        prediction="scam",
        confidence=0.87,
        confidence_level=ConfidenceLevel.HIGH,
        factors=factors,
        explanation="High confidence",
        uncertainty=0.13,
        threshold_met=True,
        metadata={"test": "data"},
    )
    
    result = score.to_dict()
    
    assert result["prediction"] == "scam"
    assert result["confidence"] == 0.87
    assert result["confidence_level"] == "high"
    assert result["is_reliable"] is True
    assert result["uncertainty"] == 0.13
    assert result["threshold_met"] is True
    assert result["explanation"] == "High confidence"
    assert "factors" in result
    assert result["metadata"] == {"test": "data"}


def test_confidence_score_to_dict_rounds_values():
    """ConfidenceScore.to_dict() rounds float values to 3 decimals."""
    factors = ConfidenceFactors(model_confidence=0.8571428)
    score = ConfidenceScore(
        prediction="test",
        confidence=0.8765432,
        confidence_level=ConfidenceLevel.HIGH,
        factors=factors,
        uncertainty=0.1234567,
    )
    
    result = score.to_dict()
    
    assert result["confidence"] == 0.877
    assert result["uncertainty"] == 0.123
    assert result["factors"]["model_confidence"] == 0.857


def test_confidence_score_to_dict_includes_factor_details():
    """ConfidenceScore.to_dict() includes detailed factor breakdown."""
    factors = ConfidenceFactors(
        model_confidence=0.85,
        data_quality=0.90,
        sample_size=0.75,
        feature_coverage=0.80,
        prediction_stability=0.88,
        domain_match=0.92,
    )
    score = ConfidenceScore(
        prediction="test",
        confidence=0.85,
        confidence_level=ConfidenceLevel.HIGH,
        factors=factors,
    )
    
    result = score.to_dict()
    factor_dict = result["factors"]
    
    assert factor_dict["model_confidence"] == 0.85
    assert factor_dict["data_quality"] == 0.90
    assert factor_dict["sample_size"] == 0.75
    assert factor_dict["feature_coverage"] == 0.80
    assert factor_dict["prediction_stability"] == 0.88
    assert factor_dict["domain_match"] == 0.92


# ============================================================================
# ConfidenceCalculator Initialization Tests
# ============================================================================


def test_confidence_calculator_initializes_with_defaults():
    """ConfidenceCalculator initializes with default parameters."""
    calc = ConfidenceCalculator()
    
    assert calc.calibration is True
    assert calc.temperature == 1.5
    assert len(calc.weights) == 6
    # Check weights sum to 1.0
    assert abs(sum(calc.weights.values()) - 1.0) < 1e-6


def test_confidence_calculator_accepts_custom_weights():
    """ConfidenceCalculator accepts custom weights."""
    custom_weights = {
        "model_confidence": 0.5,
        "data_quality": 0.3,
        "sample_size": 0.1,
        "feature_coverage": 0.05,
        "prediction_stability": 0.03,
        "domain_match": 0.02,
    }
    calc = ConfidenceCalculator(weights=custom_weights)
    
    # Weights should be normalized to sum to 1.0
    assert abs(sum(calc.weights.values()) - 1.0) < 1e-6


def test_confidence_calculator_normalizes_weights():
    """ConfidenceCalculator normalizes weights to sum to 1.0."""
    unnormalized_weights = {
        "model_confidence": 40,
        "data_quality": 20,
        "sample_size": 10,
        "feature_coverage": 15,
        "prediction_stability": 10,
        "domain_match": 5,
    }
    calc = ConfidenceCalculator(weights=unnormalized_weights)
    
    # Weights should sum to 1.0 after normalization
    assert abs(sum(calc.weights.values()) - 1.0) < 1e-6
    # Proportions should be preserved
    assert abs(calc.weights["model_confidence"] - 0.4) < 1e-6


def test_confidence_calculator_disables_calibration():
    """ConfidenceCalculator can disable calibration."""
    calc = ConfidenceCalculator(calibration=False)
    
    assert calc.calibration is False


# ============================================================================
# ConfidenceCalculator.calculate() Tests
# ============================================================================


def test_calculate_returns_confidence_score():
    """ConfidenceCalculator.calculate() returns ConfidenceScore."""
    calc = ConfidenceCalculator()
    factors = ConfidenceFactors(model_confidence=0.8)
    
    result = calc.calculate(
        prediction="test",
        factors=factors,
    )
    
    assert isinstance(result, ConfidenceScore)
    assert result.prediction == "test"


def test_calculate_with_all_perfect_factors():
    """ConfidenceCalculator.calculate() with all perfect factors."""
    calc = ConfidenceCalculator(calibration=False)
    factors = ConfidenceFactors(
        model_confidence=1.0,
        data_quality=1.0,
        sample_size=1.0,
        feature_coverage=1.0,
        prediction_stability=1.0,
        domain_match=1.0,
    )
    
    result = calc.calculate(prediction="test", factors=factors)
    
    # Should be near 1.0 without calibration
    assert result.confidence > 0.95


def test_calculate_with_all_zero_factors():
    """ConfidenceCalculator.calculate() with all zero factors."""
    calc = ConfidenceCalculator(calibration=False)
    factors = ConfidenceFactors(
        model_confidence=0.0,
        data_quality=0.0,
        sample_size=0.0,
        feature_coverage=0.0,
        prediction_stability=0.0,
        domain_match=0.0,
    )
    
    result = calc.calculate(prediction="test", factors=factors)
    
    assert result.confidence == 0.0


def test_calculate_weighted_average():
    """ConfidenceCalculator.calculate() computes weighted average correctly."""
    # Use known weights for easy calculation
    weights = {
        "model_confidence": 0.5,
        "data_quality": 0.5,
        "sample_size": 0.0,
        "feature_coverage": 0.0,
        "prediction_stability": 0.0,
        "domain_match": 0.0,
    }
    calc = ConfidenceCalculator(weights=weights, calibration=False)
    factors = ConfidenceFactors(
        model_confidence=0.8,
        data_quality=0.6,
    )
    
    result = calc.calculate(prediction="test", factors=factors)
    
    # 0.5 * 0.8 + 0.5 * 0.6 = 0.7
    assert abs(result.confidence - 0.7) < 1e-6


def test_calculate_sets_confidence_level():
    """ConfidenceCalculator.calculate() sets appropriate confidence level."""
    calc = ConfidenceCalculator(calibration=False)
    
    # Test VERY_HIGH (>= 0.90)
    factors_vh = ConfidenceFactors(model_confidence=0.95, data_quality=0.95)
    result_vh = calc.calculate(prediction="test", factors=factors_vh)
    assert result_vh.confidence_level in [ConfidenceLevel.VERY_HIGH, ConfidenceLevel.HIGH]
    
    # Test MEDIUM (0.50-0.75)
    factors_med = ConfidenceFactors(model_confidence=0.6, data_quality=0.6)
    result_med = calc.calculate(prediction="test", factors=factors_med)
    assert result_med.confidence_level in [ConfidenceLevel.MEDIUM, ConfidenceLevel.HIGH]


def test_calculate_sets_uncertainty():
    """ConfidenceCalculator.calculate() sets uncertainty = 1 - confidence."""
    calc = ConfidenceCalculator(calibration=False)
    factors = ConfidenceFactors(model_confidence=0.7, data_quality=0.8)
    
    result = calc.calculate(prediction="test", factors=factors)
    
    assert abs(result.uncertainty - (1.0 - result.confidence)) < 1e-6


def test_calculate_generates_explanation():
    """ConfidenceCalculator.calculate() generates non-empty explanation."""
    calc = ConfidenceCalculator()
    factors = ConfidenceFactors(model_confidence=0.8)
    
    result = calc.calculate(prediction="test", factors=factors)
    
    assert len(result.explanation) > 0
    assert isinstance(result.explanation, str)


def test_calculate_checks_threshold():
    """ConfidenceCalculator.calculate() checks threshold correctly."""
    calc = ConfidenceCalculator(calibration=False)
    factors = ConfidenceFactors(model_confidence=0.6, data_quality=0.6)
    
    # Below threshold
    result_below = calc.calculate(prediction="test", factors=factors, threshold=0.8)
    assert result_below.threshold_met is False
    
    # Above threshold
    result_above = calc.calculate(prediction="test", factors=factors, threshold=0.5)
    assert result_above.threshold_met is True


def test_calculate_stores_metadata():
    """ConfidenceCalculator.calculate() stores metadata."""
    calc = ConfidenceCalculator()
    factors = ConfidenceFactors(model_confidence=0.8)
    
    result = calc.calculate(
        prediction="test",
        factors=factors,
        prediction_type=PredictionType.REGRESSION,
        threshold=0.7,
    )
    
    assert result.metadata["prediction_type"] == "regression"
    assert result.metadata["threshold"] == 0.7
    assert result.metadata["calibrated"] is True


@pytest.mark.parametrize(
    "pred_type",
    [PredictionType.CLASSIFICATION, PredictionType.REGRESSION, 
     PredictionType.RANKING, PredictionType.DETECTION],
    ids=["classification", "regression", "ranking", "detection"],
)
def test_calculate_handles_all_prediction_types(pred_type: PredictionType):
    """ConfidenceCalculator.calculate() handles all prediction types."""
    calc = ConfidenceCalculator()
    factors = ConfidenceFactors(model_confidence=0.8)
    
    result = calc.calculate(
        prediction="test",
        factors=factors,
        prediction_type=pred_type,
    )
    
    assert result.metadata["prediction_type"] == pred_type.value


# ============================================================================
# ConfidenceCalculator Calibration Tests
# ============================================================================


def test_calibration_reduces_overconfidence():
    """Calibration should reduce overconfident predictions."""
    calc_no_cal = ConfidenceCalculator(calibration=False)
    calc_with_cal = ConfidenceCalculator(calibration=True)
    
    # High confidence factors
    factors = ConfidenceFactors(
        model_confidence=0.95,
        data_quality=0.95,
        sample_size=0.95,
        feature_coverage=0.95,
        prediction_stability=0.95,
        domain_match=0.95,
    )
    
    result_no_cal = calc_no_cal.calculate(prediction="test", factors=factors)
    result_with_cal = calc_with_cal.calculate(prediction="test", factors=factors)
    
    # Calibrated confidence should be lower (more conservative)
    assert result_with_cal.confidence < result_no_cal.confidence


def test_calibration_for_regression_different_from_classification():
    """Calibration behaves differently for regression vs classification."""
    calc = ConfidenceCalculator(calibration=True)
    factors = ConfidenceFactors(model_confidence=0.8, data_quality=0.8)
    
    result_class = calc.calculate(
        prediction="test",
        factors=factors,
        prediction_type=PredictionType.CLASSIFICATION,
    )
    result_regr = calc.calculate(
        prediction=42.0,
        factors=factors,
        prediction_type=PredictionType.REGRESSION,
    )
    
    # Different calibration methods should produce different results
    assert result_class.confidence != result_regr.confidence


# ============================================================================
# BatchConfidenceScorer Tests
# ============================================================================


def test_batch_scorer_initializes_with_default_calculator():
    """BatchConfidenceScorer initializes with default calculator."""
    scorer = BatchConfidenceScorer()
    
    assert scorer.calculator is not None
    assert isinstance(scorer.calculator, ConfidenceCalculator)


def test_batch_scorer_accepts_custom_calculator():
    """BatchConfidenceScorer accepts custom calculator."""
    custom_calc = ConfidenceCalculator(calibration=False)
    scorer = BatchConfidenceScorer(calculator=custom_calc)
    
    assert scorer.calculator is custom_calc


def test_score_batch_returns_list_of_scores():
    """BatchConfidenceScorer.score_batch() returns list of ConfidenceScore."""
    scorer = BatchConfidenceScorer()
    predictions = ["pred1", "pred2", "pred3"]
    factors_list = [
        ConfidenceFactors(model_confidence=0.8),
        ConfidenceFactors(model_confidence=0.7),
        ConfidenceFactors(model_confidence=0.9),
    ]
    
    results = scorer.score_batch(predictions, factors_list)
    
    assert len(results) == 3
    assert all(isinstance(r, ConfidenceScore) for r in results)


def test_score_batch_raises_on_length_mismatch():
    """BatchConfidenceScorer.score_batch() raises on length mismatch."""
    scorer = BatchConfidenceScorer()
    predictions = ["pred1", "pred2"]
    factors_list = [ConfidenceFactors()]
    
    with pytest.raises(ValueError, match="must have same length"):
        scorer.score_batch(predictions, factors_list)


def test_score_batch_empty_lists():
    """BatchConfidenceScorer.score_batch() handles empty lists."""
    scorer = BatchConfidenceScorer()
    
    results = scorer.score_batch([], [])
    
    assert results == []


def test_score_batch_preserves_order():
    """BatchConfidenceScorer.score_batch() preserves prediction order."""
    scorer = BatchConfidenceScorer()
    predictions = ["first", "second", "third"]
    factors_list = [
        ConfidenceFactors(model_confidence=0.7),
        ConfidenceFactors(model_confidence=0.8),
        ConfidenceFactors(model_confidence=0.9),
    ]
    
    results = scorer.score_batch(predictions, factors_list)
    
    assert results[0].prediction == "first"
    assert results[1].prediction == "second"
    assert results[2].prediction == "third"


def test_get_statistics_empty_scores():
    """BatchConfidenceScorer.get_statistics() handles empty scores."""
    scorer = BatchConfidenceScorer()
    
    stats = scorer.get_statistics([])
    
    assert stats == {}


def test_get_statistics_returns_complete_info():
    """BatchConfidenceScorer.get_statistics() returns complete statistics."""
    scorer = BatchConfidenceScorer()
    predictions = ["p1", "p2", "p3"]
    factors_list = [
        ConfidenceFactors(model_confidence=0.8),
        ConfidenceFactors(model_confidence=0.6),
        ConfidenceFactors(model_confidence=0.9),
    ]
    
    scores = scorer.score_batch(predictions, factors_list)
    stats = scorer.get_statistics(scores)
    
    assert "total_predictions" in stats
    assert "confidence" in stats
    assert "uncertainty" in stats
    assert "reliability" in stats
    assert "level_distribution" in stats


def test_get_statistics_confidence_metrics():
    """BatchConfidenceScorer.get_statistics() calculates confidence metrics."""
    scorer = BatchConfidenceScorer()
    predictions = ["p1", "p2"]
    factors_list = [
        ConfidenceFactors(model_confidence=0.8),
        ConfidenceFactors(model_confidence=0.6),
    ]
    
    scores = scorer.score_batch(predictions, factors_list)
    stats = scorer.get_statistics(scores)
    
    assert "mean" in stats["confidence"]
    assert "min" in stats["confidence"]
    assert "max" in stats["confidence"]
    assert "median" in stats["confidence"]


def test_get_statistics_reliability_count():
    """BatchConfidenceScorer.get_statistics() counts reliable predictions."""
    calc = ConfidenceCalculator(calibration=False)
    scorer = BatchConfidenceScorer(calculator=calc)
    
    # Create mix of reliable and unreliable
    factors_list = [
        ConfidenceFactors(model_confidence=0.9),  # Reliable
        ConfidenceFactors(model_confidence=0.5),  # Unreliable
        ConfidenceFactors(model_confidence=0.8),  # Reliable
    ]
    predictions = ["p1", "p2", "p3"]
    
    scores = scorer.score_batch(predictions, factors_list)
    stats = scorer.get_statistics(scores)
    
    assert "reliable_count" in stats["reliability"]
    assert "reliable_percent" in stats["reliability"]


# ============================================================================
# Helper Function Tests
# ============================================================================


def test_create_confidence_factors_from_dict_with_all_fields():
    """create_confidence_factors_from_dict() creates factors from complete dict."""
    data = {
        "model_confidence": 0.85,
        "data_quality": 0.90,
        "sample_size": 0.75,
        "feature_coverage": 0.80,
        "prediction_stability": 0.88,
        "domain_match": 0.92,
    }
    
    factors = create_confidence_factors_from_dict(data)
    
    assert factors.model_confidence == 0.85
    assert factors.data_quality == 0.90
    assert factors.sample_size == 0.75
    assert factors.feature_coverage == 0.80
    assert factors.prediction_stability == 0.88
    assert factors.domain_match == 0.92


def test_create_confidence_factors_from_dict_with_partial_fields():
    """create_confidence_factors_from_dict() uses defaults for missing fields."""
    data = {
        "model_confidence": 0.85,
        "data_quality": 0.90,
    }
    
    factors = create_confidence_factors_from_dict(data)
    
    assert factors.model_confidence == 0.85
    assert factors.data_quality == 0.90
    assert factors.sample_size == 1.0  # Default
    assert factors.feature_coverage == 1.0  # Default
    assert factors.prediction_stability == 1.0  # Default
    assert factors.domain_match == 1.0  # Default


def test_create_confidence_factors_from_empty_dict():
    """create_confidence_factors_from_dict() handles empty dict."""
    factors = create_confidence_factors_from_dict({})
    
    assert factors.model_confidence == 0.0  # Default
    assert factors.data_quality == 1.0  # Default


# ============================================================================
# Integration Tests
# ============================================================================


def test_end_to_end_high_confidence_prediction():
    """End-to-end test: high confidence prediction."""
    calc = ConfidenceCalculator(calibration=True)
    factors = ConfidenceFactors(
        model_confidence=0.95,
        data_quality=0.98,
        sample_size=0.92,
        feature_coverage=0.94,
        prediction_stability=0.96,
        domain_match=0.97,
    )
    
    result = calc.calculate(
        prediction="Not a scam",
        factors=factors,
        prediction_type=PredictionType.DETECTION,
        threshold=0.75,
    )
    
    assert result.prediction == "Not a scam"
    assert result.confidence > 0.75
    assert result.is_reliable is True
    assert result.threshold_met is True
    assert result.confidence_level in [ConfidenceLevel.HIGH, ConfidenceLevel.VERY_HIGH]


def test_end_to_end_low_confidence_prediction():
    """End-to-end test: low confidence prediction."""
    calc = ConfidenceCalculator(calibration=True)
    factors = ConfidenceFactors(
        model_confidence=0.45,
        data_quality=0.50,
        sample_size=0.40,
        feature_coverage=0.48,
        prediction_stability=0.42,
        domain_match=0.46,
    )
    
    result = calc.calculate(
        prediction="Uncertain",
        factors=factors,
        prediction_type=PredictionType.CLASSIFICATION,
        threshold=0.75,
    )
    
    assert result.prediction == "Uncertain"
    assert result.confidence < 0.75
    assert result.is_reliable is False
    assert result.threshold_met is False
    assert result.confidence_level in [ConfidenceLevel.LOW, ConfidenceLevel.MEDIUM, ConfidenceLevel.VERY_LOW]


def test_batch_workflow_with_statistics():
    """End-to-end test: batch scoring with statistics."""
    calc = ConfidenceCalculator(calibration=False)
    scorer = BatchConfidenceScorer(calculator=calc)
    
    predictions = ["pred1", "pred2", "pred3", "pred4"]
    factors_list = [
        ConfidenceFactors(model_confidence=0.9),
        ConfidenceFactors(model_confidence=0.7),
        ConfidenceFactors(model_confidence=0.5),
        ConfidenceFactors(model_confidence=0.3),
    ]
    
    scores = scorer.score_batch(predictions, factors_list)
    stats = scorer.get_statistics(scores)
    
    assert stats["total_predictions"] == 4
    assert 0.0 <= stats["confidence"]["mean"] <= 1.0
    assert 0.0 <= stats["confidence"]["min"] <= stats["confidence"]["max"] <= 1.0
