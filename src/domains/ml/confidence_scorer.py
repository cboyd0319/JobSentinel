"""
Confidence Scoring Framework

Provides confidence scores for all ML predictions with:
- Multi-factor confidence calculation
- Uncertainty quantification
- Prediction explainability
- Calibrated probability estimates
- Confidence thresholds for decision-making

References:
- "Calibration of Neural Networks" (Guo et al., 2017) | https://arxiv.org/abs/1706.04599
- "Confident Learning" (Northcutt et al., 2021) | https://arxiv.org/abs/1911.00068
- Scikit-learn Documentation | https://scikit-learn.org/stable/modules/calibration.html
- "Uncertainty in Deep Learning" (Gal, 2016) | http://mlg.eng.cam.ac.uk/yarin/thesis
"""

import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ============================================================================
# Enumerations
# ============================================================================


class ConfidenceLevel(str, Enum):
    """Confidence level categories."""

    VERY_HIGH = "very_high"  # 90-100%
    HIGH = "high"  # 75-90%
    MEDIUM = "medium"  # 50-75%
    LOW = "low"  # 25-50%
    VERY_LOW = "very_low"  # 0-25%


class PredictionType(str, Enum):
    """Type of prediction."""

    CLASSIFICATION = "classification"  # Binary or multi-class
    REGRESSION = "regression"  # Continuous value
    RANKING = "ranking"  # Ordered list
    DETECTION = "detection"  # Anomaly/scam detection


# ============================================================================
# Data Models
# ============================================================================


@dataclass
class ConfidenceFactors:
    """Factors contributing to confidence score."""

    model_confidence: float = 0.0  # Model's internal confidence
    data_quality: float = 1.0  # Input data quality (0-1)
    sample_size: float = 1.0  # Training sample size factor (0-1)
    feature_coverage: float = 1.0  # Feature completeness (0-1)
    prediction_stability: float = 1.0  # Consistency across runs (0-1)
    domain_match: float = 1.0  # Domain relevance (0-1)

    def __post_init__(self):
        """Validate all factors are in range [0, 1]."""
        for field_name, value in self.__dict__.items():
            if not 0 <= value <= 1:
                logger.warning(
                    f"Confidence factor {field_name} = {value} out of range [0, 1], "
                    f"clipping"
                )
                setattr(self, field_name, max(0, min(1, value)))


@dataclass
class ConfidenceScore:
    """Confidence score with explanation."""

    prediction: Any  # The actual prediction
    confidence: float  # Overall confidence (0-1)
    confidence_level: ConfidenceLevel  # Categorical level
    factors: ConfidenceFactors  # Contributing factors
    explanation: str = ""  # Human-readable explanation
    uncertainty: float = 0.0  # Uncertainty estimate (0-1)
    threshold_met: bool = True  # Whether confidence meets threshold
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_reliable(self) -> bool:
        """Check if prediction is reliable (confidence >= 0.75)."""
        return self.confidence >= 0.75

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "prediction": self.prediction,
            "confidence": round(self.confidence, 3),
            "confidence_level": self.confidence_level.value,
            "is_reliable": self.is_reliable,
            "uncertainty": round(self.uncertainty, 3),
            "threshold_met": self.threshold_met,
            "explanation": self.explanation,
            "factors": {
                "model_confidence": round(self.factors.model_confidence, 3),
                "data_quality": round(self.factors.data_quality, 3),
                "sample_size": round(self.factors.sample_size, 3),
                "feature_coverage": round(self.factors.feature_coverage, 3),
                "prediction_stability": round(self.factors.prediction_stability, 3),
                "domain_match": round(self.factors.domain_match, 3),
            },
            "metadata": self.metadata,
        }


# ============================================================================
# Confidence Calculator
# ============================================================================


