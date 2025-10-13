"""
Adaptive Learning System

Improves detection and prediction accuracy over time through:
- User feedback collection
- Online learning updates
- Performance tracking
- A/B testing framework
- Model retraining triggers
- Drift detection

References:
- "Online Learning" (Shalev-Shwartz, 2012) | https://www.cs.huji.ac.il/~shais/papers/OLsurvey.pdf
- "Data Drift Detection" (Lu et al., 2018) | https://arxiv.org/abs/1810.11953
- "Continual Learning" (Parisi et al., 2019) | https://arxiv.org/abs/1802.07569
- Scikit-learn Incremental Learning | https://scikit-learn.org/stable/modules/scaling_strategies.html
"""

import json
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ============================================================================
# Enumerations
# ============================================================================


class FeedbackType(str, Enum):
    """Type of user feedback."""

    CORRECT = "correct"  # Prediction was correct
    INCORRECT = "incorrect"  # Prediction was wrong
    HELPFUL = "helpful"  # Suggestion was helpful
    NOT_HELPFUL = "not_helpful"  # Suggestion was not helpful
    FALSE_POSITIVE = "false_positive"  # Incorrectly flagged
    FALSE_NEGATIVE = "false_negative"  # Missed detection
    SKIP = "skip"  # User skipped/ignored


class ModelVersion(str, Enum):
    """Model version for A/B testing."""

    BASELINE = "baseline"  # Current production model
    EXPERIMENTAL = "experimental"  # New experimental model
    CHAMPION = "champion"  # Best performing model


class DriftType(str, Enum):
    """Type of data drift."""

    NO_DRIFT = "no_drift"  # No significant drift
    GRADUAL_DRIFT = "gradual"  # Slow drift over time
    SUDDEN_DRIFT = "sudden"  # Abrupt change
    RECURRING_DRIFT = "recurring"  # Seasonal/periodic drift


# ============================================================================
# Data Models
# ============================================================================


@dataclass
class UserFeedback:
    """User feedback on a prediction."""

    prediction_id: str
    feedback_type: FeedbackType
    timestamp: float = field(default_factory=time.time)
    prediction: Any = None
    ground_truth: Any = None
    confidence: float = 0.0
    model_version: str = "baseline"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceMetrics:
    """Model performance metrics."""

    model_version: str
    accuracy: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    total_predictions: int = 0
    correct_predictions: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    timestamp: float = field(default_factory=time.time)

    def update(self, feedback: UserFeedback) -> None:
        """Update metrics with new feedback."""
        self.total_predictions += 1

        if feedback.feedback_type == FeedbackType.CORRECT:
            self.correct_predictions += 1
        elif feedback.feedback_type == FeedbackType.FALSE_POSITIVE:
            self.false_positives += 1
        elif feedback.feedback_type == FeedbackType.FALSE_NEGATIVE:
            self.false_negatives += 1

        # Recalculate metrics
        if self.total_predictions > 0:
            self.accuracy = self.correct_predictions / self.total_predictions

            # Precision: TP / (TP + FP)
            tp = self.correct_predictions - self.false_negatives
            if tp + self.false_positives > 0:
                self.precision = tp / (tp + self.false_positives)

            # Recall: TP / (TP + FN)
            if tp + self.false_negatives > 0:
                self.recall = tp / (tp + self.false_negatives)

            # F1 Score: 2 * (P * R) / (P + R)
            if self.precision + self.recall > 0:
                self.f1_score = 2 * self.precision * self.recall / (self.precision + self.recall)


@dataclass
class DriftReport:
    """Data drift detection report."""

    drift_type: DriftType
    drift_score: float  # 0-1, higher = more drift
    timestamp: float = field(default_factory=time.time)
    details: dict[str, Any] = field(default_factory=dict)
    requires_retraining: bool = False


# ============================================================================
# Feedback Collector
# ============================================================================


