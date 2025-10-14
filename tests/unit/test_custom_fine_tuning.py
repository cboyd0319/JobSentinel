"""
Tests for Custom Fine-Tuning module.
"""

import json
import tempfile
from pathlib import Path

import pytest
import torch

from src.domains.ml.custom_fine_tuning import (
    FineTunedBERT,
    FineTuningConfig,
    FineTuningTrainer,
    JobMatchingDataset,
    ModelManager,
)


def test_job_matching_dataset_single_text():
    """Test dataset with single text examples."""
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

    examples = [
        {"text": "Job description 1", "label": 0},
        {"text": "Job description 2", "label": 1},
    ]

    dataset = JobMatchingDataset(examples, tokenizer, max_length=128)

    assert len(dataset) == 2

    # Get first item
    item = dataset[0]
    assert "input_ids" in item
    assert "attention_mask" in item
    assert "label" in item
    assert item["input_ids"].shape == (128,)
    assert item["label"].item() == 0


def test_job_matching_dataset_text_pairs():
    """Test dataset with text pairs (for similarity)."""
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

    examples = [
        {"text1": "Resume text", "text2": "Job description", "score": 0.85},
    ]

    dataset = JobMatchingDataset(examples, tokenizer, max_length=128)

    assert len(dataset) == 1

    item = dataset[0]
    assert "input_ids" in item
    assert "attention_mask" in item
    assert "label" in item
    assert item["label"].item() == pytest.approx(0.85, abs=0.01)


def test_fine_tuning_config():
    """Test FineTuningConfig dataclass."""
    config = FineTuningConfig(
        task_type="classification",
        num_classes=10,
        batch_size=16,
        num_epochs=5,
        learning_rate=2e-5,
    )

    assert config.task_type == "classification"
    assert config.num_classes == 10
    assert config.batch_size == 16
    assert config.num_epochs == 5
    assert config.learning_rate == 2e-5


def test_fine_tuned_bert_initialization_classification():
    """Test FineTunedBERT initialization for classification."""
    config = FineTuningConfig(
        task_type="classification",
        num_classes=5,
    )

    model = FineTunedBERT(config)

    assert model.config == config
    assert model.bert is not None
    assert model.tokenizer is not None
    assert model.head is not None
    assert model.hidden_size == 384  # all-MiniLM-L6-v2


def test_fine_tuned_bert_initialization_regression():
    """Test FineTunedBERT initialization for regression."""
    config = FineTuningConfig(
        task_type="regression",
        num_classes=1,
    )

    model = FineTunedBERT(config)

    assert model.config.task_type == "regression"
    assert model.head is not None


def test_fine_tuned_bert_initialization_similarity():
    """Test FineTunedBERT initialization for similarity."""
    config = FineTuningConfig(
        task_type="similarity",
        num_classes=1,
    )

    model = FineTunedBERT(config)

    assert model.config.task_type == "similarity"


def test_fine_tuned_bert_invalid_task_type():
    """Test that invalid task type raises error."""
    config = FineTuningConfig(
        task_type="invalid_task",
        num_classes=1,
    )

    with pytest.raises(ValueError, match="Unknown task type"):
        FineTunedBERT(config)


def test_fine_tuned_bert_forward():
    """Test forward pass."""
    config = FineTuningConfig(
        task_type="classification",
        num_classes=3,
    )

    model = FineTunedBERT(config)

    # Create dummy input
    batch_size = 2
    seq_len = 10
    input_ids = torch.randint(0, 1000, (batch_size, seq_len))
    attention_mask = torch.ones((batch_size, seq_len))

    # Forward pass
    logits = model(input_ids, attention_mask)

    assert logits.shape == (batch_size, 3)


def test_fine_tuning_trainer_initialization():
    """Test FineTuningTrainer initialization."""
    config = FineTuningConfig(
        task_type="classification",
        num_classes=5,
        num_epochs=1,
    )

    model = FineTunedBERT(config)
    trainer = FineTuningTrainer(model, config)

    assert trainer.model == model
    assert trainer.config == config
    assert trainer.optimizer is not None
    assert trainer.criterion is not None
    assert len(trainer.metrics_history) == 0


