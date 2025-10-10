import pytest

from models.job import JobModel


def test_job_model_basic_hash():
    job = JobModel(
        title="Senior Software Engineer",
        company="ExampleCorp",
        url="https://example.com/jobs/123",
        description="Build scalable systems in Python.",
        score=87.5,
        score_reasons=["keyword match", "experience alignment"],
    )
    h = job.content_hash()
    assert len(h) == 64
    db_payload = job.to_db_dict()
    assert db_payload["hash"] == h
    assert db_payload["score"] == 87.5


def test_job_model_validation():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        JobModel(title=" ", company="X", url="https://example.com")
    with pytest.raises(ValidationError):
        JobModel(title="Good", company=" ", url="https://example.com")