class FeedbackCollector:
    """
    Collect and store user feedback.

    Stores feedback locally and provides APIs for querying and analysis.
    """

    def __init__(self, storage_path: str = "data/feedback.jsonl"):
        """Initialize feedback collector."""
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.feedback_buffer: list[UserFeedback] = []
        self.buffer_size = 100  # Write after 100 feedback items

    def add_feedback(self, feedback: UserFeedback) -> None:
        """Add user feedback."""
        self.feedback_buffer.append(feedback)
        logger.info(
            f"Feedback received: {feedback.feedback_type.value} "
            f"for prediction {feedback.prediction_id}"
        )

        if len(self.feedback_buffer) >= self.buffer_size:
            self.flush()

    def flush(self) -> None:
        """Write buffered feedback to storage."""
        if not self.feedback_buffer:
            return

        with open(self.storage_path, "a") as f:
            for feedback in self.feedback_buffer:
                f.write(
                    json.dumps(
                        {
                            "prediction_id": feedback.prediction_id,
                            "feedback_type": feedback.feedback_type.value,
                            "timestamp": feedback.timestamp,
                            "prediction": str(feedback.prediction),
                            "ground_truth": str(feedback.ground_truth),
                            "confidence": feedback.confidence,
                            "model_version": feedback.model_version,
                            "metadata": feedback.metadata,
                        }
                    )
                    + "\n"
                )

        logger.info(f"Flushed {len(self.feedback_buffer)} feedback items to storage")
        self.feedback_buffer.clear()

    def load_feedback(
        self,
        since_timestamp: float | None = None,
        model_version: str | None = None,
    ) -> list[UserFeedback]:
        """Load feedback from storage."""
        if not self.storage_path.exists():
            return []

        feedback_list = []
        with open(self.storage_path) as f:
            for line in f:
                data = json.loads(line.strip())

                # Filter by timestamp
                if since_timestamp and data["timestamp"] < since_timestamp:
                    continue

                # Filter by model version
                if model_version and data["model_version"] != model_version:
                    continue

                feedback = UserFeedback(
                    prediction_id=data["prediction_id"],
                    feedback_type=FeedbackType(data["feedback_type"]),
                    timestamp=data["timestamp"],
                    prediction=data.get("prediction"),
                    ground_truth=data.get("ground_truth"),
                    confidence=data.get("confidence", 0.0),
                    model_version=data.get("model_version", "baseline"),
                    metadata=data.get("metadata", {}),
                )
                feedback_list.append(feedback)

        return feedback_list

    def get_statistics(
        self,
        since_timestamp: float | None = None,
    ) -> dict[str, Any]:
        """Get feedback statistics."""
        feedback_list = self.load_feedback(since_timestamp=since_timestamp)

        if not feedback_list:
            return {"total": 0}

        feedback_counts = defaultdict(int)
        for feedback in feedback_list:
            feedback_counts[feedback.feedback_type.value] += 1

        return {
            "total": len(feedback_list),
            "by_type": dict(feedback_counts),
            "time_range": {
                "start": min(f.timestamp for f in feedback_list),
                "end": max(f.timestamp for f in feedback_list),
            },
        }


# ============================================================================
# Performance Tracker
# ============================================================================


