"""
Advanced ML Features Demo

Demonstrates the four newly implemented ML capabilities:
1. Multi-Task Learning
2. Active Learning
3. Cross-Encoder Reranking
4. Custom Fine-Tuning

Run with: python examples/advanced_ml_demo.py

SECURITY NOTE: This is a demonstration script that prints job data including salaries.
In production code, sensitive data should be logged securely or not at all.
"""

import logging
import sys
from pathlib import Path

import numpy as np

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


def demo_multi_task_learning():
    """Demonstrate Multi-Task Learning."""
    print("\n" + "=" * 80)
    print("1. MULTI-TASK LEARNING DEMO")
    print("=" * 80)

    from domains.ml import MultiTaskPredictor, create_job_matching_model

    # Create model
    logger.info("Creating multi-task model...")
    model = create_job_matching_model()

    # Sample job description
    job_description = """
    Senior Machine Learning Engineer

    We're looking for an experienced ML engineer to join our team.
    Responsibilities include building production ML systems, training
    models, and deploying to AWS.

    Requirements:
    - 5+ years Python experience
    - Deep learning expertise (PyTorch/TensorFlow)
    - Cloud deployment experience
    - Strong communication skills

    Salary: $150,000 - $180,000 per year
    Location: Remote (US)
    Benefits: Full health coverage, 401k, unlimited PTO
    """

    # Run inference
    logger.info("Running multi-task inference...")
    predictor = MultiTaskPredictor(model)
    predictions = predictor.predict(job_description)

    # Display results
    print("\nJob Description Analysis:")
    print("-" * 80)

    print("\n1. Job Category:")
    cat = predictions["job_category"]
    print(f"   Predicted Class: {cat['class']}")
    print(f"   Confidence: {cat['confidence']:.2%}")

    print("\n2. Salary Prediction:")
    sal = predictions["salary_prediction"]
    print(f"   Estimated: ${sal['value']:,.0f}")

    print("\n3. Scam Detection:")
    scam = predictions["scam_detection"]
    print(f"   Is Scam: {scam['prediction']}")
    print(f"   Probability: {scam['probability']:.2%}")
    print(f"   Confidence: {scam['confidence']:.2%}")

    print("\n4. Match Quality:")
    match = predictions["match_quality"]
    print(f"   Score: {match['value']:.2f}")

    # Get shared embedding
    embedding = predictor.get_embedding(job_description)
    print(f"\n5. Shared Embedding:")
    print(f"   Dimensions: {embedding.shape[0]}")
    print(f"   Norm: {np.linalg.norm(embedding):.4f}")

    print("\n✅ Multi-Task Learning demo complete!")


def demo_active_learning():
    """Demonstrate Active Learning."""
    print("\n" + "=" * 80)
    print("2. ACTIVE LEARNING DEMO")
    print("=" * 80)

    from domains.ml import ActiveLearningManager, QueryStrategy, Sample

    # Initialize manager
    logger.info("Initializing active learning manager...")
    manager = ActiveLearningManager(
        strategy=QueryStrategy.HYBRID,
        batch_size=5,
    )

    # Create sample pool
    logger.info("Creating candidate pool...")
    candidates = []
    for i in range(50):
        sample = Sample(
            sample_id=f"job_{i:03d}",
            text=f"Job posting {i} with various requirements and qualifications.",
            embedding=np.random.randn(384),  # Simulated embedding
            confidence=np.random.uniform(0.5, 1.0),
        )
        candidates.append(sample)

    # Select samples for labeling
    logger.info("Selecting most informative samples...")
    result = manager.select_samples(candidates, num_samples=5)

    print("\nActive Learning Results:")
    print("-" * 80)
    print(f"Strategy: {result.strategy.value}")
    print(f"Candidates evaluated: {result.num_candidates}")
    print(f"Selection time: {result.selection_time_ms:.1f}ms")

    print("\nTop 5 samples selected for labeling:")
    for i, sample in enumerate(result.selected_samples, 1):
        print(f"\n{i}. {sample.sample_id}")
        print(f"   Confidence: {sample.confidence:.3f}")
        print(f"   Query Score: {sample.query_score:.3f}")
        print(f"   Uncertainty: {sample.uncertainty_score:.3f}")
        print(f"   Diversity: {sample.diversity_score:.3f}")

    # Simulate adding labels
    logger.info("Simulating user labeling...")
    labels = [i % 2 for i in range(len(result.selected_samples))]
    manager.add_labels(result.selected_samples, labels)

    # Check retraining
    from domains.ml.active_learning import RetrainingTrigger

    trigger = RetrainingTrigger(
        min_new_samples=3,
        max_time_hours=24,
    )

    should_retrain = manager.should_retrain(
        trigger,
        current_accuracy=0.85,
        baseline_accuracy=0.90,
    )

    print(f"\nRetraining Decision:")
    print(f"   Should retrain: {should_retrain}")
    print(f"   Samples labeled: {manager.stats['total_samples_labeled']}")

    print("\n✅ Active Learning demo complete!")


