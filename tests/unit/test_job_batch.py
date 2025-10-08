import pytest

from models.job import JobModel
from models.job_batch import JobBatch


def sample_job(idx: int) -> JobModel:
    return JobModel(
        title=f"Engineer {idx}",
        company="Acme",
        url=f"https://example.com/job/{idx}",
        description=f"Role number {idx} building cloud systems",
        source="test",
    )


def test_batch_summary_stable_order_insensitive():
    j1, j2, j3 = sample_job(1), sample_job(2), sample_job(3)
    batch_a = JobBatch(jobs=[j1, j2, j3])
    batch_b = JobBatch(jobs=[j3, j2, j1])
    assert batch_a.batch_id() == batch_b.batch_id()
    summary = batch_a.summary()
    assert summary["count"] == 3
    assert "test" in summary["sources"]


def test_batch_requires_non_empty():
    with pytest.raises(ValueError):  # type: ignore
        JobBatch(jobs=[])