class ConfidenceCalculator:
    """
    Calculate confidence scores for ML predictions.
    
    Uses multiple factors to compute calibrated confidence scores:
    - Model's internal confidence (from softmax, predict_proba, etc.)
    - Data quality (completeness, validity)
    - Sample size (training data quantity)
    - Feature coverage (feature availability)
    - Prediction stability (consistency)
    - Domain match (relevance to training domain)
    """

    def __init__(
        self,
        weights: dict[str, float] | None = None,
        calibration: bool = True,
    ):
        """
        Initialize confidence calculator.
        
        Args:
            weights: Custom weights for factors (default: equal weights)
            calibration: Apply temperature scaling calibration
        """
        self.weights = weights or {
            "model_confidence": 0.40,
            "data_quality": 0.20,
            "sample_size": 0.10,
            "feature_coverage": 0.15,
            "prediction_stability": 0.10,
            "domain_match": 0.05,
        }

        # Normalize weights
        total_weight = sum(self.weights.values())
        self.weights = {k: v / total_weight for k, v in self.weights.items()}

        self.calibration = calibration
        self.temperature = 1.5  # Temperature for calibration

    def calculate(
        self,
        prediction: Any,
        factors: ConfidenceFactors,
        prediction_type: PredictionType = PredictionType.CLASSIFICATION,
        threshold: float = 0.5,
    ) -> ConfidenceScore:
        """
        Calculate confidence score for a prediction.
        
        Args:
            prediction: The prediction value
            factors: Confidence factors
            prediction_type: Type of prediction
            threshold: Minimum confidence threshold
            
        Returns:
            ConfidenceScore with overall confidence and explanation
        """
        # Calculate weighted confidence
        confidence = (
            self.weights["model_confidence"] * factors.model_confidence
            + self.weights["data_quality"] * factors.data_quality
            + self.weights["sample_size"] * factors.sample_size
            + self.weights["feature_coverage"] * factors.feature_coverage
            + self.weights["prediction_stability"] * factors.prediction_stability
            + self.weights["domain_match"] * factors.domain_match
        )

        # Apply calibration if enabled
        if self.calibration:
            confidence = self._calibrate(confidence, prediction_type)

        # Calculate uncertainty
        uncertainty = 1.0 - confidence

        # Determine confidence level
        confidence_level = self._get_confidence_level(confidence)

        # Generate explanation
        explanation = self._generate_explanation(confidence, factors)

        # Check threshold
        threshold_met = confidence >= threshold

        return ConfidenceScore(
            prediction=prediction,
            confidence=confidence,
            confidence_level=confidence_level,
            factors=factors,
            explanation=explanation,
            uncertainty=uncertainty,
            threshold_met=threshold_met,
            metadata={
                "prediction_type": prediction_type.value,
                "threshold": threshold,
                "calibrated": self.calibration,
            },
        )

    def _calibrate(
        self,
        confidence: float,
        prediction_type: PredictionType,
    ) -> float:
        """
        Apply temperature scaling calibration.
        
        Helps correct overconfident predictions by scaling with temperature.
        Based on "Calibration of Neural Networks" (Guo et al., 2017).
        """
        if prediction_type == PredictionType.CLASSIFICATION:
            # Apply temperature scaling
            # Convert to logit, scale, convert back
            if confidence > 0.99:
                confidence = 0.99  # Avoid log(0)
            elif confidence < 0.01:
                confidence = 0.01

            logit = math.log(confidence / (1 - confidence))
            scaled_logit = logit / self.temperature
            calibrated = 1 / (1 + math.exp(-scaled_logit))

            return calibrated
        else:
            # For regression, use simple scaling
            return confidence ** (1 / self.temperature)

    @staticmethod
    def _get_confidence_level(confidence: float) -> ConfidenceLevel:
        """Categorize confidence into levels."""
        if confidence >= 0.90:
            return ConfidenceLevel.VERY_HIGH
        elif confidence >= 0.75:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.50:
            return ConfidenceLevel.MEDIUM
        elif confidence >= 0.25:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW

    @staticmethod
    def _generate_explanation(
        confidence: float,
        factors: ConfidenceFactors,
    ) -> str:
        """Generate human-readable explanation."""
        level = ConfidenceCalculator._get_confidence_level(confidence)

        # Find weakest factor
        factor_values = {
            "model": factors.model_confidence,
            "data quality": factors.data_quality,
            "sample size": factors.sample_size,
            "feature coverage": factors.feature_coverage,
            "stability": factors.prediction_stability,
            "domain match": factors.domain_match,
        }

        weakest = min(factor_values, key=factor_values.get)
        weakest_value = factor_values[weakest]

        if level == ConfidenceLevel.VERY_HIGH:
            return f"Very high confidence ({confidence:.1%}). All factors strong."
        elif level == ConfidenceLevel.HIGH:
            return (
                f"High confidence ({confidence:.1%}). "
                f"Reliable for most use cases."
            )
        elif level == ConfidenceLevel.MEDIUM:
            return (
                f"Medium confidence ({confidence:.1%}). "
                f"Consider limitations in {weakest} ({weakest_value:.1%})."
            )
        elif level == ConfidenceLevel.LOW:
            return (
                f"Low confidence ({confidence:.1%}). "
                f"Weak {weakest} ({weakest_value:.1%}). Use with caution."
            )
        else:
            return (
                f"Very low confidence ({confidence:.1%}). "
                f"Not reliable. Manual review recommended."
            )


# ============================================================================
# Batch Confidence Scoring
# ============================================================================


