"""Batch container model for groups of JobModel instances.

Provides:
  - Validation of each job
  - Aggregate helpers (count, sources, hash summary)
  - Stable batch id derived from contained job hashes (order-insensitive)
"""
from __future__ import annotations

import hashlib

from pydantic import BaseModel, field_validator

from .job import JobModel


class JobBatch(BaseModel):
    jobs: list[JobModel]

    @field_validator("jobs")
    @classmethod
    def non_empty(cls, v: list[JobModel]):  # type: ignore
        if not v:
            raise ValueError("jobs list cannot be empty")
        return v

    def count(self) -> int:
        return len(self.jobs)

    def sources(self) -> set[str]:
        return {j.source or "unknown" for j in self.jobs}

    def batch_id(self) -> str:
        # Order-insensitive hash of individual job content hashes
        hashes = sorted(j.content_hash() for j in self.jobs)
        joined = "::".join(hashes)
        return hashlib.sha256(joined.encode("utf-8")).hexdigest()

    def summary(self) -> dict:
        return {
            "count": self.count(),
            "sources": sorted(self.sources()),
            "batch_id": self.batch_id(),
        }
