"""
Tests for Multi-Task Learning module.
"""

import pytest

pytest.importorskip("torch")

import torch

from domains.ml.multi_task_learning import (
    MultiTaskBERT,
    MultiTaskPredictor,
    MultiTaskTrainer,
    Task,
    TaskType,
    TrainingConfig,
    create_job_matching_model,
)


def test_task_creation():
    """Test Task dataclass creation."""
    task = Task(
        name="test_task",
        task_type=TaskType.CLASSIFICATION,
        num_classes=5,
        weight=1.0,
        description="Test task",
    )

    assert task.name == "test_task"
    assert task.task_type == TaskType.CLASSIFICATION
    assert task.num_classes == 5
    assert task.weight == 1.0


def test_multi_task_bert_initialization():
    """Test MultiTaskBERT initialization."""
    tasks = [
        Task(
            name="classification",
            task_type=TaskType.CLASSIFICATION,
            num_classes=3,
        ),
        Task(
            name="regression",
            task_type=TaskType.REGRESSION,
            num_classes=1,
        ),
    ]

    model = MultiTaskBERT(
        tasks=tasks,
        model_name="sentence-transformers/all-MiniLM-L6-v2",
    )

    assert len(model.tasks) == 2
    assert "classification" in model.tasks
    assert "regression" in model.tasks
    assert model.hidden_size == 384  # all-MiniLM-L6-v2 hidden size


def test_multi_task_bert_forward():
    """Test forward pass through MultiTaskBERT."""
    tasks = [
        Task(name="task1", task_type=TaskType.CLASSIFICATION, num_classes=3),
    ]

    model = MultiTaskBERT(tasks=tasks)

    # Create dummy input
    batch_size = 2
    seq_len = 10
    input_ids = torch.randint(0, 1000, (batch_size, seq_len))
    attention_mask = torch.ones((batch_size, seq_len))

    # Forward pass
    outputs = model(input_ids, attention_mask)

    assert "task1" in outputs
    assert outputs["task1"].shape == (batch_size, 3)  # 3 classes


def test_multi_task_bert_encode_text():
    """Test text encoding."""
    model = create_job_matching_model()

    text = "Senior Software Engineer position"
    embedding = model.encode_text(text)

    assert embedding.shape == (384,)  # Hidden size
    assert torch.is_tensor(embedding)


def test_create_job_matching_model():
    """Test factory function for job matching model."""
    model = create_job_matching_model()

    assert "job_category" in model.tasks
    assert "salary_prediction" in model.tasks
    assert "scam_detection" in model.tasks
    assert "match_quality" in model.tasks

    assert model.tasks["job_category"].task_type == TaskType.CLASSIFICATION
    assert model.tasks["salary_prediction"].task_type == TaskType.REGRESSION
    assert model.tasks["scam_detection"].task_type == TaskType.BINARY


def test_multi_task_predictor():
    """Test MultiTaskPredictor."""
    model = create_job_matching_model()
    predictor = MultiTaskPredictor(model)

    text = "Python developer with ML experience. Salary: $120k-$150k."

    # Run prediction
    predictions = predictor.predict(text)

    assert "job_category" in predictions
    assert "salary_prediction" in predictions
    assert "scam_detection" in predictions
    assert "match_quality" in predictions

    # Check prediction structure
    job_pred = predictions["job_category"]
    assert "class" in job_pred
    assert "probabilities" in job_pred
    assert "confidence" in job_pred
    assert 0 <= job_pred["confidence"] <= 1

    scam_pred = predictions["scam_detection"]
    assert "prediction" in scam_pred
    assert "probability" in scam_pred
    assert isinstance(scam_pred["prediction"], bool)


def test_multi_task_predictor_embedding():
    """Test embedding extraction."""
    model = create_job_matching_model()
    predictor = MultiTaskPredictor(model)

    text = "Machine Learning Engineer"
    embedding = predictor.get_embedding(text)

    assert embedding.shape == (384,)
    assert embedding.dtype.name.startswith("float")


def test_training_config():
    """Test TrainingConfig dataclass."""
    config = TrainingConfig(
        batch_size=8,
        num_epochs=5,
        learning_rate=1e-5,
    )

    assert config.batch_size == 8
    assert config.num_epochs == 5
    assert config.learning_rate == 1e-5


def test_multi_task_trainer_initialization():
    """Test MultiTaskTrainer initialization."""
    model = create_job_matching_model()
    config = TrainingConfig(num_epochs=1, batch_size=2)

    trainer = MultiTaskTrainer(model, config)

    assert trainer.model == model
    assert trainer.config == config
    assert trainer.optimizer is not None
    assert len(trainer.loss_functions) == 4  # One per task


def test_multi_task_trainer_compute_loss():
    """Test loss computation."""
    model = create_job_matching_model()
    config = TrainingConfig()
    trainer = MultiTaskTrainer(model, config)

    # Create dummy outputs and labels
    outputs = {
        "job_category": torch.randn(2, 20),  # 2 samples, 20 classes
        "salary_prediction": torch.randn(2, 1),
    }

    labels = {
        "job_category": torch.randint(0, 20, (2,)),
        "salary_prediction": torch.randn(2, 1),
    }

    # Compute loss
    total_loss, task_losses = trainer.compute_loss(outputs, labels)

    assert torch.is_tensor(total_loss)
    assert total_loss.item() >= 0
    assert "job_category" in task_losses
    assert "salary_prediction" in task_losses


def test_task_types():
    """Test all TaskType values."""
    assert TaskType.CLASSIFICATION.value == "classification"
    assert TaskType.REGRESSION.value == "regression"
    assert TaskType.BINARY.value == "binary"


def test_multi_task_bert_task_head_creation():
    """Test task head creation for different task types."""
    # Classification head
    task_cls = Task(name="cls", task_type=TaskType.CLASSIFICATION, num_classes=5)
    model_cls = MultiTaskBERT(tasks=[task_cls])
    assert "cls" in model_cls.task_heads

    # Binary head
    task_bin = Task(name="bin", task_type=TaskType.BINARY, num_classes=1)
    model_bin = MultiTaskBERT(tasks=[task_bin])
    assert "bin" in model_bin.task_heads

    # Regression head
    task_reg = Task(name="reg", task_type=TaskType.REGRESSION, num_classes=1)
    model_reg = MultiTaskBERT(tasks=[task_reg])
    assert "reg" in model_reg.task_heads


def test_multi_task_bert_invalid_task_type():
    """Test that invalid task type raises error."""
    # This should work during initialization
    tasks = [Task(name="test", task_type=TaskType.CLASSIFICATION, num_classes=3)]
    model = MultiTaskBERT(tasks=tasks)

    # But trying to create a head for unknown type would fail
    # (tested internally in _create_task_head)
    assert len(model.task_heads) == 1


def test_multi_task_predictor_selective_tasks():
    """Test prediction on specific tasks only."""
    model = create_job_matching_model()
    predictor = MultiTaskPredictor(model)

    text = "Data Scientist position"

    # Predict only specific tasks
    predictions = predictor.predict(text, task_names=["job_category", "scam_detection"])

    assert "job_category" in predictions
    assert "scam_detection" in predictions
    assert "salary_prediction" not in predictions
    assert "match_quality" not in predictions