class BatchConfidenceScorer:
    """Score confidence for multiple predictions."""

    def __init__(self, calculator: ConfidenceCalculator | None = None):
        """Initialize batch scorer."""
        self.calculator = calculator or ConfidenceCalculator()

    def score_batch(
        self,
        predictions: list[Any],
        factors_list: list[ConfidenceFactors],
        prediction_type: PredictionType = PredictionType.CLASSIFICATION,
        threshold: float = 0.5,
    ) -> list[ConfidenceScore]:
        """
        Score confidence for multiple predictions.
        
        Args:
            predictions: List of predictions
            factors_list: List of confidence factors (one per prediction)
            prediction_type: Type of predictions
            threshold: Confidence threshold
            
        Returns:
            List of ConfidenceScore objects
        """
        if len(predictions) != len(factors_list):
            raise ValueError(
                f"Predictions ({len(predictions)}) and factors ({len(factors_list)}) "
                f"must have same length"
            )

        scores = []
        for pred, factors in zip(predictions, factors_list, strict=False):
            score = self.calculator.calculate(
                prediction=pred,
                factors=factors,
                prediction_type=prediction_type,
                threshold=threshold,
            )
            scores.append(score)

        return scores

    def get_statistics(self, scores: list[ConfidenceScore]) -> dict[str, Any]:
        """Calculate statistics for a batch of scores."""
        if not scores:
            return {}

        confidences = [s.confidence for s in scores]
        uncertainties = [s.uncertainty for s in scores]

        level_counts = {}
        for level in ConfidenceLevel:
            level_counts[level.value] = sum(
                1 for s in scores if s.confidence_level == level
            )

        return {
            "total_predictions": len(scores),
            "confidence": {
                "mean": sum(confidences) / len(confidences),
                "min": min(confidences),
                "max": max(confidences),
                "median": sorted(confidences)[len(confidences) // 2],
            },
            "uncertainty": {
                "mean": sum(uncertainties) / len(uncertainties),
                "min": min(uncertainties),
                "max": max(uncertainties),
            },
            "reliability": {
                "reliable_count": sum(1 for s in scores if s.is_reliable),
                "reliable_percent": sum(1 for s in scores if s.is_reliable)
                / len(scores)
                * 100,
            },
            "level_distribution": level_counts,
        }


# ============================================================================
# Helper Functions
# ============================================================================


def create_confidence_factors_from_dict(data: dict[str, float]) -> ConfidenceFactors:
    """Create ConfidenceFactors from dictionary."""
    return ConfidenceFactors(
        model_confidence=data.get("model_confidence", 0.0),
        data_quality=data.get("data_quality", 1.0),
        sample_size=data.get("sample_size", 1.0),
        feature_coverage=data.get("feature_coverage", 1.0),
        prediction_stability=data.get("prediction_stability", 1.0),
        domain_match=data.get("domain_match", 1.0),
    )


# ============================================================================
# Example Usage
# ============================================================================


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)

    # Initialize calculator
    calculator = ConfidenceCalculator(calibration=True)

    # Example 1: High confidence prediction
    print("\n=== Example 1: High Confidence Prediction ===")
    factors_high = ConfidenceFactors(
        model_confidence=0.95,
        data_quality=0.98,
        sample_size=0.95,
        feature_coverage=0.90,
        prediction_stability=0.92,
        domain_match=0.98,
    )

    score_high = calculator.calculate(
        prediction="Not a scam",
        factors=factors_high,
        prediction_type=PredictionType.CLASSIFICATION,
        threshold=0.75,
    )

    print(f"Prediction: {score_high.prediction}")
    print(f"Confidence: {score_high.confidence:.1%}")
    print(f"Level: {score_high.confidence_level.value}")
    print(f"Reliable: {score_high.is_reliable}")
    print(f"Explanation: {score_high.explanation}")

    # Example 2: Low confidence prediction
    print("\n=== Example 2: Low Confidence Prediction ===")
    factors_low = ConfidenceFactors(
        model_confidence=0.55,
        data_quality=0.60,
        sample_size=0.40,
        feature_coverage=0.50,
        prediction_stability=0.45,
        domain_match=0.55,
    )

    score_low = calculator.calculate(
        prediction="Possible scam",
        factors=factors_low,
        prediction_type=PredictionType.CLASSIFICATION,
        threshold=0.75,
    )

    print(f"Prediction: {score_low.prediction}")
    print(f"Confidence: {score_low.confidence:.1%}")
    print(f"Level: {score_low.confidence_level.value}")
    print(f"Reliable: {score_low.is_reliable}")
    print(f"Threshold met: {score_low.threshold_met}")
    print(f"Explanation: {score_low.explanation}")

    # Example 3: Batch scoring
    print("\n=== Example 3: Batch Scoring ===")
    predictions = ["Not scam", "Scam", "Not scam", "Unclear"]
    factors_list = [
        factors_high,
        ConfidenceFactors(model_confidence=0.88, data_quality=0.85),
        ConfidenceFactors(model_confidence=0.75, data_quality=0.70),
        factors_low,
    ]

    batch_scorer = BatchConfidenceScorer(calculator)
    scores = batch_scorer.score_batch(
        predictions,
        factors_list,
        prediction_type=PredictionType.CLASSIFICATION,
        threshold=0.75,
    )

    for i, score in enumerate(scores):
        print(
            f"{i+1}. {score.prediction}: {score.confidence:.1%} "
            f"({score.confidence_level.value})"
        )

    # Get batch statistics
    stats = batch_scorer.get_statistics(scores)
    import json

    print("\nBatch Statistics:")
    print(json.dumps(stats, indent=2))
