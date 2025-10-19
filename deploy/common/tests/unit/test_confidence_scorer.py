"""Comprehensive tests for domains.ml.confidence_scorer module.

Tests the ML confidence scoring framework including:
- ConfidenceFactors validation and clipping
- ConfidenceScore properties and serialization
- ConfidenceCalculator with calibration
- BatchConfidenceScorer for multiple predictions
- Helper functions
- All confidence levels and prediction types
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


class TestConfidenceLevel:
    """Test ConfidenceLevel enumeration."""

    def test_confidence_level_values_defined(self):
        """All confidence level values should be defined."""
        # Assert
        assert ConfidenceLevel.VERY_HIGH == "very_high"
        assert ConfidenceLevel.HIGH == "high"
        assert ConfidenceLevel.MEDIUM == "medium"
        assert ConfidenceLevel.LOW == "low"
        assert ConfidenceLevel.VERY_LOW == "very_low"

    def test_confidence_level_is_string_enum(self):
        """ConfidenceLevel should be a string enum."""
        # Assert
        assert isinstance(ConfidenceLevel.HIGH.value, str)


class TestPredictionType:
    """Test PredictionType enumeration."""

    def test_prediction_type_values_defined(self):
        """All prediction type values should be defined."""
        # Assert
        assert PredictionType.CLASSIFICATION == "classification"
        assert PredictionType.REGRESSION == "regression"
        assert PredictionType.RANKING == "ranking"
        assert PredictionType.DETECTION == "detection"


class TestConfidenceFactors:
    """Test ConfidenceFactors dataclass."""

    def test_confidence_factors_default_values(self):
        """Default ConfidenceFactors should have correct values."""
        # Act
        factors = ConfidenceFactors()
        # Assert
        assert factors.model_confidence == 0.0
        assert factors.data_quality == 1.0
        assert factors.sample_size == 1.0
        assert factors.feature_coverage == 1.0
        assert factors.prediction_stability == 1.0
        assert factors.domain_match == 1.0

    @pytest.mark.parametrize(
        "field,value",
        [
            ("model_confidence", 0.95),
            ("data_quality", 0.85),
            ("sample_size", 0.75),
            ("feature_coverage", 0.65),
            ("prediction_stability", 0.55),
            ("domain_match", 0.45),
        ],
        ids=["model", "data_quality", "sample", "feature", "stability", "domain"],
    )
    def test_confidence_factors_custom_values_accepted(self, field, value):
        """Custom values in valid range should be accepted."""
        # Act
        factors = ConfidenceFactors(**{field: value})
        # Assert
        assert getattr(factors, field) == value

    @pytest.mark.parametrize(
        "field,invalid_value,expected",
        [
            ("model_confidence", 1.5, 1.0),
            ("model_confidence", -0.5, 0.0),
            ("data_quality", 2.0, 1.0),
            ("sample_size", -1.0, 0.0),
        ],
        ids=["over_max", "under_min", "data_over", "sample_under"],
    )
    def test_confidence_factors_out_of_range_clipped(self, field, invalid_value, expected):
        """Values outside [0, 1] should be clipped."""
        # Act
        factors = ConfidenceFactors(**{field: invalid_value})
        # Assert
        assert getattr(factors, field) == expected


class TestConfidenceScore:
    """Test ConfidenceScore dataclass."""

    @pytest.fixture
    def sample_factors(self):
        """Sample confidence factors for testing."""
        return ConfidenceFactors(
            model_confidence=0.9,
            data_quality=0.85,
            sample_size=0.8,
            feature_coverage=0.75,
            prediction_stability=0.7,
            domain_match=0.95,
        )

    def test_confidence_score_is_reliable_high_confidence(self, sample_factors):
        """Confidence >= 0.75 should be reliable."""
        # Arrange
        score = ConfidenceScore(
            prediction="test",
            confidence=0.85,
            confidence_level=ConfidenceLevel.HIGH,
            factors=sample_factors,
        )
        # Act & Assert
        assert score.is_reliable is True

    def test_confidence_score_is_reliable_low_confidence(self, sample_factors):
        """Confidence < 0.75 should not be reliable."""
        # Arrange
        score = ConfidenceScore(
            prediction="test",
            confidence=0.65,
            confidence_level=ConfidenceLevel.MEDIUM,
            factors=sample_factors,
        )
        # Act & Assert
        assert score.is_reliable is False

    def test_confidence_score_to_dict_contains_all_fields(self, sample_factors):
        """to_dict should contain all expected fields."""
        # Arrange
        score = ConfidenceScore(
            prediction="test_pred",
            confidence=0.82,
            confidence_level=ConfidenceLevel.HIGH,
            factors=sample_factors,
            explanation="Test explanation",
            uncertainty=0.18,
            threshold_met=True,
            metadata={"test": "value"},
        )
        # Act
        result = score.to_dict()
        # Assert
        assert result["prediction"] == "test_pred"
        assert result["confidence"] == 0.82
        assert result["confidence_level"] == "high"
        assert result["is_reliable"] is True
        assert result["uncertainty"] == 0.18
        assert result["threshold_met"] is True
        assert result["explanation"] == "Test explanation"
        assert "factors" in result
        assert result["metadata"] == {"test": "value"}

    def test_confidence_score_to_dict_rounds_values(self, sample_factors):
        """to_dict should round floating point values to 3 decimals."""
        # Arrange
        score = ConfidenceScore(
            prediction="test",
            confidence=0.123456789,
            confidence_level=ConfidenceLevel.HIGH,
            factors=sample_factors,
            uncertainty=0.876543211,
        )
        # Act
        result = score.to_dict()
        # Assert
        assert result["confidence"] == 0.123
        assert result["uncertainty"] == 0.877


class TestConfidenceCalculator:
    """Test ConfidenceCalculator class."""

    @pytest.fixture
    def calculator(self):
        """Default calculator for testing."""
        return ConfidenceCalculator()

    @pytest.fixture
    def calculator_no_calibration(self):
        """Calculator without calibration."""
        return ConfidenceCalculator(calibration=False)

    @pytest.fixture
    def high_confidence_factors(self):
        """Factors representing high confidence."""
        return ConfidenceFactors(
            model_confidence=0.95,
            data_quality=0.95,
            sample_size=0.90,
            feature_coverage=0.90,
            prediction_stability=0.85,
            domain_match=0.95,
        )

    @pytest.fixture
    def low_confidence_factors(self):
        """Factors representing low confidence."""
        return ConfidenceFactors(
            model_confidence=0.40,
            data_quality=0.50,
            sample_size=0.30,
            feature_coverage=0.40,
            prediction_stability=0.35,
            domain_match=0.45,
        )

    def test_calculator_init_default_weights(self):
        """Calculator should initialize with default weights."""
        # Act
        calc = ConfidenceCalculator()
        # Assert
        assert "model_confidence" in calc.weights
        assert "data_quality" in calc.weights
        assert calc.calibration is True
        # Weights should sum to 1.0
        assert abs(sum(calc.weights.values()) - 1.0) < 0.001

    def test_calculator_init_custom_weights_normalized(self):
        """Custom weights should be normalized to sum to 1."""
        # Arrange
        custom_weights = {
            "model_confidence": 2.0,
            "data_quality": 1.0,
            "sample_size": 1.0,
            "feature_coverage": 1.0,
            "prediction_stability": 1.0,
            "domain_match": 1.0,
        }
        # Act
        calc = ConfidenceCalculator(weights=custom_weights)
        # Assert
        assert abs(sum(calc.weights.values()) - 1.0) < 0.001
        # Model confidence should have higher weight (2/7)
        assert calc.weights["model_confidence"] > calc.weights["data_quality"]

    def test_calculator_calculate_returns_confidence_score(
        self, calculator, high_confidence_factors
    ):
        """Calculate should return a ConfidenceScore object."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
        )
        # Assert
        assert isinstance(result, ConfidenceScore)
        assert result.prediction == "test"
        assert 0.0 <= result.confidence <= 1.0
        assert isinstance(result.confidence_level, ConfidenceLevel)

    def test_calculator_calculate_high_confidence_gives_high_level(
        self, calculator, high_confidence_factors
    ):
        """High confidence factors should result in high confidence level."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
        )
        # Assert
        assert result.confidence_level in [ConfidenceLevel.HIGH, ConfidenceLevel.VERY_HIGH]
        assert result.is_reliable is True

    def test_calculator_calculate_low_confidence_gives_low_level(
        self, calculator, low_confidence_factors
    ):
        """Low confidence factors should result in low confidence level."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=low_confidence_factors,
        )
        # Assert
        assert result.confidence_level in [ConfidenceLevel.LOW, ConfidenceLevel.MEDIUM]
        assert result.is_reliable is False

    def test_calculator_calculate_uncertainty_is_complement(
        self, calculator, high_confidence_factors
    ):
        """Uncertainty should be 1 - confidence."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
        )
        # Assert
        assert abs(result.confidence + result.uncertainty - 1.0) < 0.001

    def test_calculator_calculate_threshold_met_when_above(
        self, calculator, high_confidence_factors
    ):
        """threshold_met should be True when confidence >= threshold."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
            threshold=0.5,
        )
        # Assert
        assert result.threshold_met is True

    def test_calculator_calculate_threshold_not_met_when_below(
        self, calculator, low_confidence_factors
    ):
        """threshold_met should be False when confidence < threshold."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=low_confidence_factors,
            threshold=0.75,
        )
        # Assert
        assert result.threshold_met is False

    def test_calculator_calculate_includes_metadata(self, calculator, high_confidence_factors):
        """Result should include metadata about calculation."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
            prediction_type=PredictionType.CLASSIFICATION,
            threshold=0.6,
        )
        # Assert
        assert result.metadata["prediction_type"] == "classification"
        assert result.metadata["threshold"] == 0.6
        assert result.metadata["calibrated"] is True

    def test_calculator_calculate_explanation_not_empty(
        self, calculator, high_confidence_factors
    ):
        """Explanation should be generated."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
        )
        # Assert
        assert len(result.explanation) > 0
        assert isinstance(result.explanation, str)

    def test_calculator_calibration_modifies_confidence(
        self, calculator, calculator_no_calibration, high_confidence_factors
    ):
        """Calibration should modify the final confidence."""
        # Act
        result_with_calib = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
        )
        result_no_calib = calculator_no_calibration.calculate(
            prediction="test",
            factors=high_confidence_factors,
        )
        # Assert - calibrated should be different
        assert result_with_calib.confidence != result_no_calib.confidence

    @pytest.mark.parametrize(
        "prediction_type",
        [
            PredictionType.CLASSIFICATION,
            PredictionType.REGRESSION,
            PredictionType.RANKING,
            PredictionType.DETECTION,
        ],
        ids=["classification", "regression", "ranking", "detection"],
    )
    def test_calculator_handles_all_prediction_types(
        self, calculator, high_confidence_factors, prediction_type
    ):
        """Calculator should handle all prediction types."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=high_confidence_factors,
            prediction_type=prediction_type,
        )
        # Assert
        assert result.metadata["prediction_type"] == prediction_type.value

    def test_calculator_get_confidence_level_very_high(self):
        """_get_confidence_level should return VERY_HIGH for >= 0.90."""
        # Act
        level = ConfidenceCalculator._get_confidence_level(0.95)
        # Assert
        assert level == ConfidenceLevel.VERY_HIGH

    def test_calculator_get_confidence_level_high(self):
        """_get_confidence_level should return HIGH for [0.75, 0.90)."""
        # Act
        level = ConfidenceCalculator._get_confidence_level(0.80)
        # Assert
        assert level == ConfidenceLevel.HIGH

    def test_calculator_get_confidence_level_medium(self):
        """_get_confidence_level should return MEDIUM for [0.50, 0.75)."""
        # Act
        level = ConfidenceCalculator._get_confidence_level(0.60)
        # Assert
        assert level == ConfidenceLevel.MEDIUM

    def test_calculator_get_confidence_level_low(self):
        """_get_confidence_level should return LOW for [0.25, 0.50)."""
        # Act
        level = ConfidenceCalculator._get_confidence_level(0.35)
        # Assert
        assert level == ConfidenceLevel.LOW

    def test_calculator_get_confidence_level_very_low(self):
        """_get_confidence_level should return VERY_LOW for < 0.25."""
        # Act
        level = ConfidenceCalculator._get_confidence_level(0.15)
        # Assert
        assert level == ConfidenceLevel.VERY_LOW

    def test_calculator_generate_explanation_mentions_weakest_factor(
        self, calculator, low_confidence_factors
    ):
        """Explanation should mention the weakest factor for low/medium confidence."""
        # Act
        result = calculator.calculate(
            prediction="test",
            factors=low_confidence_factors,
        )
        # Assert - explanation should mention a factor name
        assert any(
            term in result.explanation.lower()
            for term in ["model", "data", "sample", "feature", "stability", "domain"]
        )