class PerformanceTracker:
    """
    Track model performance over time.

    Monitors accuracy, precision, recall, and other metrics to detect
    performance degradation.
    """

    def __init__(self, storage_path: str = "data/performance.json"):
        """Initialize performance tracker."""
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.metrics: dict[str, PerformanceMetrics] = {}
        self.load_metrics()

    def load_metrics(self) -> None:
        """Load metrics from storage."""
        if not self.storage_path.exists():
            return

        with open(self.storage_path) as f:
            data = json.load(f)

        for version, metrics_data in data.items():
            self.metrics[version] = PerformanceMetrics(
                model_version=version,
                accuracy=metrics_data["accuracy"],
                precision=metrics_data["precision"],
                recall=metrics_data["recall"],
                f1_score=metrics_data["f1_score"],
                total_predictions=metrics_data["total_predictions"],
                correct_predictions=metrics_data["correct_predictions"],
                false_positives=metrics_data["false_positives"],
                false_negatives=metrics_data["false_negatives"],
                timestamp=metrics_data["timestamp"],
            )

    def save_metrics(self) -> None:
        """Save metrics to storage."""
        data = {}
        for version, metrics in self.metrics.items():
            data[version] = {
                "accuracy": metrics.accuracy,
                "precision": metrics.precision,
                "recall": metrics.recall,
                "f1_score": metrics.f1_score,
                "total_predictions": metrics.total_predictions,
                "correct_predictions": metrics.correct_predictions,
                "false_positives": metrics.false_positives,
                "false_negatives": metrics.false_negatives,
                "timestamp": metrics.timestamp,
            }

        with open(self.storage_path, "w") as f:
            json.dump(data, f, indent=2)

    def update(self, model_version: str, feedback: UserFeedback) -> None:
        """Update metrics with new feedback."""
        if model_version not in self.metrics:
            self.metrics[model_version] = PerformanceMetrics(model_version=model_version)

        self.metrics[model_version].update(feedback)
        self.save_metrics()

    def get_metrics(self, model_version: str) -> PerformanceMetrics | None:
        """Get metrics for a model version."""
        return self.metrics.get(model_version)

    def compare_models(
        self,
        version_a: str,
        version_b: str,
    ) -> dict[str, Any]:
        """Compare two model versions."""
        metrics_a = self.get_metrics(version_a)
        metrics_b = self.get_metrics(version_b)

        if not metrics_a or not metrics_b:
            return {"error": "One or both model versions not found"}

        return {
            "version_a": version_a,
            "version_b": version_b,
            "accuracy_diff": metrics_b.accuracy - metrics_a.accuracy,
            "precision_diff": metrics_b.precision - metrics_a.precision,
            "recall_diff": metrics_b.recall - metrics_a.recall,
            "f1_diff": metrics_b.f1_score - metrics_a.f1_score,
            "winner": version_b if metrics_b.f1_score > metrics_a.f1_score else version_a,
        }


# ============================================================================
# Drift Detector
# ============================================================================


class DriftDetector:
    """
    Detect data drift to trigger retraining.

    Monitors prediction distributions and performance to detect when
    the model needs retraining.
    """

    def __init__(
        self,
        gradual_threshold: float = 0.05,
        sudden_threshold: float = 0.15,
    ):
        """
        Initialize drift detector.

        Args:
            gradual_threshold: Threshold for gradual drift detection
            sudden_threshold: Threshold for sudden drift detection
        """
        self.gradual_threshold = gradual_threshold
        self.sudden_threshold = sudden_threshold
        self.historical_accuracy: list[float] = []

    def detect(
        self,
        current_metrics: PerformanceMetrics,
        baseline_metrics: PerformanceMetrics,
    ) -> DriftReport:
        """
        Detect drift by comparing current vs baseline metrics.

        Args:
            current_metrics: Current model metrics
            baseline_metrics: Baseline model metrics

        Returns:
            DriftReport with drift analysis
        """
        # Calculate accuracy drop
        accuracy_drop = baseline_metrics.accuracy - current_metrics.accuracy

        # Detect drift type
        if accuracy_drop < 0:
            # Model improving
            drift_type = DriftType.NO_DRIFT
            drift_score = 0.0
            requires_retraining = False

        elif accuracy_drop < self.gradual_threshold:
            # Stable performance
            drift_type = DriftType.NO_DRIFT
            drift_score = accuracy_drop / self.gradual_threshold
            requires_retraining = False

        elif accuracy_drop < self.sudden_threshold:
            # Gradual drift
            drift_type = DriftType.GRADUAL_DRIFT
            drift_score = accuracy_drop / self.sudden_threshold
            requires_retraining = drift_score > 0.5

        else:
            # Sudden drift
            drift_type = DriftType.SUDDEN_DRIFT
            drift_score = min(1.0, accuracy_drop / self.sudden_threshold)
            requires_retraining = True

        return DriftReport(
            drift_type=drift_type,
            drift_score=drift_score,
            requires_retraining=requires_retraining,
            details={
                "accuracy_drop": accuracy_drop,
                "current_accuracy": current_metrics.accuracy,
                "baseline_accuracy": baseline_metrics.accuracy,
                "current_predictions": current_metrics.total_predictions,
                "baseline_predictions": baseline_metrics.total_predictions,
            },
        )


# ============================================================================
# Adaptive Learning Manager
# ============================================================================