def test_fine_tuning_trainer_train_small_dataset():
    """Test training on small dataset."""
    config = FineTuningConfig(
        task_type="classification",
        num_classes=3,
        num_epochs=1,
        batch_size=2,
    )

    model = FineTunedBERT(config)

    # Create small training dataset
    train_examples = [{"text": f"Training sample {i}", "label": i % 3} for i in range(6)]

    train_dataset = JobMatchingDataset(
        train_examples,
        model.tokenizer,
        max_length=config.max_length,
    )

    # Train
    with tempfile.TemporaryDirectory() as tmpdir:
        config.save_dir = tmpdir
        trainer = FineTuningTrainer(model, config)

        metrics = trainer.train(train_dataset)

        assert len(metrics) == 1  # 1 epoch
        assert metrics[0].epoch == 1
        assert metrics[0].train_loss >= 0
        assert 0 <= metrics[0].train_accuracy <= 1


def test_fine_tuning_trainer_train_with_validation():
    """Test training with validation dataset."""
    config = FineTuningConfig(
        task_type="classification",
        num_classes=2,
        num_epochs=1,
        batch_size=2,
    )

    model = FineTunedBERT(config)

    # Create datasets
    train_examples = [{"text": f"Train {i}", "label": i % 2} for i in range(6)]
    val_examples = [{"text": f"Val {i}", "label": i % 2} for i in range(4)]

    train_dataset = JobMatchingDataset(train_examples, model.tokenizer)
    val_dataset = JobMatchingDataset(val_examples, model.tokenizer)

    with tempfile.TemporaryDirectory() as tmpdir:
        config.save_dir = tmpdir
        trainer = FineTuningTrainer(model, config)

        metrics = trainer.train(train_dataset, val_dataset)

        assert len(metrics) == 1
        assert metrics[0].val_loss >= 0
        assert 0 <= metrics[0].val_accuracy <= 1


def test_fine_tuning_trainer_save_checkpoint():
    """Test checkpoint saving."""
    config = FineTuningConfig(task_type="classification", num_classes=3)

    model = FineTunedBERT(config)

    with tempfile.TemporaryDirectory() as tmpdir:
        config.save_dir = tmpdir
        trainer = FineTuningTrainer(model, config)

        # Save checkpoint
        trainer.save_checkpoint(epoch=1)

        # Verify checkpoint file exists
        checkpoint_path = Path(tmpdir) / "checkpoint_epoch_1.pt"
        assert checkpoint_path.exists()

        # Load and verify checkpoint
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        assert "epoch" in checkpoint
        assert "model_state_dict" in checkpoint
        assert "optimizer_state_dict" in checkpoint
        assert "config" in checkpoint
        assert checkpoint["epoch"] == 1


def test_fine_tuning_trainer_load_checkpoint():
    """Test checkpoint loading."""
    config = FineTuningConfig(task_type="classification", num_classes=3)

    model = FineTunedBERT(config)

    with tempfile.TemporaryDirectory() as tmpdir:
        config.save_dir = tmpdir
        trainer = FineTuningTrainer(model, config)

        # Save checkpoint
        trainer.save_checkpoint(epoch=5)

        # Create new trainer and load checkpoint
        new_model = FineTunedBERT(config)
        new_trainer = FineTuningTrainer(new_model, config)

        checkpoint_path = Path(tmpdir) / "checkpoint_epoch_5.pt"
        epoch = new_trainer.load_checkpoint(str(checkpoint_path))

        assert epoch == 5