def demo_cross_encoder_reranking():
    """Demonstrate Cross-Encoder Reranking."""
    print("\n" + "=" * 80)
    print("3. CROSS-ENCODER RERANKING DEMO")
    print("=" * 80)

    from domains.ml import Candidate, HybridRanker

    # Create job candidates
    logger.info("Creating job candidate pool...")
    candidates = [
        Candidate(
            candidate_id="job_001",
            text="Senior Python Developer with ML and data science experience. "
            "Build scalable systems with PyTorch and AWS.",
        ),
        Candidate(
            candidate_id="job_002",
            text="Junior Java Developer for backend web services and APIs.",
        ),
        Candidate(
            candidate_id="job_003",
            text="Machine Learning Engineer specializing in NLP and transformers. "
            "Experience with BERT and GPT models.",
        ),
        Candidate(
            candidate_id="job_004",
            text="Data Scientist role focusing on Python, SQL, and statistical modeling.",
        ),
        Candidate(
            candidate_id="job_005",
            text="Frontend React Developer for building modern web applications.",
        ),
        Candidate(
            candidate_id="job_006",
            text="DevOps Engineer with Kubernetes and CI/CD pipeline expertise.",
        ),
        Candidate(
            candidate_id="job_007",
            text="AI Research Scientist working on cutting-edge deep learning algorithms.",
        ),
        Candidate(
            candidate_id="job_008",
            text="Full Stack Engineer with Python and JavaScript experience.",
        ),
        Candidate(
            candidate_id="job_009",
            text="Data Engineer building ETL pipelines and data warehouses.",
        ),
        Candidate(
            candidate_id="job_010",
            text="ML Platform Engineer developing infrastructure for model deployment.",
        ),
    ]

    # User query
    query = "Looking for Python Machine Learning Engineer position with NLP experience"

    # Initialize hybrid ranker
    logger.info("Initializing hybrid ranker...")
    ranker = HybridRanker(
        initial_top_k=7,  # Retrieve top 7 with bi-encoder
        final_top_k=3,  # Rerank to get top 3
    )

    # Rank candidates
    logger.info("Ranking candidates...")
    result = ranker.rank(query=query, candidates=candidates)

    print("\nHybrid Ranking Results:")
    print("-" * 80)
    print(f"Query: {query}")
    print(f"Total candidates: {len(candidates)}")
    print(f"Ranking time: {result.rerank_time_ms:.1f}ms")
    print(f"Precision improvement: {result.precision_improvement:.1%}")

    print("\nTop 3 Ranked Jobs:")
    for i, candidate in enumerate(result.reranked_candidates, 1):
        print(f"\n{i}. {candidate.candidate_id}")
        print(f"   Initial Score: {candidate.initial_score:.3f}")
        print(f"   Rerank Score: {candidate.rerank_score:.3f}")
        print(f"   Text: {candidate.text[:80]}...")

    print("\n✅ Cross-Encoder Reranking demo complete!")


def demo_custom_fine_tuning():
    """Demonstrate Custom Fine-Tuning."""
    print("\n" + "=" * 80)
    print("4. CUSTOM FINE-TUNING DEMO")
    print("=" * 80)

    from domains.ml import (
        FineTunedBERT,
        FineTuningConfig,
        JobMatchingDataset,
        ModelManager,
    )

    # Create configuration
    logger.info("Creating fine-tuning configuration...")
    config = FineTuningConfig(
        task_type="classification",
        num_classes=5,  # 5 job categories
        num_epochs=1,  # Single epoch for demo
        batch_size=4,
    )

    # Create model
    logger.info("Creating fine-tuned BERT model...")
    model = FineTunedBERT(config)

    print("\nFine-Tuning Configuration:")
    print("-" * 80)
    print(f"Task Type: {config.task_type}")
    print(f"Number of Classes: {config.num_classes}")
    print(f"Model: {config.model_name}")
    print(f"Hidden Size: {model.hidden_size}")
    print(f"Epochs: {config.num_epochs}")
    print(f"Batch Size: {config.batch_size}")
    print(f"Learning Rate: {config.learning_rate}")

    # Create synthetic dataset
    logger.info("Creating synthetic training data...")
    train_examples = [
        {"text": f"Job posting {i} with description and requirements.", "label": i % 5}
        for i in range(20)
    ]

    train_dataset = JobMatchingDataset(
        train_examples,
        model.tokenizer,
        max_length=config.max_length,
    )

    print(f"\nDataset:")
    print(f"   Training samples: {len(train_dataset)}")

    # Model manager
    logger.info("Initializing model manager...")
    manager = ModelManager()

    print(f"\nModel Manager:")
    print(f"   Models directory: {manager.models_dir}")

    # Register a model (simulated)
    manager.register_model(
        version="v1.0.0",
        checkpoint_path="/tmp/checkpoint_v1.pt",
        metrics={
            "accuracy": 0.92,
            "loss": 0.15,
            "f1_score": 0.90,
        },
        description="Initial production model",
    )

    # List models
    print(f"\nRegistered Models:")
    for model_info in manager.list_models():
        print(f"\n   Version: {model_info['version']}")
        print(f"   Current: {model_info['is_current']}")
        print(f"   Accuracy: {model_info['metrics']['accuracy']:.2%}")
        print(f"   Registered: {model_info['registered_at']}")

    print("\n✅ Custom Fine-Tuning demo complete!")


def main():
    """Run all demos."""
    print("\n" + "=" * 80)
    print("ADVANCED ML FEATURES DEMONSTRATION")
    print("JobSentinel v0.6.1+")
    print("=" * 80)

    try:
        # Run demos
        demo_multi_task_learning()
        demo_active_learning()
        demo_cross_encoder_reranking()
        demo_custom_fine_tuning()

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print("\n✅ All 4 advanced ML features demonstrated successfully!")
        print("\nFeatures implemented:")
        print("  1. Multi-Task Learning - Shared representations for multiple tasks")
        print("  2. Active Learning - Intelligent sample selection")
        print("  3. Cross-Encoder Reranking - Improved precision with joint attention")
        print("  4. Custom Fine-Tuning - Domain-specific model training")
        print("\nAll features are production-ready with comprehensive tests.")
        print("See docs/FEATURES.md for detailed documentation.")

    except Exception as e:
        logger.error(f"Demo failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
