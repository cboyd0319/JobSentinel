"""Pydantic Job model for normalized scraped entries.

This model is separate from the persistence layer (`src/database.py`) to:
  * Provide a clean validation boundary for incoming scraped data
  * Allow transformation / enrichment before DB insertion
  * Keep SQLModel concerns isolated (storage vs in-memory normalization)

Conversion guideline:
    from models.job import JobModel
    job = JobModel(**raw_dict)
    db_payload = job.to_db_dict()  # safe for add_job()
"""

from __future__ import annotations

import hashlib

from pydantic import BaseModel, HttpUrl, field_validator


class JobModel(BaseModel):
    title: str
    company: str
    url: HttpUrl
    location: str | None = None
    description: str | None = None
    source: str | None = None  # which scraper
    tags: list[str] = []
    score: float | None = None
    score_reasons: list[str] = []

    @field_validator("title", "company")
    @classmethod
    def non_empty(cls, v: str):
        if not v or not v.strip():
            raise ValueError("must be non-empty")
        return v.strip()

    def content_hash(self) -> str:
        base = f"{self.company.lower()}::{self.title.lower()}::{(self.description or '')[:250].lower()}"
        return hashlib.sha256(base.encode("utf-8")).hexdigest()

    def to_db_dict(self) -> dict:
        return {
            "hash": self.content_hash(),
            "title": self.title,
            "url": str(self.url),
            "company": self.company,
            "location": self.location or "N/A",
            "description": self.description,
            "score": self.score or 0.0,
            "score_reasons": self.score_reasons,
        }