def test_model_manager_initialization():
    """Test ModelManager initialization."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        assert manager.models_dir == Path(tmpdir)
        assert manager.registry == {"models": {}, "current_version": None}


def test_model_manager_register_model():
    """Test model registration."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        manager.register_model(
            version="v1.0.0",
            checkpoint_path="/path/to/checkpoint.pt",
            metrics={"accuracy": 0.95, "loss": 0.1},
            description="Initial model",
        )

        assert "v1.0.0" in manager.registry["models"]
        assert manager.registry["current_version"] == "v1.0.0"

        model_info = manager.registry["models"]["v1.0.0"]
        assert model_info["checkpoint_path"] == "/path/to/checkpoint.pt"
        assert model_info["metrics"]["accuracy"] == 0.95


def test_model_manager_get_current_model():
    """Test getting current production model."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        # No models registered
        assert manager.get_current_model() is None

        # Register model
        manager.register_model(
            version="v1.0.0",
            checkpoint_path="/path/to/checkpoint.pt",
            metrics={"accuracy": 0.90},
        )

        current = manager.get_current_model()
        assert current is not None
        assert current["version"] == "v1.0.0"


def test_model_manager_set_current_model():
    """Test setting current production model."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        # Register multiple models
        manager.register_model(
            version="v1.0.0",
            checkpoint_path="/path/v1.pt",
            metrics={"accuracy": 0.90},
        )

        manager.register_model(
            version="v2.0.0",
            checkpoint_path="/path/v2.pt",
            metrics={"accuracy": 0.95},
        )

        # Set v2 as current
        manager.set_current_model("v2.0.0")

        current = manager.get_current_model()
        assert current["version"] == "v2.0.0"


def test_model_manager_set_invalid_version():
    """Test that setting invalid version raises error."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        with pytest.raises(ValueError, match="Unknown model version"):
            manager.set_current_model("invalid_version")


def test_model_manager_list_models():
    """Test listing all models."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        # Register multiple models
        manager.register_model(
            version="v1.0.0",
            checkpoint_path="/path/v1.pt",
            metrics={"accuracy": 0.90},
        )

        manager.register_model(
            version="v2.0.0",
            checkpoint_path="/path/v2.pt",
            metrics={"accuracy": 0.95},
        )

        models = manager.list_models()

        assert len(models) == 2
        assert all("version" in m for m in models)
        assert all("is_current" in m for m in models)

        # v1.0.0 should be current (first registered)
        v1 = next(m for m in models if m["version"] == "v1.0.0")
        assert v1["is_current"] is True


def test_model_manager_registry_persistence():
    """Test that registry is persisted to disk."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = ModelManager(models_dir=tmpdir)

        # Register model
        manager.register_model(
            version="v1.0.0",
            checkpoint_path="/path/to/checkpoint.pt",
            metrics={"accuracy": 0.90},
        )

        # Create new manager (should load existing registry)
        new_manager = ModelManager(models_dir=tmpdir)

        assert "v1.0.0" in new_manager.registry["models"]
        assert new_manager.registry["current_version"] == "v1.0.0"


def test_training_metrics_structure():
    """Test TrainingMetrics dataclass."""
    from src.domains.ml.custom_fine_tuning import TrainingMetrics

    metrics = TrainingMetrics(
        epoch=1,
        train_loss=0.5,
        val_loss=0.6,
        train_accuracy=0.85,
        val_accuracy=0.80,
        learning_rate=2e-5,
    )

    assert metrics.epoch == 1
    assert metrics.train_loss == 0.5
    assert metrics.val_loss == 0.6
    assert metrics.train_accuracy == 0.85
    assert metrics.val_accuracy == 0.80
    assert metrics.learning_rate == 2e-5
    assert metrics.timestamp is not None  # Auto-generated


def test_fine_tuned_bert_different_dropouts():
    """Test model with different dropout rates."""
    config_low = FineTuningConfig(task_type="classification", num_classes=3, dropout=0.1)
    config_high = FineTuningConfig(task_type="classification", num_classes=3, dropout=0.5)

    model_low = FineTunedBERT(config_low)
    model_high = FineTunedBERT(config_high)

    assert model_low.config.dropout == 0.1
    assert model_high.config.dropout == 0.5