class TestBatchConfidenceScorer:
    """Test BatchConfidenceScorer class."""

    @pytest.fixture
    def batch_scorer(self):
        """Default batch scorer for testing."""
        return BatchConfidenceScorer()

    @pytest.fixture
    def sample_predictions(self):
        """Sample predictions for batch testing."""
        return ["pred1", "pred2", "pred3"]

    @pytest.fixture
    def sample_factors_list(self):
        """Sample factors list for batch testing."""
        return [
            ConfidenceFactors(model_confidence=0.9, data_quality=0.85),
            ConfidenceFactors(model_confidence=0.75, data_quality=0.70),
            ConfidenceFactors(model_confidence=0.50, data_quality=0.55),
        ]

    def test_batch_scorer_init_with_default_calculator(self):
        """Batch scorer should initialize with default calculator."""
        # Act
        scorer = BatchConfidenceScorer()
        # Assert
        assert isinstance(scorer.calculator, ConfidenceCalculator)

    def test_batch_scorer_init_with_custom_calculator(self):
        """Batch scorer should accept custom calculator."""
        # Arrange
        custom_calc = ConfidenceCalculator(calibration=False)
        # Act
        scorer = BatchConfidenceScorer(calculator=custom_calc)
        # Assert
        assert scorer.calculator is custom_calc

    def test_batch_scorer_score_batch_returns_list(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """score_batch should return a list of ConfidenceScores."""
        # Act
        result = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Assert
        assert isinstance(result, list)
        assert len(result) == len(sample_predictions)
        assert all(isinstance(score, ConfidenceScore) for score in result)

    def test_batch_scorer_score_batch_predictions_match(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """score_batch should match predictions to scores."""
        # Act
        result = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Assert
        for i, pred in enumerate(sample_predictions):
            assert result[i].prediction == pred

    def test_batch_scorer_score_batch_mismatched_lengths_raises(self, batch_scorer):
        """score_batch should raise ValueError if lengths don't match."""
        # Arrange
        predictions = ["pred1", "pred2"]
        factors = [ConfidenceFactors()]
        # Act & Assert
        with pytest.raises(ValueError, match="same length"):
            batch_scorer.score_batch(predictions, factors)

    def test_batch_scorer_score_batch_empty_lists(self, batch_scorer):
        """score_batch should handle empty lists."""
        # Act
        result = batch_scorer.score_batch([], [])
        # Assert
        assert result == []

    def test_batch_scorer_get_statistics_empty_returns_empty_dict(self, batch_scorer):
        """get_statistics should return empty dict for empty scores list."""
        # Act
        result = batch_scorer.get_statistics([])
        # Assert
        assert result == {}

    def test_batch_scorer_get_statistics_contains_expected_fields(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """get_statistics should contain all expected fields."""
        # Arrange
        scores = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Act
        stats = batch_scorer.get_statistics(scores)
        # Assert
        assert "total_predictions" in stats
        assert "confidence" in stats
        assert "uncertainty" in stats
        assert "reliability" in stats
        assert "level_distribution" in stats

    def test_batch_scorer_get_statistics_total_predictions_correct(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """get_statistics should count total predictions correctly."""
        # Arrange
        scores = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Act
        stats = batch_scorer.get_statistics(scores)
        # Assert
        assert stats["total_predictions"] == len(sample_predictions)

    def test_batch_scorer_get_statistics_confidence_stats_in_range(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """get_statistics should have confidence stats in [0, 1]."""
        # Arrange
        scores = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Act
        stats = batch_scorer.get_statistics(scores)
        # Assert
        assert 0 <= stats["confidence"]["mean"] <= 1
        assert 0 <= stats["confidence"]["min"] <= 1
        assert 0 <= stats["confidence"]["max"] <= 1
        assert stats["confidence"]["min"] <= stats["confidence"]["max"]

    def test_batch_scorer_get_statistics_uncertainty_stats_in_range(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """get_statistics should have uncertainty stats in [0, 1]."""
        # Arrange
        scores = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Act
        stats = batch_scorer.get_statistics(scores)
        # Assert
        assert 0 <= stats["uncertainty"]["mean"] <= 1
        assert 0 <= stats["uncertainty"]["min"] <= 1
        assert 0 <= stats["uncertainty"]["max"] <= 1

    def test_batch_scorer_get_statistics_reliable_percent_in_range(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """get_statistics should have reliable_percent in [0, 100]."""
        # Arrange
        scores = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Act
        stats = batch_scorer.get_statistics(scores)
        # Assert
        assert 0 <= stats["reliability"]["reliable_percent"] <= 100

    def test_batch_scorer_get_statistics_level_distribution_sums_to_total(
        self, batch_scorer, sample_predictions, sample_factors_list
    ):
        """get_statistics level distribution should sum to total predictions."""
        # Arrange
        scores = batch_scorer.score_batch(sample_predictions, sample_factors_list)
        # Act
        stats = batch_scorer.get_statistics(scores)
        # Assert
        total = sum(stats["level_distribution"].values())
        assert total == stats["total_predictions"]


class TestHelperFunctions:
    """Test helper functions."""

    def test_create_confidence_factors_from_dict_full_data(self):
        """create_confidence_factors_from_dict should create factors from complete dict."""
        # Arrange
        data = {
            "model_confidence": 0.9,
            "data_quality": 0.85,
            "sample_size": 0.80,
            "feature_coverage": 0.75,
            "prediction_stability": 0.70,
            "domain_match": 0.95,
        }
        # Act
        factors = create_confidence_factors_from_dict(data)
        # Assert
        assert factors.model_confidence == 0.9
        assert factors.data_quality == 0.85
        assert factors.sample_size == 0.80
        assert factors.feature_coverage == 0.75
        assert factors.prediction_stability == 0.70
        assert factors.domain_match == 0.95

    def test_create_confidence_factors_from_dict_partial_data_uses_defaults(self):
        """create_confidence_factors_from_dict should use defaults for missing values."""
        # Arrange
        data = {"model_confidence": 0.8}
        # Act
        factors = create_confidence_factors_from_dict(data)
        # Assert
        assert factors.model_confidence == 0.8
        assert factors.data_quality == 1.0  # Default
        assert factors.sample_size == 1.0  # Default
        assert factors.feature_coverage == 1.0  # Default
        assert factors.prediction_stability == 1.0  # Default
        assert factors.domain_match == 1.0  # Default

    def test_create_confidence_factors_from_dict_empty_uses_all_defaults(self):
        """create_confidence_factors_from_dict should use all defaults for empty dict."""
        # Arrange
        data = {}
        # Act
        factors = create_confidence_factors_from_dict(data)
        # Assert
        assert factors.model_confidence == 0.0  # Default
        assert factors.data_quality == 1.0
        assert factors.sample_size == 1.0
        assert factors.feature_coverage == 1.0
        assert factors.prediction_stability == 1.0
        assert factors.domain_match == 1.0