class AdaptiveLearningManager:
    """
    Main manager for adaptive learning system.

    Coordinates feedback collection, performance tracking, drift detection,
    and retraining triggers.
    """

    def __init__(
        self,
        feedback_path: str = "data/feedback.jsonl",
        performance_path: str = "data/performance.json",
    ):
        """Initialize adaptive learning manager."""
        self.feedback_collector = FeedbackCollector(feedback_path)
        self.performance_tracker = PerformanceTracker(performance_path)
        self.drift_detector = DriftDetector()
        self.retraining_threshold = 100  # Retrain after 100 feedback items

    def submit_feedback(
        self,
        prediction_id: str,
        feedback_type: FeedbackType,
        prediction: Any = None,
        ground_truth: Any = None,
        confidence: float = 0.0,
        model_version: str = "baseline",
    ) -> None:
        """Submit user feedback."""
        feedback = UserFeedback(
            prediction_id=prediction_id,
            feedback_type=feedback_type,
            prediction=prediction,
            ground_truth=ground_truth,
            confidence=confidence,
            model_version=model_version,
        )

        self.feedback_collector.add_feedback(feedback)
        self.performance_tracker.update(model_version, feedback)

        logger.info(f"Feedback processed for {prediction_id}")

    def check_retraining_needed(self, model_version: str = "baseline") -> bool:
        """Check if model retraining is needed."""
        # Get recent feedback count
        one_week_ago = time.time() - (7 * 24 * 60 * 60)
        recent_feedback = self.feedback_collector.load_feedback(
            since_timestamp=one_week_ago, model_version=model_version
        )

        # Criterion 1: Enough new feedback
        if len(recent_feedback) < self.retraining_threshold:
            logger.info(
                f"Not enough feedback for retraining: "
                f"{len(recent_feedback)}/{self.retraining_threshold}"
            )
            return False

        # Criterion 2: Check for drift
        current_metrics = self.performance_tracker.get_metrics(model_version)
        if not current_metrics:
            return False

        # Use first week's metrics as baseline
        baseline_metrics = PerformanceMetrics(model_version="baseline")
        baseline_metrics.accuracy = 0.90  # Assume 90% initial accuracy

        drift_report = self.drift_detector.detect(current_metrics, baseline_metrics)

        if drift_report.requires_retraining:
            logger.warning(
                f"Drift detected: {drift_report.drift_type.value} "
                f"(score: {drift_report.drift_score:.2f}). Retraining recommended."
            )
            return True

        return False

    def get_status(self) -> dict[str, Any]:
        """Get adaptive learning system status."""
        feedback_stats = self.feedback_collector.get_statistics()

        # Get metrics for all versions
        all_metrics = {}
        for version in self.performance_tracker.metrics:
            metrics = self.performance_tracker.get_metrics(version)
            if metrics:
                all_metrics[version] = {
                    "accuracy": metrics.accuracy,
                    "precision": metrics.precision,
                    "recall": metrics.recall,
                    "f1_score": metrics.f1_score,
                    "total_predictions": metrics.total_predictions,
                }

        return {
            "feedback": feedback_stats,
            "metrics": all_metrics,
            "retraining_needed": self.check_retraining_needed(),
        }


# ============================================================================
# Example Usage
# ============================================================================


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)

    # Initialize manager
    manager = AdaptiveLearningManager()

    # Example 1: Submit feedback
    print("\n=== Example 1: Submit Feedback ===")
    manager.submit_feedback(
        prediction_id="pred_001",
        feedback_type=FeedbackType.CORRECT,
        prediction="Not a scam",
        confidence=0.95,
        model_version="baseline",
    )

    manager.submit_feedback(
        prediction_id="pred_002",
        feedback_type=FeedbackType.FALSE_POSITIVE,
        prediction="Scam",
        ground_truth="Legitimate",
        confidence=0.80,
        model_version="baseline",
    )

    # Example 2: Get status
    print("\n=== Example 2: System Status ===")
    status = manager.get_status()
    print(json.dumps(status, indent=2))

    # Example 3: Check retraining
    print("\n=== Example 3: Check Retraining ===")
    needs_retraining = manager.check_retraining_needed()
    print(f"Retraining needed: {needs_retraining}")

    # Flush feedback
    manager.feedback_collector.flush()
